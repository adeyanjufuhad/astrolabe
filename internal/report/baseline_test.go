package report

import (
	"bytes"
	"strings"
	"testing"

	"github.com/adeyanjufuhad/astrolabe/internal/drift"
	"github.com/adeyanjufuhad/astrolabe/internal/tokens"
)

func finding(cat tokens.Category, value string, n int) drift.Finding {
	return drift.Finding{Category: cat, Value: value, Severity: drift.NearMiss, Occurrences: n, Selectors: []string{"main > p"}}
}

func page(url string, fs ...drift.Finding) drift.Result {
	return drift.Result{URL: url, Checked: 100, Matched: 100 - len(fs), Findings: fs}
}

func TestCompare(t *testing.T) {
	base := &Report{Tool: "astrolabe", Schema: SchemaVersion, GitRef: "main", GitSHA: "1a2b3c4", Score: 95, Pages: []drift.Result{
		page("https://preview-a.example.com/checkout",
			finding(tokens.Color, "#3b82f7", 1), // still there, same count
			finding(tokens.Spacing, "13px", 1),  // used on more elements now
			finding(tokens.Color, "#ea580c", 2), // fixed in the change
		),
	}}
	cur := &Report{Score: 94, Pages: []drift.Result{
		page("https://preview-b.example.com/checkout", // different host, same page
			finding(tokens.Color, "#3b82f7", 1),
			finding(tokens.Spacing, "13px", 3),
			finding(tokens.FontSize, "15px", 1), // new
		),
		page("https://preview-b.example.com/pricing", // page the baseline never scanned
			finding(tokens.Radius, "7px", 2),
		),
	}}

	cur.Compare(base, "base.json")

	b := cur.Baseline
	if b == nil {
		t.Fatal("Baseline not set")
	}
	if b.New != 2 || b.Increased != 1 || b.Existing != 1 || b.Fixed != 1 {
		t.Fatalf("counts = new %d, increased %d, existing %d, fixed %d; want 2, 1, 1, 1", b.New, b.Increased, b.Existing, b.Fixed)
	}
	if got := cur.Introduced(); got != 3 {
		t.Errorf("Introduced() = %d, want 3", got)
	}

	want := map[string]drift.Status{"#3b82f7": drift.StatusExisting, "13px": drift.StatusIncreased, "15px": drift.StatusNew, "7px": drift.StatusNew}
	for _, p := range cur.Pages {
		for _, f := range p.Findings {
			if f.Status != want[f.Value] {
				t.Errorf("%s: status %q, want %q", f.Value, f.Status, want[f.Value])
			}
		}
	}
	if f := cur.Pages[0].Findings[1]; f.BaselineOccurrences != 1 {
		t.Errorf("13px baseline occurrences = %d, want 1", f.BaselineOccurrences)
	}
	if fixed := cur.Pages[0].Fixed; len(fixed) != 1 || fixed[0].Value != "#ea580c" {
		t.Errorf("fixed = %+v, want #ea580c", fixed)
	}
	if len(cur.Pages[1].Fixed) != 0 {
		t.Errorf("a page without a baseline should have nothing fixed")
	}
}

func TestCompareNothingNew(t *testing.T) {
	base := &Report{Pages: []drift.Result{page("examples/checkout/index.html", finding(tokens.Color, "#3b82f7", 1))}}
	cur := &Report{Pages: []drift.Result{page("examples/checkout/index.html", finding(tokens.Color, "#3b82f7", 1))}}
	cur.Compare(base, "base.json")
	if cur.Introduced() != 0 {
		t.Fatalf("Introduced() = %d, want 0", cur.Introduced())
	}
	var md bytes.Buffer
	if err := WriteMarkdown(&md, cur); err != nil {
		t.Fatal(err)
	}
	for _, s := range []string{"No new drift", "1 off-token value already on the base branch", "<details>"} {
		if !strings.Contains(md.String(), s) {
			t.Errorf("markdown missing %q:\n%s", s, md.String())
		}
	}
}

func TestCompareSinglePagesWithDifferentURLs(t *testing.T) {
	base := &Report{Pages: []drift.Result{page("before.html", finding(tokens.Color, "#3b82f7", 1), finding(tokens.Color, "#ea580c", 1))}}
	cur := &Report{Pages: []drift.Result{page("after.html", finding(tokens.Color, "#3b82f7", 1))}}
	cur.Compare(base, "before.json")
	if b := cur.Baseline; b.New != 0 || b.Existing != 1 || b.Fixed != 1 {
		t.Fatalf("single pages should pair up: new %d, existing %d, fixed %d; want 0, 1, 1", b.New, b.Existing, b.Fixed)
	}
}

func TestMarkdownLeadsWithIntroduced(t *testing.T) {
	base := &Report{GitRef: "main", GitSHA: "1a2b3c4", Score: 96, Pages: []drift.Result{page("/", finding(tokens.Color, "#111111", 1))}}
	cur := &Report{Score: 95, Pages: []drift.Result{page("/", finding(tokens.Color, "#111111", 1), finding(tokens.Spacing, "13px", 1))}}
	cur.Compare(base, "base.json")
	var md bytes.Buffer
	if err := WriteMarkdown(&md, cur); err != nil {
		t.Fatal(err)
	}
	out := md.String()
	for _, s := range []string{"(−1 pts vs `main@1a2b3c4`)", "**1 new off-token value** in this change", "| new | `13px`"} {
		if !strings.Contains(out, s) {
			t.Errorf("markdown missing %q:\n%s", s, out)
		}
	}
	// The existing value belongs in the collapsed section, after the new one.
	if strings.Index(out, "13px") > strings.Index(out, "#111111") {
		t.Errorf("new findings should come before existing ones:\n%s", out)
	}
}

func TestReadJSONRoundTrip(t *testing.T) {
	rep := &Report{Tool: "astrolabe", Schema: SchemaVersion, Score: 90, Pages: []drift.Result{page("/", finding(tokens.Color, "#3b82f7", 2))}}
	var buf bytes.Buffer
	if err := WriteJSON(&buf, rep); err != nil {
		t.Fatal(err)
	}
	got, err := ReadJSON(&buf)
	if err != nil {
		t.Fatal(err)
	}
	if got.Score != 90 || len(got.Pages) != 1 || got.Pages[0].Findings[0].Occurrences != 2 {
		t.Fatalf("round trip lost data: %+v", got)
	}
	if _, err := ReadJSON(strings.NewReader(`{"tool":"other","schema":1}`)); err == nil {
		t.Error("expected an error for a non-Astrolabe report")
	}
	if _, err := ReadJSON(strings.NewReader(`{"tool":"astrolabe","schema":99}`)); err == nil {
		t.Error("expected an error for a newer schema")
	}
}

func TestPageKey(t *testing.T) {
	cases := map[string]string{
		"https://a.example.com/checkout":      "/checkout",
		"http://localhost:3000":               "/",
		"https://x.vercel.app/search?q=shoes": "/search?q=shoes",
		"examples/checkout/index.html":        "examples/checkout/index.html",
	}
	for in, want := range cases {
		if got := pageKey(in); got != want {
			t.Errorf("pageKey(%q) = %q, want %q", in, got, want)
		}
	}
}
