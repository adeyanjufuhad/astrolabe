// Package colorx parses CSS colors and measures perceptual distance in OKLab.
package colorx

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// RGBA is a color in sRGB with channels in [0,1].
type RGBA struct {
	R, G, B, A float64
}

// Hex returns #rrggbb, or #rrggbbaa when the color is not fully opaque.
func (c RGBA) Hex() string {
	r, g, b, a := c.bytes()
	if a == 255 {
		return fmt.Sprintf("#%02x%02x%02x", r, g, b)
	}
	return fmt.Sprintf("#%02x%02x%02x%02x", r, g, b, a)
}

// Equal8 reports whether two colors are identical once quantized to 8 bits per channel.
func (c RGBA) Equal8(o RGBA) bool {
	r1, g1, b1, a1 := c.bytes()
	r2, g2, b2, a2 := o.bytes()
	return r1 == r2 && g1 == g2 && b1 == b2 && a1 == a2
}

func (c RGBA) bytes() (r, g, b, a uint8) {
	q := func(v float64) uint8 { return uint8(math.Round(clamp01(v) * 255)) }
	return q(c.R), q(c.G), q(c.B), q(c.A)
}

// Transparent reports whether the color is fully transparent.
func (c RGBA) Transparent() bool { return c.A <= 0.001 }

var named = map[string]RGBA{
	"black":       {0, 0, 0, 1},
	"white":       {1, 1, 1, 1},
	"red":         {1, 0, 0, 1},
	"transparent": {0, 0, 0, 0},
}

// Parse understands hex, rgb()/rgba(), hsl()/hsla(), oklch(), oklab(),
// color(srgb ...) and a few named colors — everything a browser's computed
// style or a design-token file is likely to contain.
func Parse(s string) (RGBA, bool) {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return RGBA{}, false
	}
	if c, ok := named[s]; ok {
		return c, true
	}
	if strings.HasPrefix(s, "#") {
		return parseHex(s[1:])
	}
	open := strings.IndexByte(s, '(')
	if open < 0 || !strings.HasSuffix(s, ")") {
		return RGBA{}, false
	}
	fn := s[:open]
	args, alpha, ok := splitArgs(s[open+1 : len(s)-1])
	if !ok {
		return RGBA{}, false
	}
	switch fn {
	case "rgb", "rgba":
		if len(args) != 3 {
			return RGBA{}, false
		}
		var ch [3]float64
		for i, a := range args {
			v, ok := num(a, 255)
			if !ok {
				return RGBA{}, false
			}
			ch[i] = v / 255
		}
		return RGBA{ch[0], ch[1], ch[2], alpha}, true
	case "hsl", "hsla":
		if len(args) != 3 {
			return RGBA{}, false
		}
		h, ok1 := hue(args[0])
		sat, ok2 := num(args[1], 100)
		l, ok3 := num(args[2], 100)
		if !ok1 || !ok2 || !ok3 {
			return RGBA{}, false
		}
		r, g, b := hslToRGB(h, sat/100, l/100)
		return RGBA{r, g, b, alpha}, true
	case "oklch":
		if len(args) != 3 {
			return RGBA{}, false
		}
		l, ok1 := num(args[0], 1)
		c, ok2 := num(args[1], 0.4)
		h, ok3 := hue(args[2])
		if !ok1 || !ok2 || !ok3 {
			return RGBA{}, false
		}
		rad := h * math.Pi / 180
		r, g, b := oklabToSRGB(l, c*math.Cos(rad), c*math.Sin(rad))
		return RGBA{r, g, b, alpha}, true
	case "oklab":
		if len(args) != 3 {
			return RGBA{}, false
		}
		l, ok1 := num(args[0], 1)
		a, ok2 := num(args[1], 0.4)
		bb, ok3 := num(args[2], 0.4)
		if !ok1 || !ok2 || !ok3 {
			return RGBA{}, false
		}
		r, g, b := oklabToSRGB(l, a, bb)
		return RGBA{r, g, b, alpha}, true
	case "color":
		if len(args) != 4 || args[0] != "srgb" {
			return RGBA{}, false
		}
		var ch [3]float64
		for i, a := range args[1:] {
			v, ok := num(a, 1)
			if !ok {
				return RGBA{}, false
			}
			ch[i] = v
		}
		return RGBA{ch[0], ch[1], ch[2], alpha}, true
	}
	return RGBA{}, false
}

