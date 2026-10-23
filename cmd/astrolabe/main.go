// Command astrolabe checks live pages against your design tokens.
package main

import (
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/adeyanjufuhad/astrolabe/internal/browser"
	"github.com/adeyanjufuhad/astrolabe/internal/drift"
	"github.com/adeyanjufuhad/astrolabe/internal/extract"
	"github.com/adeyanjufuhad/astrolabe/internal/report"
	"github.com/adeyanjufuhad/astrolabe/internal/tokens"
)

// version is set at build time with -ldflags "-X main.version=v0.1.0".
var version = "dev"

const usage = `Astrolabe finds UI values that drifted away from your design tokens.

Usage:
  astrolabe check <url|file.html>... [flags]   audit pages against your tokens
  astrolabe tokens [file]                      show how a token file was understood
  astrolabe version                            print the version

Examples:
  astrolabe check http://localhost:3000 --tokens tokens.json
  astrolabe check https://staging.example.com/checkout --fail-under 95 --html report.html
  astrolabe check ./examples/checkout/index.html --tokens ./examples/checkout/tokens.json

Run "astrolabe check -h" for all flags.
`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
	var err error
	code := 0
	switch os.Args[1] {
	case "check":
		code, err = runCheck(os.Args[2:])
	case "tokens":
		err = runTokens(os.Args[2:])
	case "version", "--version", "-v":
		fmt.Println("astrolabe", currentVersion())
	case "help", "-h", "--help":
		fmt.Print(usage)
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n\n%s", os.Args[1], usage)
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "astrolabe:", err)
		os.Exit(2)
	}
	os.Exit(code)
}

func currentVersion() string {
	if version != "dev" {
		return version
	}
	if bi, ok := debug.ReadBuildInfo(); ok && bi.Main.Version != "" && bi.Main.Version != "(devel)" {
		return bi.Main.Version
	}
	return version
}

type checkFlags struct {
	tokens      string
	format      string
	out         string
	jsonOut     string
	htmlOut     string
	mdOut       string
	failUnder   float64
	ignore      string
	viewport    string
	wait        time.Duration
	timeout     time.Duration
	chrome      string
	maxElements int
	pxTolerance float64
	colorTol    float64
	noColor     bool
	upload      string
	project     string
	apiKey      string
	gitSHA      string
	gitRef      string
}

