package router

import "testing"

func mustNew(t *testing.T) *Router {
	t.Helper()
	r, err := New()
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return r
}

// a known non-wall fingerprint + its record from a loaded table, for exact-route tests.
func sampleHit(t *testing.T, r *Router, bench string) (string, record) {
	t.Helper()
	tb := r.tables[bench]
	if tb == nil {
		t.Fatalf("no table for %s", bench)
	}
	for fp, rec := range tb.byFP {
		if !rec.Wall {
			return fp, rec
		}
	}
	t.Fatalf("no non-wall record in %s", bench)
	return "", record{}
}

func TestExactObservedRoute(t *testing.T) {
	r := mustNew(t)
	fp, rec := sampleHit(t, r, "gpqa_diamond")

	econ := r.RouteByFingerprint("gpqa_diamond", fp, "", Economy)
	if econ.Source != ObservedExact {
		t.Fatalf("source = %s, want observed_exact", econ.Source)
	}
	if econ.Model != rec.Economy {
		t.Errorf("economy model = %q, want %q", econ.Model, rec.Economy)
	}
	qual := r.RouteByFingerprint("gpqa_diamond", fp, "", Quality)
	if qual.Model != rec.Quality {
		t.Errorf("quality model = %q, want %q", qual.Model, rec.Quality)
	}
	// the economy pick must be one we OBSERVED correct (correct-by-construction)
	found := false
	for _, m := range rec.Correct {
		if m == econ.Model {
			found = true
		}
	}
	if !found {
		t.Errorf("economy model %q not in observed_correct %v", econ.Model, rec.Correct)
	}
}

// A forged/unknown fingerprint must NOT yield observed_exact — it falls through to a
// statistical fallback. This is the anti-spoof guarantee.
func TestSpoofedFingerprintFallsThrough(t *testing.T) {
	r := mustNew(t)
	d := r.RouteByFingerprint("gpqa_diamond", "sha256:deadbeef", "", Economy)
	if d.Source == ObservedExact {
		t.Fatalf("forged fingerprint returned observed_exact (%q) — spoofable", d.Model)
	}
	if d.Source != BestServable {
		t.Errorf("source = %s, want best_servable (no domain hint)", d.Source)
	}
	if d.Model == "" {
		t.Error("fallback returned empty model")
	}
}

// Domain hint routes to the capability fallback when no exact match exists.
func TestDomainFallback(t *testing.T) {
	r := mustNew(t)
	d := r.RouteByFingerprint("gpqa_diamond", "sha256:nomatch", "Physics", Economy)
	if d.Source != Domain {
		t.Fatalf("source = %s, want domain", d.Source)
	}
	if d.Model != "gpt-5.5" {
		t.Errorf("Physics -> %q, want gpt-5.5", d.Model)
	}
}

// A matched WALL item (no servable model was correct) must not claim observed_exact;
// it falls through and surfaces Wall=true.
func TestWallFallsThrough(t *testing.T) {
	r := mustNew(t)
	tb := r.tables["gpqa_diamond"]
	var wallFP string
	for fp, rec := range tb.byFP {
		if rec.Wall {
			wallFP = fp
			break
		}
	}
	if wallFP == "" {
		t.Skip("no wall items in gpqa_diamond table")
	}
	d := r.RouteByFingerprint("gpqa_diamond", wallFP, "", Economy)
	if d.Source == ObservedExact {
		t.Error("wall item returned observed_exact")
	}
	if !d.Wall {
		t.Error("wall item did not surface Wall=true")
	}
	if d.Model == "" {
		t.Error("wall fallthrough returned empty model")
	}
}

func TestUnknownBenchmark(t *testing.T) {
	r := mustNew(t)
	d := r.RouteByFingerprint("does-not-exist", "sha256:x", "", Economy)
	if d.Source != NoTable {
		t.Errorf("source = %s, want no_table", d.Source)
	}
}

func TestAllBenchmarksLoad(t *testing.T) {
	r := mustNew(t)
	if len(r.Benchmarks()) < 4 {
		t.Errorf("loaded %d benchmarks, want >=4 (gpqa/charxiv/hle/lcb)", len(r.Benchmarks()))
	}
}

// Route (text path) computes the fingerprint and hits the same entry as RouteByFingerprint.
func TestRouteFromTextMatchesFingerprint(t *testing.T) {
	r := mustNew(t)
	// synthesize a text whose fingerprint we control by inserting it, then confirm Route
	// computes the identical key. (We can't recover source text from a hash, so this
	// checks the fingerprint function wiring rather than a live hit.)
	fp := Fingerprint("what is 2+2?")
	if fp[:7] != "sha256:" {
		t.Errorf("fingerprint prefix = %q", fp[:7])
	}
	d := r.Route("gpqa_diamond", "what is 2+2?", "", Economy)
	if d.Source != BestServable { // unknown content -> fallback, not a crash
		t.Errorf("unknown text source = %s, want best_servable", d.Source)
	}
}
