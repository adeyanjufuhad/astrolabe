package colorx

import "testing"

func TestParse(t *testing.T) {
	cases := map[string]string{
		"#3B82F6":                    "#3b82f6",
		"#fff":                       "#ffffff",
		"#0008":                      "#00000088",
		"rgb(59, 130, 246)":          "#3b82f6",
		"rgba(59, 130, 246, 0.5)":    "#3b82f680",
		"rgb(59 130 246 / 50%)":      "#3b82f680",
		"hsl(0, 100%, 50%)":          "#ff0000",
		"white":                      "#ffffff",
		"color(srgb 1 0 0)":          "#ff0000",
		"oklch(62.3% 0.214 259.815)": "#2b7fff", // Tailwind v4 blue-500
		"oklch(1 0 0)":               "#ffffff",
	}
	for in, want := range cases {
		c, ok := Parse(in)
		if !ok {
			t.Errorf("Parse(%q) failed", in)
			continue
		}
		if got := c.Hex(); got != want {
			t.Errorf("Parse(%q) = %s, want %s", in, got, want)
		}
	}
	for _, bad := range []string{"", "#12", "rgb(1,2)", "banana", "url(x)"} {
		if _, ok := Parse(bad); ok {
			t.Errorf("Parse(%q) should fail", bad)
		}
	}
}

func TestDeltaE(t *testing.T) {
	a, _ := Parse("#3b82f6")
	b, _ := Parse("#3b82f7")
	c, _ := Parse("#ef4444")
	if d := DeltaE(a, a); d != 0 {
		t.Fatalf("identical colors should have ΔE 0, got %v", d)
	}
	if d := DeltaE(a, b); d <= 0 || d > 1 {
		t.Fatalf("one-step difference should be tiny but non-zero, got %v", d)
	}
	if d := DeltaE(a, c); d < 20 {
		t.Fatalf("blue vs red should be far apart, got %v", d)
	}
	if a.Equal8(b) {
		t.Fatal("#3b82f6 and #3b82f7 must not be Equal8")
	}
}
