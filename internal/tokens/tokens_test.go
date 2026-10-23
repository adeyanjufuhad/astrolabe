package tokens

import "testing"

func TestParseDTCG(t *testing.T) {
	set, err := Parse([]byte(`{
	  "color": {
	    "$type": "color",
	    "blue": {"500": {"$value": "#3b82f6"}},
	    "primary": {"$value": "{color.blue.500}"}
	  },
	  "space": {
	    "$type": "dimension",
	    "2": {"$value": "8px"},
	    "3": {"$value": {"value": 0.75, "unit": "rem"}}
	  },
	  "radius": {"md": {"$type": "dimension", "$value": "6px"}},
	  "font": {
	    "size": {"sm": {"$type": "dimension", "$value": "14px"}},
	    "family": {"sans": {"$type": "fontFamily", "$value": ["Inter", "sans-serif"]}},
	    "weight": {"bold": {"$type": "fontWeight", "$value": 700}}
	  },
	  "line-height": {"tight": {"$type": "dimension", "$value": "1.25"}}
	}`))
	if err != nil {
		t.Fatal(err)
	}
	want := map[Category][]string{
		Color:      {"#3b82f6", "#3b82f6"},
		Spacing:    {"8px", "12px"},
		Radius:     {"6px"},
		FontSize:   {"14px"},
		FontFamily: {"inter"},
		FontWeight: {"700"},
	}
	for cat, vals := range want {
		got := set.ByCat[cat]
		if len(got) != len(vals) {
			t.Fatalf("%s: got %d tokens %+v, want %d", cat, len(got), got, len(vals))
		}
		for i, v := range vals {
			if got[i].Value != v {
				t.Errorf("%s[%d] = %s, want %s", cat, i, got[i].Value, v)
			}
		}
	}
	if len(set.Skipped) != 1 || set.Skipped[0] != "line-height.tight" {
		t.Errorf("expected line-height to be skipped, got %v", set.Skipped)
	}
}

func TestParsePlain(t *testing.T) {
	set, err := Parse([]byte(`{
	  "colors": {"brand": "#ff6600", "ink": "rgb(17, 24, 39)"},
	  "spacing": {"sm": "4px", "md": 8},
	  "rounded": {"lg": "0.5rem"},
	  "fontSize": {"base": "1rem"},
	  "fontFamily": {"body": "\"Geist\", system-ui"},
	  "fontWeight": {"medium": "500"}
	}`))
	if err != nil {
		t.Fatal(err)
	}
	counts := map[Category]int{Color: 2, Spacing: 2, Radius: 1, FontSize: 1, FontFamily: 1, FontWeight: 1}
	for cat, n := range counts {
		if len(set.ByCat[cat]) != n {
			t.Errorf("%s: got %d, want %d (%+v)", cat, len(set.ByCat[cat]), n, set.ByCat[cat])
		}
	}
	if set.ByCat[Radius][0].Px != 8 {
		t.Errorf("0.5rem should be 8px, got %v", set.ByCat[Radius][0].Px)
	}
	if set.ByCat[FontFamily][0].Family != "geist" {
		t.Errorf("family = %q", set.ByCat[FontFamily][0].Family)
	}
}

func TestAliasLoop(t *testing.T) {
	set, err := Parse([]byte(`{"color": {"a": {"$type":"color","$value":"{color.b}"}, "b": {"$type":"color","$value":"{color.a}"}, "c": {"$type":"color","$value":"#000"}}}`))
	if err != nil {
		t.Fatal(err)
	}
	if len(set.Tokens) != 1 || len(set.Skipped) != 2 {
		t.Fatalf("tokens=%v skipped=%v", set.Tokens, set.Skipped)
	}
}

func TestToPx(t *testing.T) {
	cases := map[string]float64{"12px": 12, "0.75rem": 12, "1.5em": 24, "0": 0, "10": 10}
	for in, want := range cases {
		if got, ok := ToPx(in); !ok || got != want {
			t.Errorf("ToPx(%q) = %v, %v", in, got, ok)
		}
	}
}
