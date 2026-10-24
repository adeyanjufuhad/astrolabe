// Package report defines the Astrolabe report format and renders it as text,
// JSON, Markdown (for PR comments) and a self-contained HTML page.
package report

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/adeyanjufuhad/astrolabe/internal/drift"
	"github.com/adeyanjufuhad/astrolabe/internal/tokens"
)

// SchemaVersion changes whenever the JSON shape changes incompatibly.
const SchemaVersion = 1

// Report is the full output of one `astrolabe check` run.
type Report struct {
	Schema      int            `json:"schema"`
	Tool        string         `json:"tool"`
	Version     string         `json:"version"`
	GeneratedAt time.Time      `json:"generatedAt"`
	TokensFile  string         `json:"tokensFile"`
	TokenCounts map[string]int `json:"tokenCounts"`
	GitSHA      string         `json:"gitSha,omitempty"`
	GitRef      string         `json:"gitRef,omitempty"`
	Score       float64        `json:"score"`
	Checked     int            `json:"checked"`
	Matched     int            `json:"matched"`
	Pages       []drift.Result `json:"pages"`
	Baseline    *Baseline      `json:"baseline,omitempty"` // set by Compare
}

// New assembles a report from page results.
func New(version, tokensFile string, set *tokens.Set, pages []drift.Result) *Report {
	r := &Report{
		Schema:      SchemaVersion,
		Tool:        "astrolabe",
		Version:     version,
		GeneratedAt: time.Now().UTC().Truncate(time.Second),
		TokensFile:  tokensFile,
		TokenCounts: map[string]int{},
		Pages:       pages,
	}
	for cat, ts := range set.ByCat {
		r.TokenCounts[string(cat)] = len(ts)
	}
	for _, p := range pages {
		r.Checked += p.Checked
		r.Matched += p.Matched
	}
	r.Score = drift.Score(r.Matched, r.Checked)
	return r
}

// FindingCount is the number of distinct off-token values across all pages.
func (r *Report) FindingCount() int {
	n := 0
	for _, p := range r.Pages {
		n += len(p.Findings)
	}
	return n
}

// WriteJSON writes the report as indented JSON.
func WriteJSON(w io.Writer, r *Report) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(r)
}

// WriteText writes a terminal-friendly summary.
func WriteText(w io.Writer, r *Report, color bool) error {
	st := styler(color)
	for i, p := range r.Pages {
		if i > 0 {
			fmt.Fprintln(w)
		}
		fmt.Fprintf(w, "%s  %s\n", st.bold("Astrolabe"), p.URL)
		fmt.Fprintf(w, "Fidelity %s  ·  %d of %d values on-token  ·  %d off-token values\n",
			st.score(p.Score), p.Matched, p.Checked, len(p.Findings))
		if len(p.Findings) == 0 {
			fmt.Fprintln(w, st.green("✓ Everything matches your design tokens."))
			continue
		}
		fmt.Fprintln(w)
		tw := tabwriter.NewWriter(w, 0, 2, 2, ' ', 0)
		for _, f := range p.Findings {
			sev := st.yellow("near-miss ")
			if f.Severity == drift.OffSystem {
				sev = st.red("off-system")
			}
			sel := ""
			if len(f.Selectors) > 0 {
				sel = lastPart(f.Selectors[0])
				if more := f.Occurrences - 1; more > 0 {
					sel += st.dim(fmt.Sprintf(" +%d", more))
				}
			}
			status := ""
			if r.Baseline != nil {
				status = statusLabel(f, st) + "\t"
			}
			fmt.Fprintf(tw, "  %s%s\t%s\t%s\t×%d\t%s\t%s\n", status, sev, f.Category, st.bold(f.Value), f.Occurrences, suggestion(f), sel)
		}
		for _, f := range p.Fixed {
			fmt.Fprintf(tw, "  %s\t%s\t%s\t%s\t\t\t\n", st.green("fixed"), st.dim("was "+string(f.Severity)), f.Category, st.dim(f.Value))
		}
		tw.Flush()
	}
	if len(r.Pages) > 1 {
		fmt.Fprintf(w, "\nOverall fidelity %s across %d pages\n", st.score(r.Score), len(r.Pages))
	}
	if b := r.Baseline; b != nil {
		fmt.Fprintf(w, "\nCompared with %s: %d new · %d increased · %d fixed · %d unchanged (fidelity %s%% → %s%%)\n",
			baselineName(b), b.New, b.Increased, b.Fixed, b.Existing, trimFloat(b.Score), trimFloat(r.Score))
	}
	return nil
}

