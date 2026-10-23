// Package tokens loads design tokens from JSON.
//
// Supported shapes:
//   - W3C Design Tokens (DTCG):   {"color": {"primary": {"$type": "color", "$value": "#3b82f6"}}}
//   - Tokens Studio / Style Dictionary: {"color": {"primary": {"type": "color", "value": "#3b82f6"}}}
//   - Plain nested JSON:          {"color": {"primary": "#3b82f6"}, "space": {"3": "12px"}}
//
// Aliases like "{color.blue.500}" are resolved. Each token is classified into a
// category (color, spacing, radius, font-size, font-family, font-weight) from its
// declared type and, when the type is ambiguous, from its path.
package tokens

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/adeyanjufuhad/astrolabe/internal/colorx"
)

// Category is the kind of CSS value a token governs.
type Category string

const (
	Color      Category = "color"
	Spacing    Category = "spacing"
	Radius     Category = "radius"
	FontSize   Category = "font-size"
	FontFamily Category = "font-family"
	FontWeight Category = "font-weight"
)

// Categories lists every category in display order.
var Categories = []Category{Color, Spacing, Radius, FontSize, FontFamily, FontWeight}

// Token is one resolved design token.
type Token struct {
	Name     string   `json:"name"`
	Category Category `json:"category"`
	Value    string   `json:"value"` // normalized display value: #rrggbb, 12px, inter, 700

	Color  colorx.RGBA `json:"-"`
	Px     float64     `json:"-"`
	Family string      `json:"-"`
	Weight float64     `json:"-"`
}

// Set is a collection of tokens indexed by category.
type Set struct {
	Tokens  []Token
	ByCat   map[Category][]Token
	Skipped []string // token paths that could not be classified
}

// Has reports whether the set defines any token in the category.
func (s *Set) Has(c Category) bool { return len(s.ByCat[c]) > 0 }

// Load reads and parses a token file.
func Load(path string) (*Set, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	set, err := Parse(data)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	return set, nil
}

type raw struct {
	path  []string
	typ   string
	value any
}

// Parse parses token JSON.
func Parse(data []byte) (*Set, error) {
	var root map[string]any
	if err := json.Unmarshal(data, &root); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	var raws []raw
	walk(root, nil, "", &raws)
	if len(raws) == 0 {
		return nil, fmt.Errorf("no tokens found")
	}

	byPath := make(map[string]raw, len(raws))
	for _, r := range raws {
		byPath[strings.Join(r.path, ".")] = r
	}

	set := &Set{ByCat: map[Category][]Token{}}
	for _, r := range raws {
		name := strings.Join(r.path, ".")
		v, typ, err := resolve(r, byPath, 0)
		if err != nil {
			set.Skipped = append(set.Skipped, name+" ("+err.Error()+")")
			continue
		}
		r.typ = typ
		tok, ok := classify(name, r.path, typ, v)
		if !ok {
			set.Skipped = append(set.Skipped, name)
			continue
		}
		set.Tokens = append(set.Tokens, tok)
		set.ByCat[tok.Category] = append(set.ByCat[tok.Category], tok)
	}
	sort.Strings(set.Skipped)
	if len(set.Tokens) == 0 {
		return nil, fmt.Errorf("no usable tokens (colors, spacing, radii, font sizes, families or weights) found")
	}
	return set, nil
}

func walk(node map[string]any, path []string, inheritedType string, out *[]raw) {
	typ := inheritedType
	if t, ok := stringField(node, "$type", "type"); ok {
		typ = t
	}
	if v, ok := valueField(node); ok {
		*out = append(*out, raw{path: path, typ: typ, value: v})
		return
	}
	keys := make([]string, 0, len(node))
	for k := range node {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if strings.HasPrefix(k, "$") || k == "type" || k == "description" {
			continue
		}
		child := append(append([]string{}, path...), k)
		switch v := node[k].(type) {
		case map[string]any:
			walk(v, child, typ, out)
		case string, float64, []any:
			*out = append(*out, raw{path: child, typ: typ, value: v})
		}
	}
}

func stringField(m map[string]any, keys ...string) (string, bool) {
	for _, k := range keys {
		if s, ok := m[k].(string); ok {
			return s, true
		}
	}
	return "", false
}

// valueField returns the token value if the node is a token (has $value or value).
func valueField(m map[string]any) (any, bool) {
	if v, ok := m["$value"]; ok {
		return v, true
	}
	if v, ok := m["value"]; ok {
		// Avoid treating a group literally named "value" as a token.
		if _, isGroup := v.(map[string]any); isGroup && !isDimensionObject(v) {
			return nil, false
		}
		return v, true
	}
	return nil, false
}

func isDimensionObject(v any) bool {
	m, ok := v.(map[string]any)
	if !ok {
		return false
	}
	_, hasVal := m["value"]
	_, hasUnit := m["unit"]
	return hasVal && hasUnit
}

var aliasRe = regexp.MustCompile(`^\{([^{}]+)\}$`)

func resolve(r raw, byPath map[string]raw, depth int) (any, string, error) {
	if depth > 16 {
		return nil, "", fmt.Errorf("alias loop")
	}
	s, ok := r.value.(string)
	if !ok {
		return r.value, r.typ, nil
	}
	m := aliasRe.FindStringSubmatch(strings.TrimSpace(s))
	if m == nil {
		return r.value, r.typ, nil
	}
	target, ok := byPath[m[1]]
	if !ok {
		return nil, "", fmt.Errorf("unknown alias %s", s)
	}
	v, typ, err := resolve(target, byPath, depth+1)
	if r.typ != "" {
		typ = r.typ
	}
	return v, typ, err
}