func runCheck(args []string) (int, error) {
	var f checkFlags
	fs := flag.NewFlagSet("check", flag.ContinueOnError)
	fs.StringVar(&f.tokens, "tokens", "", "design token file (default: tokens.json or design-tokens.json in the current folder)")
	fs.StringVar(&f.format, "format", "text", "stdout format: text, json, markdown, html")
	fs.StringVar(&f.out, "out", "", "write the stdout report to this file instead")
	fs.StringVar(&f.jsonOut, "json", "", "also write a JSON report to this file")
	fs.StringVar(&f.htmlOut, "html", "", "also write an HTML report to this file")
	fs.StringVar(&f.mdOut, "markdown", "", "also write a Markdown report to this file")
	fs.Float64Var(&f.failUnder, "fail-under", 0, "exit with status 1 if fidelity is below this percentage")
	fs.StringVar(&f.ignore, "ignore", "", "comma-separated CSS selectors to skip (e.g. \".ads,#cookie-banner\")")
	fs.StringVar(&f.viewport, "viewport", "1280x800", "viewport size WIDTHxHEIGHT")
	fs.DurationVar(&f.wait, "wait", 500*time.Millisecond, "extra time to wait after the page loads")
	fs.DurationVar(&f.timeout, "timeout", 60*time.Second, "per-page timeout")
	fs.StringVar(&f.chrome, "chrome", "", "path to Chrome/Chromium/Edge (default: auto-detect, or $ASTROLABE_CHROME)")
	fs.IntVar(&f.maxElements, "max-elements", 5000, "maximum elements audited per page")
	fs.Float64Var(&f.pxTolerance, "px-tolerance", 0.5, "lengths within this many px of a token count as a match")
	fs.Float64Var(&f.colorTol, "color-tolerance", 0, "colors within this OKLab ΔE of a token count as a match (0 = exact)")
	fs.BoolVar(&f.noColor, "no-color", false, "disable colored terminal output")
	fs.StringVar(&f.upload, "upload", os.Getenv("ASTROLABE_SERVER"), "Astrolabe server URL to store this scan in (or $ASTROLABE_SERVER)")
	fs.StringVar(&f.project, "project", "", "project name for --upload (default: current folder name or $GITHUB_REPOSITORY)")
	fs.StringVar(&f.apiKey, "api-key", os.Getenv("ASTROLABE_API_KEY"), "API key for --upload (or $ASTROLABE_API_KEY)")
	fs.StringVar(&f.gitSHA, "git-sha", os.Getenv("GITHUB_SHA"), "commit to record with the scan")
	fs.StringVar(&f.gitRef, "git-ref", firstEnv("GITHUB_HEAD_REF", "GITHUB_REF_NAME"), "branch to record with the scan")
	fs.Usage = func() {
		fmt.Fprint(fs.Output(), "Usage: astrolabe check <url|file.html>... [flags]\n\nFlags:\n")
		fs.PrintDefaults()
	}

	targets, err := parseInterspersed(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return 0, nil
		}
		return 2, nil
	}
	if len(targets) == 0 {
		fs.Usage()
		return 2, nil
	}
	width, height, err := parseViewport(f.viewport)
	if err != nil {
		return 2, err
	}
	switch f.format {
	case "text", "json", "markdown", "md", "html":
	default:
		return 2, fmt.Errorf("unknown --format %q (use text, json, markdown or html)", f.format)
	}

	tokPath, err := findTokens(f.tokens)
	if err != nil {
		return 2, err
	}
	set, err := tokens.Load(tokPath)
	if err != nil {
		return 2, err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	b, err := browser.Launch(browser.Options{ExecPath: f.chrome})
	if err != nil {
		return 2, err
	}
	defer b.Close()

	var ignore []string
	for _, s := range strings.Split(f.ignore, ",") {
		if s = strings.TrimSpace(s); s != "" {
			ignore = append(ignore, s)
		}
	}
	var pages []drift.Result
	for _, t := range targets {
		u, err := toURL(t)
		if err != nil {
			return 2, err
		}
		page, err := extract.Extract(ctx, b, u, extract.Options{
			Width: width, Height: height, Wait: f.wait, Timeout: f.timeout,
			MaxElements: f.maxElements, Ignore: ignore,
		})
		if err != nil {
			return 2, err
		}
		res := drift.Analyze(page, set, drift.Options{PxTolerance: f.pxTolerance, ColorTolerance: f.colorTol})
		if strings.HasPrefix(u, "file://") {
			res.URL = t // show the path the user typed, not a long file:// URL
		}
		pages = append(pages, res)
	}

	rep := report.New(currentVersion(), filepath.ToSlash(tokPath), set, pages)
	rep.GitSHA, rep.GitRef = shortSHA(f.gitSHA), f.gitRef

	if err := writeOutputs(rep, f); err != nil {
		return 2, err
	}
	if f.upload != "" {
		project := f.project
		if project == "" {
			project = defaultProject()
		}
		if err := upload(ctx, f.upload, project, f.apiKey, rep); err != nil {
			fmt.Fprintln(os.Stderr, "astrolabe: upload failed:", err)
		} else {
			fmt.Fprintf(os.Stderr, "Saved scan to %s (project %q)\n", f.upload, project)
		}
	}
	if f.failUnder > 0 && rep.Score < f.failUnder {
		fmt.Fprintf(os.Stderr, "Fidelity %.1f%% is below --fail-under %.1f%%\n", rep.Score, f.failUnder)
		return 1, nil
	}
	return 0, nil
}

func writeOutputs(rep *report.Report, f checkFlags) error {
	var w io.Writer = os.Stdout
	if f.out != "" {
		file, err := os.Create(f.out)
		if err != nil {
			return err
		}
		defer file.Close()
		w = file
	}
	var err error
	switch f.format {
	case "json":
		err = report.WriteJSON(w, rep)
	case "markdown", "md":
		err = report.WriteMarkdown(w, rep)
	case "html":
		err = report.WriteHTML(w, rep)
	default:
		err = report.WriteText(w, rep, f.out == "" && !f.noColor && isTerminal(os.Stdout) && os.Getenv("NO_COLOR") == "")
	}
	if err != nil {
		return err
	}
	extra := []struct {
		path  string
		write func(io.Writer, *report.Report) error
	}{
		{f.jsonOut, report.WriteJSON},
		{f.htmlOut, report.WriteHTML},
		{f.mdOut, report.WriteMarkdown},
	}
	for _, e := range extra {
		if e.path == "" {
			continue
		}
		file, err := os.Create(e.path)
		if err != nil {
			return err
		}
		werr := e.write(file, rep)
		cerr := file.Close()
		if werr != nil {
			return werr
		}
		if cerr != nil {
			return cerr
		}
	}
	return nil
}

