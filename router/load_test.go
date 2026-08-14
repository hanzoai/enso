package router

import (
	"io/fs"
	"strings"
	"testing"
	"testing/fstest"
)

// Every refusal in load() is unreachable through New(): the embedded tables are
// valid, so a read cannot fail and a parse cannot fail. That is the whole reason
// load() takes its source as an argument — the refusals are the part of loading
// most likely to be wrong when it finally matters (a bad table shipped, a file
// unreadable), and untested error paths are where a nil Router escapes and the
// panic lands somewhere else entirely.
//
// These substitute a source rather than a table: a malformed document, a
// directory with nothing to load, and two filesystems that fail at the two IO
// calls. What each asserts is the same thing — an error, and NO Router.

// ent is the smallest fs.DirEntry that can name a file.
type ent struct{ n string }

func (e ent) Name() string             { return e.n }
func (ent) IsDir() bool                { return false }
func (ent) Type() fs.FileMode          { return 0 }
func (ent) Info() (fs.FileInfo, error) { return nil, fs.ErrNotExist }

// dirErrFS fails the directory listing: it implements neither ReadDirFS nor a
// usable Open, so fs.ReadDir falls back to Open(".") and gets the refusal.
type dirErrFS struct{}

func (dirErrFS) Open(string) (fs.File, error) { return nil, fs.ErrPermission }

// fileErrFS lists a table and then refuses to hand it over — the case where a
// name is visible but the bytes are not.
type fileErrFS struct{}

func (fileErrFS) Open(string) (fs.File, error) { return nil, fs.ErrPermission }
func (fileErrFS) ReadDir(string) ([]fs.DirEntry, error) {
	return []fs.DirEntry{ent{"gpqa_diamond.routes.json"}}, nil
}

func TestLoadRefusals(t *testing.T) {
	for _, c := range []struct {
		name string
		fsys fs.FS
		want string
	}{
		{
			name: "unreadable directory",
			fsys: dirErrFS{},
			want: "read embedded tables",
		},
		{
			name: "listed table cannot be read",
			fsys: fileErrFS{},
			want: "read gpqa_diamond.routes.json",
		},
		{
			name: "malformed table",
			fsys: fstest.MapFS{"gpqa_diamond.routes.json": &fstest.MapFile{Data: []byte("{not json")}},
			want: "parse gpqa_diamond.routes.json",
		},
		{
			// A directory that exists and holds nothing this package can route
			// with. Silence here would produce a Router that answers NoTable for
			// every benchmark — indistinguishable from a router whose tables all
			// missed, which is the wrong diagnosis at the wrong time.
			name: "no tables at all",
			fsys: fstest.MapFS{"README.md": &fstest.MapFile{Data: []byte("not a table")}},
			want: "no route tables embedded",
		},
	} {
		t.Run(c.name, func(t *testing.T) {
			r, err := load(c.fsys)
			if err == nil {
				t.Fatalf("load succeeded on %s — a bad source must refuse, not return a Router", c.name)
			}
			if r != nil {
				t.Errorf("load returned a non-nil Router alongside an error: callers check err and would use it")
			}
			if !strings.Contains(err.Error(), c.want) {
				t.Errorf("error %q does not name the failure (%q) — a refusal that does not say what it read is a bug report with the address removed", err, c.want)
			}
		})
	}
}

// TestLoadIndexesASuppliedTable is the positive half: the same seam that proves
// the refusals must still build a working Router from a source that is not the
// embed, or the refusals above are testing a path New() does not take.
func TestLoadIndexesASuppliedTable(t *testing.T) {
	const doc = `{
	  "benchmark": "probe",
	  "n": 1,
	  "strongest_servable": "arm-a",
	  "domain_fallback": {"Physics": "arm-b"},
	  "routes": {
	    "probe-000": {
	      "item_id": "probe-000",
	      "question_fingerprint": "sha256:feed",
	      "wall": false,
	      "primary_economy": "arm-c",
	      "primary_quality": "arm-a",
	      "fallbacks": ["arm-b"],
	      "observed_correct": ["arm-a", "arm-c"],
	      "policy": "lowest_cost_observed_correct"
	    }
	  }
	}`
	r, err := load(fstest.MapFS{"probe.routes.json": &fstest.MapFile{Data: []byte(doc)}})
	if err != nil {
		t.Fatal(err)
	}
	if got := r.Benchmarks(); len(got) != 1 || got[0] != "probe" {
		t.Fatalf("Benchmarks() = %v, want [probe] — tables are keyed by the document's own benchmark field", got)
	}
	// The fingerprint index is built during load, not on first use; a hit here is
	// what proves the indexing loop ran over a supplied source.
	d := r.RouteByFingerprint("probe", "sha256:feed", "", Economy)
	if d.Source != ObservedExact {
		t.Errorf("source = %s, want observed_exact — the fingerprint index did not build", d.Source)
	}
	if d.Model != "arm-c" {
		t.Errorf("economy model = %q, want arm-c", d.Model)
	}
}
