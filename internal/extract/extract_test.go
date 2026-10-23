package extract

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/adeyanjufuhad/astrolabe/internal/browser"
)

const page = `<!doctype html><html><head><title>T</title><style>
body{margin:0;font-family:Inter,sans-serif}
.btn{background:#3b82f7;color:#fff;padding:13px 16px;border-radius:6px;font-size:15px}
.ghost{background:transparent;border:0}
.hidden{display:none}
</style></head><body>
<button class="btn">Pay</button>
<div class="ghost"></div>
<div class="hidden"><p>secret</p></div>
<ul id="ignored"><li style="color:red">skip me</li></ul>
</body></html>`

func TestExtract(t *testing.T) {
	if _, err := browser.FindExecutable(); err != nil {
		t.Skip("no browser available:", err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(page))
	}))
	defer srv.Close()

	b, err := browser.Launch(browser.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	p, err := Extract(ctx, b, srv.URL, Options{Width: 1280, Height: 800, Ignore: []string{"#ignored"}})
	if err != nil {
		t.Fatal(err)
	}
	if p.Title != "T" {
		t.Errorf("title = %q", p.Title)
	}
	if len(p.Elements) != 1 {
		t.Fatalf("expected only the button to have auditable styles, got %+v", p.Elements)
	}
	btn := p.Elements[0]
	if btn.Selector != "button.btn" || !btn.Text {
		t.Errorf("unexpected element %+v", btn)
	}
	want := map[string]string{
		"background-color":       "rgb(59, 130, 247)",
		"padding-top":            "13px",
		"padding-left":           "16px",
		"font-size":              "15px",
		"border-top-left-radius": "6px",
	}
	for k, v := range want {
		if btn.Styles[k] != v {
			t.Errorf("%s = %q, want %q", k, btn.Styles[k], v)
		}
	}
}