func runTokens(args []string) error {
	path := ""
	if len(args) > 0 {
		path = args[0]
	}
	tokPath, err := findTokens(path)
	if err != nil {
		return err
	}
	set, err := tokens.Load(tokPath)
	if err != nil {
		return err
	}
	fmt.Printf("%s: %d tokens\n\n", tokPath, len(set.Tokens))
	tw := tabwriter.NewWriter(os.Stdout, 0, 2, 2, ' ', 0)
	for _, cat := range tokens.Categories {
		for _, t := range set.ByCat[cat] {
			fmt.Fprintf(tw, "  %s\t%s\t%s\n", cat, t.Name, t.Value)
		}
	}
	tw.Flush()
	if len(set.Skipped) > 0 {
		fmt.Printf("\nIgnored %d tokens that don't map to audited properties:\n", len(set.Skipped))
		for _, s := range set.Skipped {
			fmt.Println("  ", s)
		}
	}
	return nil
}

// parseInterspersed lets flags appear before or after positional arguments.
func parseInterspersed(fs *flag.FlagSet, args []string) ([]string, error) {
	var pos []string
	for {
		if err := fs.Parse(args); err != nil {
			return nil, err
		}
		args = fs.Args()
		if len(args) == 0 {
			return pos, nil
		}
		pos = append(pos, args[0])
		args = args[1:]
	}
}

func parseViewport(s string) (int, int, error) {
	w, h, ok := strings.Cut(strings.ToLower(s), "x")
	if ok {
		wi, err1 := strconv.Atoi(w)
		hi, err2 := strconv.Atoi(h)
		if err1 == nil && err2 == nil && wi > 0 && hi > 0 {
			return wi, hi, nil
		}
	}
	return 0, 0, fmt.Errorf("invalid --viewport %q (want e.g. 1280x800)", s)
}

func findTokens(explicit string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	for _, c := range []string{"tokens.json", "design-tokens.json", "tokens/tokens.json", ".astrolabe/tokens.json"} {
		if _, err := os.Stat(c); err == nil {
			return c, nil
		}
	}
	return "", errors.New("no token file found; pass --tokens path/to/tokens.json")
}

// toURL turns a URL, host:port or local file path into something the browser can open.
func toURL(t string) (string, error) {
	if strings.Contains(t, "://") {
		return t, nil
	}
	if st, err := os.Stat(t); err == nil && !st.IsDir() {
		abs, err := filepath.Abs(t)
		if err != nil {
			return "", err
		}
		p := filepath.ToSlash(abs)
		if !strings.HasPrefix(p, "/") {
			p = "/" + p // Windows: C:/x → /C:/x
		}
		return (&url.URL{Scheme: "file", Path: p}).String(), nil
	}
	return "http://" + t, nil
}

func defaultProject() string {
	if r := os.Getenv("GITHUB_REPOSITORY"); r != "" {
		return r
	}
	if wd, err := os.Getwd(); err == nil {
		return filepath.Base(wd)
	}
	return "default"
}

func upload(ctx context.Context, server, project, apiKey string, rep *report.Report) error {
	var buf bytes.Buffer
	if err := report.WriteJSON(&buf, rep); err != nil {
		return err
	}
	endpoint := strings.TrimRight(server, "/") + "/api/scans?project=" + url.QueryEscape(project)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("%s: %s", resp.Status, strings.TrimSpace(string(body)))
	}
	return nil
}

func firstEnv(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return ""
}

func shortSHA(s string) string {
	if len(s) > 12 {
		return s[:12]
	}
	return s
}

func isTerminal(f *os.File) bool {
	st, err := f.Stat()
	return err == nil && st.Mode()&os.ModeCharDevice != 0
}
