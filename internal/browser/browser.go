// Package browser drives a local Chrome, Chromium or Edge over the DevTools
// protocol using only the Go standard library.
package browser

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Options configures how the browser is launched.
type Options struct {
	ExecPath  string        // explicit browser binary; empty means auto-detect
	NoSandbox bool          // pass --no-sandbox (needed when running as root, e.g. in Docker)
	Timeout   time.Duration // startup timeout
}

// Browser is a running headless browser.
type Browser struct {
	cmd     *exec.Cmd
	dataDir string
	ws      *wsConn

	nextID  atomic.Int64
	mu      sync.Mutex
	pending map[int64]chan message
	waiters map[string][]chan json.RawMessage // key: sessionID + "|" + method
	closed  chan struct{}
	readErr error
}

type message struct {
	ID        int64           `json:"id,omitempty"`
	Method    string          `json:"method,omitempty"`
	SessionID string          `json:"sessionId,omitempty"`
	Params    json.RawMessage `json:"params,omitempty"`
	Result    json.RawMessage `json:"result,omitempty"`
	Error     *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Launch starts a headless browser.
func Launch(opts Options) (*Browser, error) {
	if opts.Timeout == 0 {
		opts.Timeout = 30 * time.Second
	}
	path := opts.ExecPath
	if path == "" {
		path = os.Getenv("ASTROLABE_CHROME")
	}
	if path == "" {
		var err error
		if path, err = FindExecutable(); err != nil {
			return nil, err
		}
	}
	dataDir, err := os.MkdirTemp("", "astrolabe-browser-")
	if err != nil {
		return nil, err
	}
	args := []string{
		"--headless=new",
		"--remote-debugging-port=0",
		"--user-data-dir=" + dataDir,
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-gpu",
		"--disable-extensions",
		"--disable-background-networking",
		"--disable-component-update",
		"--disable-sync",
		"--hide-scrollbars",
		"--mute-audio",
		"--font-render-hinting=none",
	}
	if opts.NoSandbox || needsNoSandbox() {
		args = append(args, "--no-sandbox")
	}
	args = append(args, "about:blank")
	cmd := exec.Command(path, args...)
	if err := cmd.Start(); err != nil {
		os.RemoveAll(dataDir)
		return nil, fmt.Errorf("starting browser %s: %w", path, err)
	}
	b := &Browser{
		cmd:     cmd,
		dataDir: dataDir,
		pending: map[int64]chan message{},
		waiters: map[string][]chan json.RawMessage{},
		closed:  make(chan struct{}),
	}
	wsURL, err := waitForDevTools(dataDir, opts.Timeout)
	if err != nil {
		b.kill()
		return nil, fmt.Errorf("browser %s did not start: %w", path, err)
	}
	ws, err := dialWS(wsURL, opts.Timeout)
	if err != nil {
		b.kill()
		return nil, err
	}
	b.ws = ws
	go b.readLoop()
	return b, nil
}

func needsNoSandbox() bool {
	if runtime.GOOS != "linux" {
		return false
	}
	return os.Geteuid() == 0 || os.Getenv("CI") != ""
}

// waitForDevTools polls the DevToolsActivePort file Chrome writes on startup.
func waitForDevTools(dataDir string, timeout time.Duration) (string, error) {
	deadline := time.Now().Add(timeout)
	file := filepath.Join(dataDir, "DevToolsActivePort")
	for time.Now().Before(deadline) {
		data, err := os.ReadFile(file)
		if err == nil {
			lines := strings.Split(strings.TrimSpace(string(data)), "\n")
			if len(lines) >= 2 {
				return fmt.Sprintf("ws://127.0.0.1:%s%s", strings.TrimSpace(lines[0]), strings.TrimSpace(lines[1])), nil
			}
		}
		time.Sleep(50 * time.Millisecond)
	}
	return "", errors.New("timed out waiting for DevTools endpoint")
}

func (b *Browser) readLoop() {
	defer close(b.closed)
	for {
		data, err := b.ws.ReadMessage()
		if err != nil {
			b.mu.Lock()
			b.readErr = err
			for id, ch := range b.pending {
				close(ch)
				delete(b.pending, id)
			}
			b.mu.Unlock()
			return
		}
		var m message
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		b.mu.Lock()
		if m.ID != 0 {
			if ch, ok := b.pending[m.ID]; ok {
				ch <- m
				delete(b.pending, m.ID)
			}
		} else if m.Method != "" {
			key := m.SessionID + "|" + m.Method
			for _, ch := range b.waiters[key] {
				select {
				case ch <- m.Params:
				default:
				}
			}
			delete(b.waiters, key)
		}
		b.mu.Unlock()
	}
}

// call sends a DevTools command and waits for its result.
func (b *Browser) call(ctx context.Context, sessionID, method string, params any, out any) error {
	id := b.nextID.Add(1)
	ch := make(chan message, 1)
	b.mu.Lock()
	if b.readErr != nil {
		b.mu.Unlock()
		return fmt.Errorf("browser connection closed: %w", b.readErr)
	}
	b.pending[id] = ch
	b.mu.Unlock()

	req := map[string]any{"id": id, "method": method}
	if params != nil {
		req["params"] = params
	}
	if sessionID != "" {
		req["sessionId"] = sessionID
	}
	data, err := json.Marshal(req)
	if err != nil {
		return err
	}
	if err := b.ws.WriteText(data); err != nil {
		return err
	}
	select {
	case <-ctx.Done():
		b.mu.Lock()
		delete(b.pending, id)
		b.mu.Unlock()
		return fmt.Errorf("%s: %w", method, ctx.Err())
	case m, ok := <-ch:
		if !ok {
			return fmt.Errorf("%s: browser connection closed", method)
		}
		if m.Error != nil {
			return fmt.Errorf("%s: %s", method, m.Error.Message)
		}
		if out != nil && len(m.Result) > 0 {
			return json.Unmarshal(m.Result, out)
		}
		return nil
	}
}

// waitEvent registers interest in the next occurrence of an event. Register
// before triggering the action that causes the event.
func (b *Browser) waitEvent(sessionID, method string) <-chan json.RawMessage {
	ch := make(chan json.RawMessage, 1)
	b.mu.Lock()
	key := sessionID + "|" + method
	b.waiters[key] = append(b.waiters[key], ch)
	b.mu.Unlock()
	return ch
}

// Close shuts the browser down and removes its temporary profile.
func (b *Browser) Close() error {
	if b.ws != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		_ = b.call(ctx, "", "Browser.close", nil, nil)
		cancel()
		b.ws.Close()
	}
	done := make(chan struct{})
	go func() { _ = b.cmd.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		_ = b.cmd.Process.Kill()
		<-done
	}
	// Chrome may hold files briefly after exit on Windows; retry the cleanup.
	for i := 0; i < 5; i++ {
		if os.RemoveAll(b.dataDir) == nil {
			break
		}
		time.Sleep(200 * time.Millisecond)
	}
	return nil
}

