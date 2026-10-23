package drift

import (
	"testing"

	"github.com/adeyanjufuhad/astrolabe/internal/extract"
	"github.com/adeyanjufuhad/astrolabe/internal/tokens"
)

func mustTokens(t *testing.T) *tokens.Set {
	t.Helper()
	set, err := tokens.Parse([]byte(`{
	  "color": {"primary": "#3b82f6", "white": "#ffffff", "ink": "#111827"},
	  "space": {"2": "8px", "3": "12px", "4": "16px"},
	  "radius": {"md": "6px", "full": "9999px"},
	  "font": {"size": {"sm": "14px", "base": "16px"}},
	  "fontFamily": {"sans": "Inter"},
	  "fontWeight": {"regular": 400, "semibold": 600}
	}`))
	if err != nil {
		t.Fatal(err)
	}
	return set
}

func TestAnalyze(t *testing.T) {
	page := &extract.Page{URL: "http://x", Total: 3, Elements: []extract.Element{
		{Selector: ".pay-button", Text: true, Styles: map[string]string{
			"background-color":       "rgb(59, 130, 247)", // near-miss of primary
			"color":                  "rgb(255, 255, 255)",
			"padding-top":            "13px", // near-miss of space.3
			"padding-left":           "16px",
			"border-top-left-radius": "6px",
			"font-size":              "15px", // near-miss of 14 or 16
			"font-family":            `"Inter", sans-serif`,
			"font-weight":            "600",
		}},
		{Selector: ".promo", Text: true, Styles: map[string]string{
			"color":       "rgb(220, 38, 38)", // off-system red
			"font-family": "Georgia, serif",   // off-system
			"margin-top":  "-12px",            // negative but on-scale
		}},
		{Selector: ".avatar", Styles: map[string]string{
			"border-top-left-radius": "9999px", // pill, matches radius.full
			"background-color":       "rgb(59, 130, 247)",
		}},
	}}
	res := Analyze(page, mustTokens(t), Options{})

	if res.Checked != 13 || res.Matched != 7 {
		t.Fatalf("checked=%d matched=%d, want 13/7; findings=%+v", res.Checked, res.Matched, res.Findings)
	}
	if res.Score != 53.8 {
		t.Errorf("score = %v", res.Score)
	}
	byValue := map[string]Finding{}
	for _, f := range res.Findings {
		byValue[f.Value] = f
	}
	blue := byValue["#3b82f7"]
	if blue.Severity != NearMiss || blue.Occurrences != 2 || blue.Nearest.Token != "color.primary" || len(blue.Selectors) != 2 {
		t.Errorf("unexpected blue finding %+v", blue)
	}
	if f := byValue["13px"]; f.Severity != NearMiss || f.Nearest.Token != "space.3" || f.Properties[0] != "padding" {
		t.Errorf("unexpected 13px finding %+v", f)
	}
	if f := byValue["#dc2626"]; f.Severity != OffSystem {
		t.Errorf("red should be off-system: %+v", f)
	}
	if f := byValue["georgia"]; f.Category != tokens.FontFamily || f.Severity != OffSystem {
		t.Errorf("georgia finding %+v", f)
	}
	if res.Findings[0].Severity != NearMiss {
		t.Errorf("near-misses should sort first")
	}
}

func TestSkipsCategoriesWithoutTokens(t *testing.T) {
	set, _ := tokens.Parse([]byte(`{"color": {"a": "#000"}}`))
	page := &extract.Page{Elements: []extract.Element{{Text: true, Styles: map[string]string{
		"color": "rgb(0, 0, 0)", "padding-top": "13px", "font-size": "15px",
	}}}}
	res := Analyze(page, set, Options{})
	if res.Checked != 1 || res.Score != 100 {
		t.Fatalf("only color should be audited: %+v", res)
	}
}