func parseHex(h string) (RGBA, bool) {
	switch len(h) {
	case 3, 4:
		var b strings.Builder
		for _, r := range h {
			b.WriteRune(r)
			b.WriteRune(r)
		}
		h = b.String()
	case 6, 8:
	default:
		return RGBA{}, false
	}
	v, err := strconv.ParseUint(h, 16, 32)
	if err != nil {
		return RGBA{}, false
	}
	if len(h) == 6 {
		v = v<<8 | 0xff
	}
	return RGBA{
		R: float64(v>>24&0xff) / 255,
		G: float64(v>>16&0xff) / 255,
		B: float64(v>>8&0xff) / 255,
		A: float64(v&0xff) / 255,
	}, true
}

// splitArgs splits "1, 2, 3, 0.5" or "1 2 3 / 50%" into channel args and alpha.
func splitArgs(s string) ([]string, float64, bool) {
	alpha := 1.0
	if i := strings.IndexByte(s, '/'); i >= 0 {
		a, ok := num(strings.TrimSpace(s[i+1:]), 1)
		if !ok {
			return nil, 0, false
		}
		alpha = a
		s = s[:i]
	}
	fields := strings.FieldsFunc(s, func(r rune) bool { return r == ',' || r == ' ' })
	if len(fields) == 4 && !strings.HasPrefix(fields[0], "srgb") {
		a, ok := num(fields[3], 1)
		if !ok {
			return nil, 0, false
		}
		alpha = a
		fields = fields[:3]
	}
	return fields, alpha, true
}

// num parses a number; a percentage is scaled so that 100% == full.
func num(s string, full float64) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "none" {
		return 0, true
	}
	pct := strings.HasSuffix(s, "%")
	s = strings.TrimSuffix(s, "%")
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, false
	}
	if pct {
		v = v / 100 * full
	}
	return v, true
}

func hue(s string) (float64, bool) {
	s = strings.TrimSuffix(strings.TrimSpace(s), "deg")
	return num(s, 360)
}

func hslToRGB(h, s, l float64) (float64, float64, float64) {
	h = math.Mod(math.Mod(h, 360)+360, 360) / 360
	if s == 0 {
		return l, l, l
	}
	q := l * (1 + s)
	if l >= 0.5 {
		q = l + s - l*s
	}
	p := 2*l - q
	f := func(t float64) float64 {
		if t < 0 {
			t++
		}
		if t > 1 {
			t--
		}
		switch {
		case t < 1.0/6:
			return p + (q-p)*6*t
		case t < 0.5:
			return q
		case t < 2.0/3:
			return p + (q-p)*(2.0/3-t)*6
		}
		return p
	}
	return f(h + 1.0/3), f(h), f(h - 1.0/3)
}

// OKLab returns the color in the OKLab space (L in [0,1]).
func (c RGBA) OKLab() (L, a, b float64) {
	r, g, bl := toLinear(clamp01(c.R)), toLinear(clamp01(c.G)), toLinear(clamp01(c.B))
	l := math.Cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*bl)
	m := math.Cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*bl)
	s := math.Cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*bl)
	return 0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
		1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
		0.0259040371*l + 0.7827717662*m - 0.8086757660*s
}

func oklabToSRGB(L, a, b float64) (float64, float64, float64) {
	l := cube(L + 0.3963377774*a + 0.2158037573*b)
	m := cube(L - 0.1055613458*a - 0.0638541728*b)
	s := cube(L - 0.0894841775*a - 1.2914855480*b)
	r := 4.0767416621*l - 3.3077115913*m + 0.2309699292*s
	g := -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
	bl := -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
	return clamp01(toGamma(r)), clamp01(toGamma(g)), clamp01(toGamma(bl))
}

// DeltaE is the OKLab distance scaled to roughly 0–100 (1.0 ≈ just noticeable).
// Alpha differences count as well, so a 50% tint never matches a solid token.
func DeltaE(x, y RGBA) float64 {
	L1, a1, b1 := x.OKLab()
	L2, a2, b2 := y.OKLab()
	dA := (x.A - y.A) * 0.5
	return 100 * math.Sqrt(sq(L1-L2)+sq(a1-a2)+sq(b1-b2)+sq(dA))
}

func toLinear(c float64) float64 {
	if c <= 0.04045 {
		return c / 12.92
	}
	return math.Pow((c+0.055)/1.055, 2.4)
}

func toGamma(c float64) float64 {
	if c <= 0.0031308 {
		return 12.92 * c
	}
	return 1.055*math.Pow(c, 1/2.4) - 0.055
}

func clamp01(v float64) float64 { return math.Max(0, math.Min(1, v)) }
func cube(v float64) float64    { return v * v * v }
func sq(v float64) float64      { return v * v }
