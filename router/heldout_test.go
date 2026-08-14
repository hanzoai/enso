package router

import (
	"fmt"
	"sort"
	"testing"
)

// Held-out scoring for the replay router, and the reason it exists.
//
// The package doc is exact: this is REPLAY routing, "correct by construction" on a
// fixed recurring workload. In-sample that is not a claim about model selection —
// it is the definition of the table. Scored over the same items that BUILT the
// table, every request hits ObservedExact and the score can only be the oracle:
// the share of items where some arm was correct. That is what router/index.json
// prints as `replay_pct` (gpqa 98.0 = 194/198, wall 4), and reading it beside
// `best_single` invites the one conclusion the data cannot support — that routing
// beat the best arm by 5.1pp.
//
// What a NEW question gets is rungs 2 and 3, because sha256(question) misses:
// the domain fallback, else the strongest servable model. This file measures
// exactly that, by rebuilding the fingerprint index from the training folds only.
//
// It asserts the DISTINCTION rather than a number. Numbers here move whenever the
// outcome matrix is regenerated; the property that must not move is that in-sample
// is a memo of its own keys and held-out is the fallback ladder.

// foldIndex rebuilds t.byFP from every record whose position is NOT in the held-out
// fold. Nothing else about the table changes: the domain map and the strongest
// servable model are properties of the catalog, not of the split.
func foldIndex(t *table, ids []string, fold, k int) map[string]record {
	train := make(map[string]record, len(ids))
	for i, id := range ids {
		if i%k == fold {
			continue // held out
		}
		train[t.Routes[id].Fingerprint] = t.Routes[id]
	}
	return train
}

// scoreHeldOut routes every held-out item with the index rebuilt WITHOUT it, and
// scores the chosen model against that item's observed_correct set.
//
// The denominator is EVERY item, wall included. Excluding the wall was the first
// thing I tried and it makes the number incomparable: the oracle and best_single
// in index.json are over all n, so a rate over solvable-only reads as 73.2% on
// HLE against a 52.2% "ceiling" — a router apparently beating the maximum. Same
// arithmetic, two denominators. A wall item is a loss for every selector alike,
// which is exactly why it belongs in both.
func scoreHeldOut(t *table, preset Preset, k int) (rate float64, sources map[Source]int, scored int) {
	ids := make([]string, 0, len(t.Routes))
	for id := range t.Routes {
		ids = append(ids, id)
	}
	sort.Strings(ids) // deterministic folds

	sources = map[Source]int{}
	hit := 0
	saved := t.byFP
	defer func() { t.byFP = saved }()

	r := &Router{tables: map[string]*table{t.Benchmark: t}, version: "heldout"}
	for fold := 0; fold < k; fold++ {
		t.byFP = foldIndex(t, ids, fold, k)
		for i, id := range ids {
			if i%k != fold {
				continue
			}
			rec := t.Routes[id]
			d := r.RouteByFingerprint(t.Benchmark, rec.Fingerprint, domainOf(rec), preset)
			sources[d.Source]++
			scored++
			for _, m := range rec.Correct {
				if m == d.Model {
					hit++
					break
				}
			}
		}
	}
	if scored == 0 {
		return 0, sources, 0
	}
	return float64(hit) / float64(scored) * 100, sources, scored
}

// domainOf is the domain the router would be given at request time. The route
// tables carry no per-item domain, so held-out scoring exercises the BestServable
// rung — which is the honest floor: a caller that supplies a domain gets the
// domain rung instead, and that is measured separately next door
// (enso-bench/registry/routing_generalization.json: domain 91.57 vs best single 91.5).
func domainOf(record) string { return "" }

// oracleOf is the share of items some arm answered correctly — the number
// index.json prints as the routed score.
func oracleOf(t *table) float64 {
	ok := 0
	for _, rec := range t.Routes {
		if len(rec.Correct) > 0 {
			ok++
		}
	}
	return float64(ok) / float64(len(t.Routes)) * 100
}

// TestHeldOutIsTheFallbackLadderNotTheOracle is the guard on the claim.
//
// In-sample every item hits ObservedExact by construction. Held out, the
// fingerprint cannot hit — so ObservedExact must be ZERO, and the score must be
// the fallback rung's, not the oracle's. If a future table makes these two
// converge, the split has leaked and the table is being scored on its own keys
// again.
func TestHeldOutIsTheFallbackLadderNotTheOracle(t *testing.T) {
	r, err := New()
	if err != nil {
		t.Fatal(err)
	}
	for _, bench := range r.Benchmarks() {
		tb := r.tables[bench]
		rate, sources, scored := scoreHeldOut(tb, Quality, 5)
		oracle := oracleOf(tb)

		if sources[ObservedExact] != 0 {
			t.Errorf("%s: %d held-out items still hit ObservedExact — the fold leaked, "+
				"so this is the memo answering its own keys", bench, sources[ObservedExact])
		}
		if scored == 0 {
			t.Errorf("%s: nothing scored", bench)
			continue
		}
		// The oracle is an upper bound on any selector. Held-out landing ON it would
		// mean the answer key reached the decision.
		if rate >= oracle {
			t.Errorf("%s: held-out %.1f%% >= oracle %.1f%% — a router cannot match the "+
				"ceiling without reading which arm was correct", bench, rate, oracle)
		}
		// The ladder's last rung IS the strongest arm, so held-out should land on
		// best_single. Stating it as a bound rather than an equality: a domain-aware
		// caller can do better, and nothing here should forbid that.
		if rate > oracle {
			t.Errorf("%s: impossible — %.1f%% exceeds the pool ceiling", bench, rate)
		}
		t.Logf("%-14s held-out(quality) %.1f%%  oracle %.1f%%  scored %d  sources %s",
			bench, rate, oracle, scored, fmtSources(sources))
	}
}

// TestInSampleIsTheOracleByConstruction states the other half out loud, so the
// two numbers are never mistaken for each other. This is not a defect — it is
// what a replay table IS — but it is the number index.json publishes, and it
// belongs next to a test that says why.
func TestInSampleIsTheOracleByConstruction(t *testing.T) {
	r, err := New()
	if err != nil {
		t.Fatal(err)
	}
	for _, bench := range r.Benchmarks() {
		tb := r.tables[bench]
		hit, scored := 0, 0
		for _, rec := range tb.Routes {
			if len(rec.Correct) == 0 {
				continue
			}
			d := r.RouteByFingerprint(bench, rec.Fingerprint, "", Quality)
			if d.Source != ObservedExact {
				t.Errorf("%s/%s: in-sample source = %s, want observed_exact", bench, rec.ItemID, d.Source)
			}
			scored++
			for _, m := range rec.Correct {
				if m == d.Model {
					hit++
					break
				}
			}
		}
		if scored > 0 && hit != scored {
			t.Errorf("%s: in-sample %d/%d — a replay table must be perfect on its own keys",
				bench, hit, scored)
		}
		t.Logf("%-14s in-sample %d/%d (= oracle %.1f%%, the rest is the wall)",
			bench, hit, scored, oracleOf(tb))
	}
}

func fmtSources(m map[Source]int) string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, string(k))
	}
	sort.Strings(keys)
	out := ""
	for _, k := range keys {
		out += fmt.Sprintf("%s=%d ", k, m[Source(k)])
	}
	return out
}
