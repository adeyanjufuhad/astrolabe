// Package drift compares extracted styles against design tokens.
package drift

import (
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/adeyanjufuhad/astrolabe/internal/colorx"
	"github.com/adeyanjufuhad/astrolabe/internal/extract"
	"github.com/adeyanjufuhad/astrolabe/internal/tokens"
)

// Severity classifies an off-token value.
type Severity string

const (
	// NearMiss is a value so close to a token it's almost certainly a mistake
	// (#3b82f7 instead of #3b82f6, 13px instead of 12px).
	NearMiss Severity = "near-miss"
	// OffSystem is a value with no close token at all.
	OffSystem Severity = "off-system"
)

// Options tunes matching.
type Options struct {
	PxTolerance        float64 // spacing/radius/size values within this many px count as a match (default 0.5)
	NearMissPx         float64 // off-token px values within this distance are near-misses (default 2)
	NearMissDeltaE     float64 // off-token colors within this OKLab ΔE are near-misses (default 2)
	ColorTolerance     float64 // colors within this ΔE count as a match (default 0 = exact 8-bit match)
	MaxSampleSelectors int     // sample selectors kept per finding (default 5)
}

func (o *Options) defaults() {
	if o.PxTolerance == 0 {
		o.PxTolerance = 0.5
	}
	if o.NearMissPx == 0 {
		o.NearMissPx = 2
	}
	if o.NearMissDeltaE == 0 {
		o.NearMissDeltaE = 2
	}
	if o.MaxSampleSelectors == 0 {
		o.MaxSampleSelectors = 5
	}
}

// Suggestion is the closest token to an off-token value.
type Suggestion struct {
	Token    string  `json:"token"`
	Value    string  `json:"value"`
	Distance float64 `json:"distance"` // ΔE for colors, px for lengths, weight units for weights
}

// Finding is one off-token value, aggregated across every element that uses it.
type Finding struct {
	Category    tokens.Category `json:"category"`
	Value       string          `json:"value"`
	Severity    Severity        `json:"severity"`
	Occurrences int             `json:"occurrences"` // elements using this value
	Properties  []string        `json:"properties"`
	Selectors   []string        `json:"selectors"`
	Nearest     *Suggestion     `json:"nearest,omitempty"`
}

// CategoryStats counts checks per category.
type CategoryStats struct {
	Checked int `json:"checked"`
	Matched int `json:"matched"`
}

// Result is the audit of one page.
type Result struct {
	URL        string                             `json:"url"`
	Title      string                             `json:"title"`
	Score      float64                            `json:"score"` // percent of audited values that use a token
	Checked    int                                `json:"checked"`
	Matched    int                                `json:"matched"`
	Elements   int                                `json:"elements"`
	Categories map[tokens.Category]*CategoryStats `json:"categories"`
	Findings   []Finding                          `json:"findings"`
}

var propCategory = map[string]tokens.Category{
	"color":            tokens.Color,
	"background-color": tokens.Color,
	"font-size":        tokens.FontSize,
	"font-family":      tokens.FontFamily,
	"font-weight":      tokens.FontWeight,
	"row-gap":          tokens.Spacing,
	"column-gap":       tokens.Spacing,
}

func categoryOf(prop string) (tokens.Category, bool) {
	if c, ok := propCategory[prop]; ok {
		return c, true
	}
	switch {
	case strings.HasPrefix(prop, "border-") && strings.HasSuffix(prop, "-color"):
		return tokens.Color, true
	case strings.HasPrefix(prop, "padding-"), strings.HasPrefix(prop, "margin-"):
		return tokens.Spacing, true
	case strings.HasSuffix(prop, "-radius"):
		return tokens.Radius, true
	}
	return "", false
}

// pillRadius: radii this large are "fully rounded" pills/circles, not scale values.
const pillRadius = 500

