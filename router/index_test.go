package router

import (
	"encoding/json"
	"math"
	"os"
	"testing"
)

// index.json is hand-maintained prose-and-numbers beside the tables it describes,
// and nothing recomputed it. Both numbers it publishes per benchmark are derivable
// from the embedded table, so a typed value that disagrees with the data is a bug
// the data itself can catch.
//
// It had two. `livecodebench.best_single_pct` read 92.0, which is that benchmark's
// ORACLE, not its strongest arm (91.4) — the strongest arm solves 160 of 175 and
// the pool solves 161, so publishing both as 92.0 erased the single item that is
// the whole difference between a selector and a ceiling. Worse, it inverted the
// reading: held_out 91.4 against best_single 92.0 made livecodebench look like the
// one benchmark where routing LOSES to just picking the best arm. `hle` had the
// milder form, 38.3 against a measured 38.2 — not reachable on a 500-item
// denominator at all.
//
// The identity this restores is the actual result: held-out routing lands exactly
// on the best single arm, on all four benchmarks. That is a claim worth asserting
// rather than retyping.

// bestSingleOf is the share of items the strongest servable arm answered correctly,
// over EVERY item — the same all-n denominator oracleOf and index.json use. A rate
// over solvable-only items is a different number that cannot be compared with the
// ceiling printed beside it (see scoreHeldOut for what that mistake looks like).
func bestSingleOf(t *table) float64 {
	hit := 0
	for _, rec := range t.Routes {
		for _, m := range rec.Correct {
			if m == t.Strongest {
				hit++
				break
			}
		}
	}
	return float64(hit) / float64(len(t.Routes)) * 100
}

func TestIndexMatchesTheTables(t *testing.T) {
	raw, err := os.ReadFile("index.json")
	if err != nil {
		t.Fatal(err)
	}
	// Decoded per key rather than into one typed map: index.json also carries
	// `_README`, whose values are prose, and a whole-object decode fails on it.
	var idx map[string]json.RawMessage
	if err := json.Unmarshal(raw, &idx); err != nil {
		t.Fatal(err)
	}
	type entry struct {
		N             int     `json:"n"`
		Oracle        float64 `json:"oracle_pct"`
		HeldOut       float64 `json:"held_out_pct"`
		BestSingle    string  `json:"best_single"`
		BestSinglePct float64 `json:"best_single_pct"`
		Wall          int     `json:"wall"`
	}

	r, err := New()
	if err != nil {
		t.Fatal(err)
	}
	// Published to one decimal, so compare there; a bare == on floats would fail on
	// representation rather than on disagreement.
	round1 := func(f float64) float64 { return math.Round(f*10) / 10 }

	for _, bench := range r.Benchmarks() {
		raw, ok := idx[bench]
		if !ok {
			t.Errorf("%s: embedded table has no index.json entry — a published table nobody describes", bench)
			continue
		}
		var e entry
		if err := json.Unmarshal(raw, &e); err != nil {
			t.Errorf("%s: %v", bench, err)
			continue
		}
		tb := r.tables[bench]

		if e.N != len(tb.Routes) {
			t.Errorf("%s: index n=%d, table has %d records", bench, e.N, len(tb.Routes))
		}
		if e.BestSingle != tb.Strongest {
			t.Errorf("%s: index best_single=%q, table strongest_servable=%q", bench, e.BestSingle, tb.Strongest)
		}
		if got := round1(bestSingleOf(tb)); e.BestSinglePct != got {
			t.Errorf("%s: index best_single_pct=%.1f, table measures %.1f for %s",
				bench, e.BestSinglePct, got, tb.Strongest)
		}
		if got := round1(oracleOf(tb)); e.Oracle != got {
			t.Errorf("%s: index oracle_pct=%.1f, table measures %.1f", bench, e.Oracle, got)
		}
		// The wall is the oracle's complement — items no arm in the pool solved.
		wall := 0
		for _, rec := range tb.Routes {
			if len(rec.Correct) == 0 {
				wall++
			}
		}
		if e.Wall != wall {
			t.Errorf("%s: index wall=%d, table has %d items no arm solved", bench, e.Wall, wall)
		}
		// The ladder's last rung IS the strongest arm, so a held-out question gets
		// exactly what that arm gets. Stated as the equality it is: if a future table
		// breaks it, the fallback ladder changed and both numbers need re-deriving.
		if e.HeldOut != e.BestSinglePct {
			t.Errorf("%s: held_out_pct=%.1f != best_single_pct=%.1f — the last rung is the "+
				"strongest arm, so these are the same number", bench, e.HeldOut, e.BestSinglePct)
		}
	}
}
