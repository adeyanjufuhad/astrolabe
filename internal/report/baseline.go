package report

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"

	"github.com/adeyanjufuhad/astrolabe/internal/drift"
)

// Baseline summarizes how a report compares with an earlier one, usually the
// scan of the pull request's base branch. It is nil when no baseline was given.
type Baseline struct {
	Source    string  `json:"source"` // where the baseline report was read from
	GitSHA    string  `json:"gitSha,omitempty"`
	GitRef    string  `json:"gitRef,omitempty"`
	Score     float64 `json:"score"`
	New       int     `json:"new"`       // off-token values the baseline didn't have
	Increased int     `json:"increased"` // values now used on more elements
	Existing  int     `json:"existing"`  // values the baseline already had
	Fixed     int     `json:"fixed"`     // baseline values that are gone
}

// ReadJSON loads a report written by WriteJSON.
func ReadJSON(r io.Reader) (*Report, error) {
	var rep Report
	if err := json.NewDecoder(r).Decode(&rep); err != nil {
		return nil, fmt.Errorf("reading baseline report: %w", err)
	}
	if rep.Tool != "astrolabe" {
		return nil, fmt.Errorf("baseline is not an Astrolabe JSON report")
	}
	if rep.Schema < 1 || rep.Schema > SchemaVersion {
		return nil, fmt.Errorf("baseline report has schema %d; this version reads up to %d", rep.Schema, SchemaVersion)
	}
	return &rep, nil
}

// Compare marks every finding as new, increased or existing relative to base,
// and records the base findings that are gone as fixed. Pages are matched by
// URL path, so a scan of preview-a.example.com/checkout compares with
// preview-b.example.com/checkout. When both reports have exactly one page, those
// pages are compared whatever their URLs (before.html vs after.html). Otherwise a
// page the baseline didn't scan counts as all new.
func (r *Report) Compare(base *Report, source string) {
	b := &Baseline{Source: source, GitSHA: base.GitSHA, GitRef: base.GitRef, Score: base.Score}
	basePages := map[string]drift.Result{}
	for _, p := range base.Pages {
		basePages[pageKey(p.URL)] = p
	}
	single := len(base.Pages) == 1 && len(r.Pages) == 1
	for i := range r.Pages {
		page := &r.Pages[i]
		page.Fixed = nil
		old, ok := basePages[pageKey(page.URL)]
		if single {
			old, ok = base.Pages[0], true
		}
		before := map[string]drift.Finding{}
		if ok {
			for _, f := range old.Findings {
				before[findingKey(f)] = f
			}
		}
		seen := map[string]bool{}
		for j := range page.Findings {
			f := &page.Findings[j]
			k := findingKey(*f)
			seen[k] = true
			prev, had := before[k]
			switch {
			case !had:
				f.Status, f.BaselineOccurrences = drift.StatusNew, 0
				b.New++
			case f.Occurrences > prev.Occurrences:
				f.Status, f.BaselineOccurrences = drift.StatusIncreased, prev.Occurrences
				b.Increased++
			default:
				f.Status, f.BaselineOccurrences = drift.StatusExisting, prev.Occurrences
				b.Existing++
			}
		}
		if ok {
			for _, f := range old.Findings {
				if !seen[findingKey(f)] {
					f.Status, f.BaselineOccurrences = "", 0
					page.Fixed = append(page.Fixed, f)
					b.Fixed++
				}
			}
		}
	}
	r.Baseline = b
}

// Introduced is the number of off-token values this report adds over its
// baseline (new plus increased). It is 0 when there is no baseline.
func (r *Report) Introduced() int {
	if r.Baseline == nil {
		return 0
	}
	return r.Baseline.New + r.Baseline.Increased
}

// pageKey identifies a page across hosts: the path and query of http(s) URLs,
// and anything else (file paths) as written.
func pageKey(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return raw
	}
	key := u.EscapedPath()
	if key == "" {
		key = "/"
	}
	if u.RawQuery != "" {
		key += "?" + u.RawQuery
	}
	return key
}

func findingKey(f drift.Finding) string {
	return string(f.Category) + "\x00" + f.Value
}