func classify(name string, path []string, typ string, v any) (Token, bool) {
	tok := Token{Name: name}
	lp := strings.ToLower(strings.Join(path, "."))
	typ = strings.ToLower(typ)

	switch typ {
	case "color":
		return asColor(tok, v)
	case "fontfamily", "fontfamilies":
		return asFamily(tok, v)
	case "fontweight", "fontweights":
		return asWeight(tok, v)
	case "spacing":
		return asPx(tok, Spacing, v)
	case "borderradius":
		return asPx(tok, Radius, v)
	case "fontsize", "fontsizes":
		return asPx(tok, FontSize, v)
	case "dimension", "sizing", "number", "":
		// Decide below from the path / value.
	default:
		return tok, false
	}

	if excluded(lp) {
		return tok, false
	}
	if typ == "" {
		if s, ok := v.(string); ok {
			if _, isColor := colorx.Parse(s); isColor {
				return asColor(tok, v)
			}
		}
		switch {
		case hasAny(lp, "font-family", "fontfamily", "font.family", "families"):
			return asFamily(tok, v)
		case hasAny(lp, "font-weight", "fontweight", "font.weight", "weights"):
			return asWeight(tok, v)
		}
	}
	switch {
	case hasAny(lp, "radius", "radii", "rounded", "corner"):
		return asPx(tok, Radius, v)
	case hasAny(lp, "font-size", "fontsize", "font.size", "text", "type", "font"):
		return asPx(tok, FontSize, v)
	case hasAny(lp, "space", "spacing", "gap", "padding", "margin", "inset", "gutter", "stack", "inline"):
		return asPx(tok, Spacing, v)
	case typ == "dimension":
		return asPx(tok, Spacing, v)
	}
	return tok, false
}

func excluded(lp string) bool {
	return hasAny(lp, "line-height", "lineheight", "letter-spacing", "letterspacing", "tracking", "leading",
		"border-width", "borderwidth", "breakpoint", "screen", "shadow", "blur", "duration", "opacity", "z-index", "zindex")
}

func hasAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

func asColor(t Token, v any) (Token, bool) {
	s, ok := v.(string)
	if !ok {
		return t, false
	}
	c, ok := colorx.Parse(s)
	if !ok {
		return t, false
	}
	t.Category, t.Color, t.Value = Color, c, c.Hex()
	return t, true
}

func asPx(t Token, cat Category, v any) (Token, bool) {
	px, ok := ToPx(v)
	if !ok {
		return t, false
	}
	t.Category, t.Px, t.Value = cat, px, FormatPx(px)
	return t, true
}

func asFamily(t Token, v any) (Token, bool) {
	var first string
	switch x := v.(type) {
	case string:
		first = x
	case []any:
		if len(x) > 0 {
			first, _ = x[0].(string)
		}
	}
	fam := NormalizeFamily(first)
	if fam == "" {
		return t, false
	}
	t.Category, t.Family, t.Value = FontFamily, fam, fam
	return t, true
}

var weightNames = map[string]float64{
	"thin": 100, "hairline": 100, "extralight": 200, "extra-light": 200, "ultralight": 200,
	"light": 300, "normal": 400, "regular": 400, "book": 400, "medium": 500,
	"semibold": 600, "semi-bold": 600, "demibold": 600, "bold": 700,
	"extrabold": 800, "extra-bold": 800, "ultrabold": 800, "black": 900, "heavy": 900,
}

func asWeight(t Token, v any) (Token, bool) {
	var w float64
	switch x := v.(type) {
	case float64:
		w = x
	case string:
		if n, ok := weightNames[strings.ToLower(strings.TrimSpace(x))]; ok {
			w = n
		} else if n, err := strconv.ParseFloat(strings.TrimSpace(x), 64); err == nil {
			w = n
		}
	}
	if w <= 0 || w > 1000 {
		return t, false
	}
	t.Category, t.Weight, t.Value = FontWeight, w, strconv.FormatFloat(w, 'f', -1, 64)
	return t, true
}

// RootFontPx is the assumed root font size used to convert rem/em token values.
const RootFontPx = 16

// ToPx converts a token or CSS length (number, "12px", "0.75rem", {"value":12,"unit":"px"}) to pixels.
func ToPx(v any) (float64, bool) {
	switch x := v.(type) {
	case float64:
		return x, true
	case map[string]any:
		n, ok := x["value"].(float64)
		if !ok {
			return 0, false
		}
		unit, _ := x["unit"].(string)
		return ToPx(strconv.FormatFloat(n, 'f', -1, 64) + unit)
	case string:
		s := strings.ToLower(strings.TrimSpace(x))
		mult := 1.0
		switch {
		case strings.HasSuffix(s, "px"):
			s = strings.TrimSuffix(s, "px")
		case strings.HasSuffix(s, "rem"):
			s, mult = strings.TrimSuffix(s, "rem"), RootFontPx
		case strings.HasSuffix(s, "em"):
			s, mult = strings.TrimSuffix(s, "em"), RootFontPx
		}
		n, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return 0, false
		}
		return n * mult, true
	}
	return 0, false
}

// FormatPx renders a pixel value compactly: 12px, 12.5px.
func FormatPx(px float64) string {
	return strconv.FormatFloat(math.Round(px*100)/100, 'f', -1, 64) + "px"
}

// NormalizeFamily returns the first family in a CSS font-family list, unquoted and lowercased.
func NormalizeFamily(s string) string {
	first := strings.Split(s, ",")[0]
	first = strings.Trim(strings.TrimSpace(first), `"'`)
	return strings.ToLower(strings.TrimSpace(first))
}