func (b *Browser) kill() {
	_ = b.cmd.Process.Kill()
	_ = b.cmd.Wait()
	os.RemoveAll(b.dataDir)
}

// PageOptions configures a single page visit.
type PageOptions struct {
	Width, Height int
	Wait          time.Duration // extra settle time after the load event
}

// Evaluate opens url in a fresh tab, waits for it to load, evaluates the
// JavaScript expression (awaiting promises) and decodes the returned value into out.
func (b *Browser) Evaluate(ctx context.Context, url string, opts PageOptions, expression string, out any) error {
	var target struct {
		TargetID string `json:"targetId"`
	}
	if err := b.call(ctx, "", "Target.createTarget", map[string]any{"url": "about:blank"}, &target); err != nil {
		return err
	}
	defer func() {
		cctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		_ = b.call(cctx, "", "Target.closeTarget", map[string]any{"targetId": target.TargetID}, nil)
		cancel()
	}()

	var attached struct {
		SessionID string `json:"sessionId"`
	}
	if err := b.call(ctx, "", "Target.attachToTarget", map[string]any{"targetId": target.TargetID, "flatten": true}, &attached); err != nil {
		return err
	}
	sid := attached.SessionID
	if err := b.call(ctx, sid, "Page.enable", nil, nil); err != nil {
		return err
	}
	if opts.Width > 0 && opts.Height > 0 {
		if err := b.call(ctx, sid, "Emulation.setDeviceMetricsOverride", map[string]any{
			"width": opts.Width, "height": opts.Height, "deviceScaleFactor": 1, "mobile": false,
		}, nil); err != nil {
			return err
		}
	}

	loaded := b.waitEvent(sid, "Page.loadEventFired")
	var nav struct {
		ErrorText string `json:"errorText"`
	}
	if err := b.call(ctx, sid, "Page.navigate", map[string]any{"url": url}, &nav); err != nil {
		return err
	}
	if nav.ErrorText != "" {
		return fmt.Errorf("loading %s: %s", url, nav.ErrorText)
	}
	select {
	case <-loaded:
	case <-ctx.Done():
		return fmt.Errorf("loading %s: %w", url, ctx.Err())
	case <-b.closed:
		return errors.New("browser exited while loading page")
	}
	if opts.Wait > 0 {
		select {
		case <-time.After(opts.Wait):
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	var res struct {
		Result struct {
			Value json.RawMessage `json:"value"`
		} `json:"result"`
		ExceptionDetails *struct {
			Text      string `json:"text"`
			Exception *struct {
				Description string `json:"description"`
			} `json:"exception"`
		} `json:"exceptionDetails"`
	}
	if err := b.call(ctx, sid, "Runtime.evaluate", map[string]any{
		"expression":    expression,
		"returnByValue": true,
		"awaitPromise":  true,
	}, &res); err != nil {
		return err
	}
	if res.ExceptionDetails != nil {
		msg := res.ExceptionDetails.Text
		if res.ExceptionDetails.Exception != nil {
			msg = res.ExceptionDetails.Exception.Description
		}
		return fmt.Errorf("script error on %s: %s", url, msg)
	}
	return json.Unmarshal(res.Result.Value, out)
}
