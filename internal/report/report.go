// Package report defines the Astrolabe report format and renders it as text,
// JSON, Markdown (for PR comments) and a self-contained HTML page.
package report

import (
	"encoding/json"
	"fmt"
	"io"
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
			fmt.Fprintf(tw, "  %s\t%s\t%s\t×%d\t%s\t%s\n", sev, f.Category, st.bold(f.Value), f.Occurrences, suggestion(f), sel)
		}
		tw.Flush()
	}
	if len(r.Pages) > 1 {
		fmt.Fprintf(w, "\nOverall fidelity %s across %d pages\n", st.score(r.Score), len(r.Pages))
	}
	return nil
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
func WriteMarkdown(w io.Writer, r *Report) error {
	fmt.Fprintf(w, "<!-- astrolabe-report -->\n### 🔭 Astrolabe · fidelity %s%%\n\n", trimFloat(r.Score))
	fmt.Fprintf(w, "%d of %d style values use a design token", r.Matched, r.Checked)
	if n := r.FindingCount(); n > 0 {
		fmt.Fprintf(w, " · **%d off-token value%s**", n, plural(n))
	}
	fmt.Fprintln(w)
	for _, p := range r.Pages {
		fmt.Fprintf(w, "\n**%s** · %s%%\n\n", escapeMD(p.URL), trimFloat(p.Score))
		if len(p.Findings) == 0 {
			fmt.Fprintln(w, "✅ Everything matches your design tokens.")
			continue
		}
		fmt.Fprintln(w, "| | Value | Used | Nearest token | Where |")
		fmt.Fprintln(w, "|---|---|---|---|---|")
		limit := len(p.Findings)
		if limit > 25 {
			limit = 25
		}
		for _, f := range p.Findings[:limit] {
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
			fmt.Fprintf(w, "| %s %s | `%s` %s | ×%d | %s | %s |\n", icon, f.Category, f.Value, strings.Join(f.Properties, ", "), f.Occurrences, near, where)
		}
		if extra := len(p.Findings) - limit; extra > 0 {
			fmt.Fprintf(w, "\n…and %d more. See the full HTML report.\n", extra)
		}
	}
	fmt.Fprintln(w, "\n<sub>🟡 near-miss: almost a token, probably a typo · 🔴 off-system: no close token</sub>")
	return nil
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
