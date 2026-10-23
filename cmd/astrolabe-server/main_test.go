package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/adeyanjufuhad/astrolabe/internal/drift"
	"github.com/adeyanjufuhad/astrolabe/internal/report"
	"github.com/adeyanjufuhad/astrolabe/internal/store"
)

type fakeStore struct {
	saved   map[string]*report.Report
	scanned string
}

func (f *fakeStore) SaveReport(_ context.Context, project string, r *report.Report) ([]int64, error) {
	f.saved[project] = r
	return []int64{1}, nil
}
func (f *fakeStore) ListProjects(context.Context) ([]store.ProjectSummary, error) {
	return []store.ProjectSummary{{Name: "demo", Scans: 1}}, nil
}
func (f *fakeStore) ListScans(_ context.Context, project string, _ int) ([]store.ScanSummary, error) {
	f.scanned = project
	return []store.ScanSummary{}, nil
}
func (f *fakeStore) GetScan(context.Context, int64) (json.RawMessage, error) {
	return nil, store.ErrNotFound
}

func TestHandler(t *testing.T) {
	fs := &fakeStore{saved: map[string]*report.Report{}}
	h := NewHandler(fs, "secret")
	body, _ := json.Marshal(report.Report{Schema: 1, Tool: "astrolabe", Pages: []drift.Result{{URL: "http://x", Score: 90}}})

	do := func(method, path, auth, payload string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(payload))
		if auth != "" {
			req.Header.Set("Authorization", "Bearer "+auth)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	if rec := do("POST", "/api/scans?project=demo", "", string(body)); rec.Code != http.StatusUnauthorized {
		t.Fatalf("no key: got %d", rec.Code)
	}
	if rec := do("POST", "/api/scans?project=demo", "wrong", string(body)); rec.Code != http.StatusUnauthorized {
		t.Fatalf("wrong key: got %d", rec.Code)
	}
	if rec := do("POST", "/api/scans", "secret", string(body)); rec.Code != http.StatusBadRequest {
		t.Fatalf("missing project: got %d", rec.Code)
	}
	if rec := do("POST", "/api/scans?project=demo", "secret", `{"tool":"other"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("bad report: got %d", rec.Code)
	}
	if rec := do("POST", "/api/scans?project=demo", "secret", string(body)); rec.Code != http.StatusCreated {
		t.Fatalf("valid upload: got %d %s", rec.Code, rec.Body)
	}
	if fs.saved["demo"] == nil {
		t.Fatal("report not saved")
	}
	if rec := do("GET", "/api/projects/owner%2Frepo/scans", "", ""); rec.Code != 200 || fs.scanned != "owner/repo" {
		t.Fatalf("encoded project: code %d, got %q", rec.Code, fs.scanned)
	}
	if rec := do("GET", "/api/scans/99", "", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("missing scan: got %d", rec.Code)
	}
	if rec := do("GET", "/healthz", "", ""); rec.Code != 200 {
		t.Fatalf("healthz: got %d", rec.Code)
	}
}