// Analyze audits one extracted page.
func Analyze(page *extract.Page, set *tokens.Set, opts Options) Result {
	opts.defaults()
	res := Result{
		URL:        page.URL,
		Title:      page.Title,
		Elements:   page.Total,
		Categories: map[tokens.Category]*CategoryStats{},
	}
	agg := map[string]*Finding{}
	props := map[string]map[string]bool{}

	lastEl := map[string]int{} // finding key → index of the last element counted

	for idx, el := range page.Elements {
		// Sort for deterministic output.
		keys := make([]string, 0, len(el.Styles))
		for k := range el.Styles {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, prop := range keys {
			cat, ok := categoryOf(prop)
			if !ok || !set.Has(cat) {
				continue
			}
			value, match, sug, sev, ok := check(cat, el.Styles[prop], set, opts)
			if !ok {
				continue
			}
			st := res.Categories[cat]
			if st == nil {
				st = &CategoryStats{}
				res.Categories[cat] = st
			}
			st.Checked++
			res.Checked++
			if match {
				st.Matched++
				res.Matched++
				continue
			}
			key := string(cat) + "|" + value
			f := agg[key]
			if f == nil {
				f = &Finding{Category: cat, Value: value, Severity: sev, Nearest: sug}
				agg[key] = f
				props[key] = map[string]bool{}
				lastEl[key] = -1
			}
			// Occurrences counts elements, not properties: padding 13px on all
			// four sides of one card is one occurrence.
			if lastEl[key] != idx {
				f.Occurrences++
				lastEl[key] = idx
			}
			props[key][simplifyProp(prop)] = true
			if len(f.Selectors) < opts.MaxSampleSelectors && !contains(f.Selectors, el.Selector) {
				f.Selectors = append(f.Selectors, el.Selector)
			}
		}
	}

	for key, f := range agg {
		for p := range props[key] {
			f.Properties = append(f.Properties, p)
		}
		sort.Strings(f.Properties)
		res.Findings = append(res.Findings, *f)
	}
	sort.Slice(res.Findings, func(i, j int) bool {
		a, b := res.Findings[i], res.Findings[j]
		if a.Severity != b.Severity {
			return a.Severity == NearMiss
		}
		if a.Occurrences != b.Occurrences {
			return a.Occurrences > b.Occurrences
		}
		if a.Category != b.Category {
			return a.Category < b.Category
		}
		return a.Value < b.Value
	})
	res.Score = Score(res.Matched, res.Checked)
	return res
}

// Score is the percentage of matched values, rounded to one decimal. An
// empty audit scores 100.
func Score(matched, checked int) float64 {
	if checked == 0 {
		return 100
	}
	return math.Round(float64(matched)/float64(checked)*1000) / 10
}

// simplifyProp folds side/corner variants: padding-top → padding, border-top-color → border-color.
func simplifyProp(p string) string {
	for _, side := range []string{"-top-left", "-top-right", "-bottom-right", "-bottom-left", "-top", "-right", "-bottom", "-left"} {
		if strings.Contains(p, side) {
			return strings.Replace(p, side, "", 1)
		}
	}
	return p
}

func contains(xs []string, s string) bool {
	for _, x := range xs {
		if x == s {
			return true
		}
	}
	return false
}

// check returns the normalized value, whether it matches a token, and if not
// the nearest token and severity. ok is false when the value isn't auditable.
func check(cat tokens.Category, raw string, set *tokens.Set, o Options) (value string, match bool, sug *Suggestion, sev Severity, ok bool) {
	toks := set.ByCat[cat]
	switch cat {
	case tokens.Color:
		c, parsed := colorx.Parse(raw)
		if !parsed || c.Transparent() {
			return "", false, nil, "", false
		}
		best, bestD := -1, math.Inf(1)
		for i, t := range toks {
			if c.Equal8(t.Color) {
				return c.Hex(), true, nil, "", true
			}
			if d := colorx.DeltaE(c, t.Color); d < bestD {
				best, bestD = i, d
			}
		}
		if bestD <= o.ColorTolerance {
			return c.Hex(), true, nil, "", true
		}
		sev = OffSystem
		if bestD <= o.NearMissDeltaE {
			sev = NearMiss
		}
		return c.Hex(), false, &Suggestion{Token: toks[best].Name, Value: toks[best].Value, Distance: round2(bestD)}, sev, true

	case tokens.Spacing, tokens.Radius, tokens.FontSize:
		px, parsed := tokens.ToPx(raw)
		if !parsed {
			return "", false, nil, "", false
		}
		if cat != tokens.FontSize && px == 0 {
			return "", false, nil, "", false
		}
		abs := math.Abs(px) // negative margins use the same scale
		if cat == tokens.Radius && abs >= pillRadius {
			for _, t := range toks {
				if t.Px >= pillRadius {
					return tokens.FormatPx(px), true, nil, "", true
				}
			}
			return "", false, nil, "", false // pill shapes aren't scale drift
		}
		best, bestD := -1, math.Inf(1)
		for i, t := range toks {
			d := math.Abs(abs - t.Px)
			if d <= o.PxTolerance {
				return tokens.FormatPx(px), true, nil, "", true
			}
			if d < bestD {
				best, bestD = i, d
			}
		}
		sev = OffSystem
		if bestD <= o.NearMissPx {
			sev = NearMiss
		}
		return tokens.FormatPx(px), false, &Suggestion{Token: toks[best].Name, Value: toks[best].Value, Distance: round2(bestD)}, sev, true

	case tokens.FontFamily:
		fam := tokens.NormalizeFamily(raw)
		if fam == "" {
			return "", false, nil, "", false
		}
		for _, t := range toks {
			if t.Family == fam {
				return fam, true, nil, "", true
			}
		}
		return fam, false, &Suggestion{Token: toks[0].Name, Value: toks[0].Value}, OffSystem, true

	case tokens.FontWeight:
		w, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
		if err != nil {
			return "", false, nil, "", false
		}
		best, bestD := -1, math.Inf(1)
		for i, t := range toks {
			d := math.Abs(w - t.Weight)
			if d == 0 {
				return raw, true, nil, "", true
			}
			if d < bestD {
				best, bestD = i, d
			}
		}
		sev = OffSystem
		if bestD <= 100 {
			sev = NearMiss
		}
		return strings.TrimSpace(raw), false, &Suggestion{Token: toks[best].Name, Value: toks[best].Value, Distance: bestD}, sev, true
	}
	return "", false, nil, "", false
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
