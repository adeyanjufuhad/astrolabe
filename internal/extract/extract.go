// Package extract loads pages in a headless browser and collects the computed
// styles that design tokens govern.
package extract

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"time"

	"github.com/adeyanjufuhad/astrolabe/internal/browser"
)

//go:embed collect.js
var collectJS string

// Element is one visible element and the style values worth auditing.
type Element struct {
	Selector string            `json:"selector"`
	Tag      string            `json:"tag"`
	Text     bool              `json:"text"` // has its own text, so typography applies
	Styles   map[string]string `json:"styles"`
}

// Page is everything collected from one URL.
type Page struct {
	URL      string    `json:"url"`
	Title    string    `json:"title"`
	Total    int       `json:"total"` // visible elements seen (may exceed len(Elements) when capped)
	Elements []Element `json:"elements"`
}

// Options controls a page visit.
type Options struct {
	Width, Height int
	Wait          time.Duration
	Timeout       time.Duration
	MaxElements   int
	Ignore        []string // CSS selectors whose subtrees are skipped
}

// Extract visits url with an already-launched browser.
func Extract(ctx context.Context, b *browser.Browser, url string, opts Options) (*Page, error) {
	if opts.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, opts.Timeout)
		defer cancel()
	}
	if opts.MaxElements <= 0 {
		opts.MaxElements = 5000
	}
	args, err := json.Marshal(map[string]any{"ignore": opts.Ignore, "max": opts.MaxElements})
	if err != nil {
		return nil, err
	}
	expr := fmt.Sprintf("(%s)(%s)", collectJS, args)
	var page Page
	err = b.Evaluate(ctx, url, browser.PageOptions{Width: opts.Width, Height: opts.Height, Wait: opts.Wait}, expr, &page)
	if err != nil {
		return nil, err
	}
	return &page, nil
}