// statusLabel is the terminal column for a finding compared with a baseline.
func statusLabel(f drift.Finding, st ansi) string {
	switch f.Status {
	case drift.StatusNew:
		return st.bold("new")
	case drift.StatusIncreased:
		return st.bold(fmt.Sprintf("×%d→%d", f.BaselineOccurrences, f.Occurrences))
	}
	return st.dim("·")
}

// baselineName describes the baseline for people: "main@1a2b3c4", or the file it came from.
func baselineName(b *Baseline) string {
	switch {
	case b.GitRef != "" && b.GitSHA != "":
		return b.GitRef + "@" + b.GitSHA
	case b.GitRef != "":
		return b.GitRef
	case b.GitSHA != "":
		return b.GitSHA
	}
	return b.Source
}

// lastPart shortens "main > aside.card > button.pay" to "button.pay" for terminals.
func lastPart(sel string) string {
	if i := strings.LastIndex(sel, " > "); i >= 0 {
		return sel[i+3:]
	}
	return sel
}

func suggestion(f drift.Finding) string {
	if f.Nearest == nil {
		return ""
	}
	s := fmt.Sprintf("→ %s (%s)", f.Nearest.Token, f.Nearest.Value)
	switch f.Category {
	case tokens.Color:
		s += fmt.Sprintf(" ΔE %.1f", f.Nearest.Distance)
	case tokens.Spacing, tokens.Radius, tokens.FontSize:
		s += fmt.Sprintf(" %spx off", trimFloat(f.Nearest.Distance))
	}
	return s
}

func trimFloat(v float64) string {
	s := fmt.Sprintf("%.2f", v)
	s = strings.TrimRight(strings.TrimRight(s, "0"), ".")
	return s
}

// WriteMarkdown writes a compact summary for PR comments and job summaries.
// With a baseline, it leads with the drift this change introduces and folds the
// drift that was already there into a collapsed section.
func WriteMarkdown(w io.Writer, r *Report) error {
	b := r.Baseline
	fmt.Fprintf(w, "<!-- astrolabe-report -->\n### 🔭 Astrolabe · fidelity %s%%", trimFloat(r.Score))
	if b != nil {
		fmt.Fprintf(w, " (%s vs `%s`)", signedPts(r.Score-b.Score), escapeMD(baselineName(b)))
	}
	fmt.Fprint(w, "\n\n")
	if b != nil {
		if n := r.Introduced(); n == 0 {
			fmt.Fprint(w, "✅ **No new drift.**")
		} else {
			fmt.Fprintf(w, "**%d new off-token value%s** in this change", n, plural(n))
		}
		if b.Fixed > 0 {
			fmt.Fprintf(w, " · %d fixed", b.Fixed)
		}
		if b.Existing > 0 {
			fmt.Fprintf(w, " · %d already there", b.Existing)
		}
		fmt.Fprint(w, "\n\n")
	}
	fmt.Fprintf(w, "%d of %d style values use a design token", r.Matched, r.Checked)
	if n := r.FindingCount(); n > 0 && b == nil {
		fmt.Fprintf(w, " · **%d off-token value%s**", n, plural(n))
	}
	fmt.Fprintln(w)
	for _, p := range r.Pages {
		fmt.Fprintf(w, "\n**%s** · %s%%\n\n", escapeMD(p.URL), trimFloat(p.Score))
		if b == nil {
			if len(p.Findings) == 0 {
				fmt.Fprintln(w, "✅ Everything matches your design tokens.")
				continue
			}
			writeFindingTable(w, p.Findings, false)
			continue
		}
		var introduced, existing []drift.Finding
		for _, f := range p.Findings {
			if f.Status == drift.StatusExisting {
				existing = append(existing, f)
			} else {
				introduced = append(introduced, f)
			}
		}
		if len(introduced) == 0 {
			fmt.Fprintln(w, "✅ No new drift on this page.")
		} else {
			writeFindingTable(w, introduced, true)
		}
		if len(p.Fixed) > 0 {
			var vals []string
			for _, f := range p.Fixed {
				vals = append(vals, fmt.Sprintf("`%s` %s", escapeMD(f.Value), f.Category))
			}
			fmt.Fprintf(w, "\n✅ Fixed: %s\n", strings.Join(vals, ", "))
		}
		if len(existing) > 0 {
			fmt.Fprintf(w, "\n<details><summary>%d off-token value%s already on the base branch</summary>\n\n", len(existing), plural(len(existing)))
			writeFindingTable(w, existing, false)
			fmt.Fprintln(w, "\n</details>")
		}
	}
	fmt.Fprintln(w, "\n<sub>🟡 near-miss: almost a token, probably a typo · 🔴 off-system: no close token</sub>")
	return nil
}

