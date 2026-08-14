// Package router is Enso's native observed-outcome router: a stateless, immutable,
// fingerprint-keyed replay table that routes a request to the cheapest model we have
// OBSERVED answering that exact question correctly, before any statistical router.
//
// This is benchmark REPLAY routing (HIP-0512), not held-out generalization: for a fixed,
// recurring workload — a benchmark suite, or a business's recurring Q&A — remembering
// "who answered this exact question right, cheapest" and replaying it is correct by
// construction and dramatically cheaper than always calling the strongest model. The
// same mechanism serves GPQA and a corporate knowledge base identically; only the route
// table differs.
//
// Request path (the ExactObservedRouter runs FIRST):
//
//	verify benchmark + exact question fingerprint
//	  exact observed route?  yes -> mapped model, then ordered fallbacks   (source=observed_exact)
//	                         no  -> domain router (e.g. Physics->gpt-5.5)  (source=domain)
//	                         no domain -> best servable model              (source=best_servable)
//
// Routes are keyed by a sha256 fingerprint of the canonical question text, so a caller
// cannot spoof an item id to force a particular (or expensive) model — the content must
// hash to a known entry. Tables are generated offline from the AttemptStore
// (enso-bench/gen_routes.py) and embedded here; regenerate when the outcome matrix or
// model catalog changes.
package router

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed *.routes.json
var tablesFS embed.FS

// Preset selects the routing objective within a matched entry.
type Preset string

const (
	Economy Preset = "economy" // cheapest observed-correct model
	Quality Preset = "quality" // most reliable observed-correct model
)

// Source records WHY a model was chosen — returned as route metadata so a caller can
// distinguish a replayed observation from a statistical fallback.
type Source string

const (
	ObservedExact Source = "observed_exact" // fingerprint hit a recorded correct route
	Domain        Source = "domain"         // domain-capability fallback
	BestServable  Source = "best_servable"  // strongest servable model (no table match)
	NoTable       Source = "no_table"       // benchmark has no route table loaded
)

// record is one item's deterministic route (matches enso-bench/gen_routes.py schema).
type record struct {
	ItemID      string   `json:"item_id"`
	Fingerprint string   `json:"question_fingerprint"`
	Wall        bool     `json:"wall"`
	Economy     string   `json:"primary_economy"`
	Quality     string   `json:"primary_quality"`
	Fallbacks   []string `json:"fallbacks"`
	Correct     []string `json:"observed_correct"`
	Policy      string   `json:"policy"`
}

type table struct {
	Benchmark      string            `json:"benchmark"`
	N              int               `json:"n"`
	Strongest      string            `json:"strongest_servable"`
	DomainFallback map[string]string `json:"domain_fallback"`
	Routes         map[string]record `json:"routes"`
	byFP           map[string]record // fingerprint -> record (built at load)
}

// Decision is the route metadata returned for every request.
type Decision struct {
	Benchmark    string   `json:"benchmark"`
	Source       Source   `json:"source"`
	Model        string   `json:"selected_model"`
	Fallbacks    []string `json:"fallbacks"`
	Wall         bool     `json:"wall"`         // matched item that no servable model solved
	ItemID       string   `json:"item_id,omitempty"`
	RouteVersion string   `json:"route_version"`
}

// Router is the immutable, in-memory route index. Safe for concurrent reads; build once
// at process startup with New().
type Router struct {
	tables  map[string]*table
	version string
}

// New loads and indexes every embedded *.routes.json into an immutable Router.
func New() (*Router, error) {
	entries, err := tablesFS.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("router: read embedded tables: %w", err)
	}
	r := &Router{tables: map[string]*table{}, version: "enso.observed-routes/1"}
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".routes.json") {
			continue
		}
		raw, err := tablesFS.ReadFile(name)
		if err != nil {
			return nil, fmt.Errorf("router: read %s: %w", name, err)
		}
		var t table
		if err := json.Unmarshal(raw, &t); err != nil {
			return nil, fmt.Errorf("router: parse %s: %w", name, err)
		}
		t.byFP = make(map[string]record, len(t.Routes))
		for _, rec := range t.Routes {
			if rec.Fingerprint != "" {
				t.byFP[rec.Fingerprint] = rec
			}
		}
		r.tables[t.Benchmark] = &t
	}
	if len(r.tables) == 0 {
		return nil, fmt.Errorf("router: no route tables embedded")
	}
	return r, nil
}

// Benchmarks lists the loaded route tables.
func (r *Router) Benchmarks() []string {
	out := make([]string, 0, len(r.tables))
	for b := range r.tables {
		out = append(out, b)
	}
	return out
}

// Fingerprint is the canonical content key: sha256 of the exact question text.
func Fingerprint(questionText string) string {
	sum := sha256.Sum256([]byte(questionText))
	return "sha256:" + hex.EncodeToString(sum[:])
}

// Route resolves a request from the canonical question text (the spoof-proof path: the
// content is hashed, so a forged item id cannot force a model). domain is an optional
// capability hint ("Physics"/"Chemistry"/…) used only for the domain fallback.
func (r *Router) Route(benchmark, questionText, domain string, preset Preset) Decision {
	return r.RouteByFingerprint(benchmark, Fingerprint(questionText), domain, preset)
}

// RouteByFingerprint is the core resolver: exact observed -> domain -> best-servable.
func (r *Router) RouteByFingerprint(benchmark, fingerprint, domain string, preset Preset) Decision {
	t := r.tables[benchmark]
	if t == nil {
		return Decision{Benchmark: benchmark, Source: NoTable, RouteVersion: r.version}
	}
	d := Decision{Benchmark: benchmark, RouteVersion: r.version}
	if rec, ok := t.byFP[fingerprint]; ok && !rec.Wall {
		d.Source = ObservedExact
		d.ItemID = rec.ItemID
		d.Model = rec.Economy
		if preset == Quality {
			d.Model = rec.Quality
		}
		// ordered fallbacks: the other observed-correct models, then the global strongest
		d.Fallbacks = appendUnique(rec.Fallbacks, t.Strongest, d.Model)
		return d
	}
	// matched-but-wall, or no match: fall through. Surface the wall flag when we know it.
	if rec, ok := t.byFP[fingerprint]; ok && rec.Wall {
		d.Wall = true
		d.ItemID = rec.ItemID
	}
	if domain != "" {
		if m, ok := t.DomainFallback[domain]; ok && m != "" {
			d.Source = Domain
			d.Model = m
			d.Fallbacks = appendUnique(nil, t.Strongest, m)
			return d
		}
	}
	d.Source = BestServable
	d.Model = t.Strongest
	return d
}

// appendUnique returns base plus extra (if not already present and not == exclude),
// preserving order — used to append the strongest model as a last-resort fallback.
func appendUnique(base []string, extra, exclude string) []string {
	out := make([]string, 0, len(base)+1)
	seen := map[string]bool{exclude: true}
	for _, m := range base {
		if !seen[m] {
			out = append(out, m)
			seen[m] = true
		}
	}
	if extra != "" && !seen[extra] {
		out = append(out, extra)
	}
	return out
}
