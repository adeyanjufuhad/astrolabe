package report

import (
	_ "embed"
	"fmt"
	"html/template"
	"io"
	"math"
	"strings"

	"github.com/adeyanjufuhad/astrolabe/internal/drift"
	"github.com/adeyanjufuhad/astrolabe/internal/tokens"
)

//go:embed report.html.tmpl
var htmlTemplate string

var tmpl = template.Must(template.New("report").Funcs(template.FuncMap{
	"pct":        func(v float64) string { return trimFloat(v) },
	"categories": CategoryRows,
	"isColor":    func(c tokens.Category) bool { return c == tokens.Color },
	"isLength": func(c tokens.Category) bool {
		return c == tokens.Spacing || c == tokens.Radius || c == tokens.FontSize
	},
	"join":     strings.Join,
	"css":      func(s string) template.CSS { return template.CSS(cssSafe(s)) },
	"barWidth": barWidth,
	"dist":     func(f drift.Finding) string { return distance(f) },
	"ring":     func(v float64) string { return fmt.Sprintf("%.1f", 2*math.Pi*44*(1-v/100)) },
	"grade": func(v float64) string {
		switch {
		case v >= 95:
			return "good"
		case v >= 80:
			return "ok"
		}
		return "bad"
	},
	"nearMiss": func(s drift.Severity) bool { return s == drift.NearMiss },
	"more":     func(f drift.Finding) int { return f.Occurrences - 1 },
	"countSev": func(fs []drift.Finding, s string) int {
		n := 0
		for _, f := range fs {
			if string(f.Severity) == s {
				n++
			}
		}
		return n
	},
}).Parse(htmlTemplate))

// WriteHTML writes a self-contained HTML report (no external requests).
func WriteHTML(w io.Writer, r *Report) error {
	return tmpl.Execute(w, r)
}

// cssSafe only lets plain color/length literals through to inline styles.
func cssSafe(s string) string {
	for _, r := range s {
		if !(r == '#' || r == '.' || r == '-' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')) {
			return "transparent"
		}
	}
	return s
}

// barWidth scales a pixel value into a bar width (max 160px) for the visual diff.
func barWidth(v string) string {
	px, ok := tokens.ToPx(v)
	if !ok {
		return "0px"
	}
	px = math.Abs(px) * 3
	if px > 160 {
		px = 160
	}
	return fmt.Sprintf("%.0fpx", px)
}

func distance(f drift.Finding) string {
	if f.Nearest == nil {
		return ""
	}
	switch f.Category {
	case tokens.Color:
		return fmt.Sprintf("ΔE %.1f", f.Nearest.Distance)
	case tokens.Spacing, tokens.Radius, tokens.FontSize:
		return trimFloat(f.Nearest.Distance) + "px off"
	case tokens.FontWeight:
		return trimFloat(f.Nearest.Distance) + " off"
	}
	return ""
}