// writeFindingTable writes up to 25 findings as a Markdown table, with a
// "Change" column for findings compared with a baseline.
func writeFindingTable(w io.Writer, findings []drift.Finding, withChange bool) {
	if withChange {
		fmt.Fprintln(w, "| | Change | Value | Used | Nearest token | Where |")
		fmt.Fprintln(w, "|---|---|---|---|---|---|")
	} else {
		fmt.Fprintln(w, "| | Value | Used | Nearest token | Where |")
		fmt.Fprintln(w, "|---|---|---|---|---|")
	}
	limit := len(findings)
	if limit > 25 {
		limit = 25
	}
	for _, f := range findings[:limit] {
		icon := "🟡"
		if f.Severity == drift.OffSystem {
			icon = "🔴"
		}
		near := "—"
		if f.Nearest != nil {
			near = fmt.Sprintf("`%s` (%s)", f.Nearest.Token, f.Nearest.Value)
		}
		where := ""
		if len(f.Selectors) > 0 {
			where = "`" + escapeMD(f.Selectors[0]) + "`"
		}
		change := ""
		if withChange {
			change = "new | "
			if f.Status == drift.StatusIncreased {
				change = fmt.Sprintf("×%d → ×%d | ", f.BaselineOccurrences, f.Occurrences)
			}
		}
		fmt.Fprintf(w, "| %s %s | %s`%s` %s | ×%d | %s | %s |\n", icon, f.Category, change, f.Value, strings.Join(f.Properties, ", "), f.Occurrences, near, where)
	}
	if extra := len(findings) - limit; extra > 0 {
		fmt.Fprintf(w, "\n…and %d more. See the full HTML report.\n", extra)
	}
}

// signedPts formats a fidelity change in percentage points: "+1.2 pts", "−0.5 pts", "±0 pts".
func signedPts(d float64) string {
	d = math.Round(d*10) / 10
	switch {
	case d > 0:
		return "+" + trimFloat(d) + " pts"
	case d < 0:
		return "−" + trimFloat(-d) + " pts"
	}
	return "±0 pts"
}

func plural(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}

func escapeMD(s string) string {
	return strings.NewReplacer("|", `\|`, "`", "'").Replace(s)
}

// CategoryRows returns per-category stats in display order (used by HTML).
func CategoryRows(p drift.Result) []CategoryRow {
	var rows []CategoryRow
	for _, c := range tokens.Categories {
		if st, ok := p.Categories[c]; ok {
			rows = append(rows, CategoryRow{Name: string(c), Checked: st.Checked, Matched: st.Matched, Score: drift.Score(st.Matched, st.Checked)})
		}
	}
	return rows
}

// CategoryRow is one row of the per-category breakdown.
type CategoryRow struct {
	Name             string
	Checked, Matched int
	Score            float64
}

type ansi struct{ on bool }

func styler(on bool) ansi { return ansi{on} }
func (a ansi) wrap(code, s string) string {
	if !a.on {
		return s
	}
	return "\x1b[" + code + "m" + s + "\x1b[0m"
}
func (a ansi) bold(s string) string   { return a.wrap("1", s) }
func (a ansi) dim(s string) string    { return a.wrap("2", s) }
func (a ansi) red(s string) string    { return a.wrap("31", s) }
func (a ansi) green(s string) string  { return a.wrap("32", s) }
func (a ansi) yellow(s string) string { return a.wrap("33", s) }
func (a ansi) score(v float64) string {
	s := trimFloat(v) + "%"
	switch {
	case v >= 95:
		return a.wrap("1;32", s)
	case v >= 80:
		return a.wrap("1;33", s)
	}
	return a.wrap("1;31", s)
}
