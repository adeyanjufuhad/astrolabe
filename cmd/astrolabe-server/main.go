// Command astrolabe-server stores scan history in Postgres (Neon) so teams can
// track fidelity over time. The CLI works without it; uploading is opt-in.
//
//	DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require \
//	ASTROLABE_API_KEY=some-secret \
//	astrolabe-server
package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/adeyanjufuhad/astrolabe/internal/report"
	"github.com/adeyanjufuhad/astrolabe/internal/store"
)

const maxBody = 8 << 20 // 8 MB

func main() {
	addr := flag.String("addr", ":"+envOr("PORT", "8080"), "listen address")
	migrate := flag.Bool("migrate", true, "create tables on startup")
	flag.Parse()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set (use your Neon connection string)")
	}
	apiKey := os.Getenv("ASTROLABE_API_KEY")
	if apiKey == "" {
		log.Println("warning: ASTROLABE_API_KEY is not set; anyone can upload scans")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer st.Close()
	if *migrate {
		if err := st.Migrate(ctx); err != nil {
			log.Fatal(err)
		}
	}

	srv := &http.Server{
		Addr:              *addr,
		Handler:           NewHandler(st, apiKey),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		srv.Shutdown(shutdown)
	}()
	log.Printf("astrolabe-server listening on %s", *addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// Store is what the handler needs from the database (an interface for tests).
type Store interface {
	SaveReport(ctx context.Context, project string, r *report.Report) ([]int64, error)
	ListProjects(ctx context.Context) ([]store.ProjectSummary, error)
	ListScans(ctx context.Context, project string, limit int) ([]store.ScanSummary, error)
	GetScan(ctx context.Context, id int64) (json.RawMessage, error)
}

// NewHandler wires up the HTTP API.
func NewHandler(st Store, apiKey string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST /api/scans", func(w http.ResponseWriter, r *http.Request) {
		if !authorized(r, apiKey) {
			writeError(w, http.StatusUnauthorized, "missing or invalid API key")
			return
		}
		project := strings.TrimSpace(r.URL.Query().Get("project"))
		if project == "" || len(project) > 200 {
			writeError(w, http.StatusBadRequest, "project query parameter is required")
			return
		}
		var rep report.Report
		dec := json.NewDecoder(io.LimitReader(r.Body, maxBody))
		if err := dec.Decode(&rep); err != nil {
			writeError(w, http.StatusBadRequest, "invalid report JSON: "+err.Error())
			return
		}
		if rep.Tool != "astrolabe" || len(rep.Pages) == 0 {
			writeError(w, http.StatusBadRequest, "not an Astrolabe report")
			return
		}
		if rep.Schema > report.SchemaVersion {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("report schema %d is newer than this server supports (%d)", rep.Schema, report.SchemaVersion))
			return
		}
		ids, err := st.SaveReport(r.Context(), project, &rep)
		if err != nil {
			log.Printf("save report: %v", err)
			writeError(w, http.StatusInternalServerError, "could not save report")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"project": project, "scanIds": ids})
	})

	mux.HandleFunc("GET /api/projects", func(w http.ResponseWriter, r *http.Request) {
		ps, err := st.ListProjects(r.Context())
		if err != nil {
			log.Printf("list projects: %v", err)
			writeError(w, http.StatusInternalServerError, "could not list projects")
			return
		}
		writeJSON(w, http.StatusOK, ps)
	})

	// Project names like owner/repo are sent with the slash encoded as %2F.
	mux.HandleFunc("GET /api/projects/{project}/scans", func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		scans, err := st.ListScans(r.Context(), r.PathValue("project"), limit)
		if err != nil {
			log.Printf("list scans: %v", err)
			writeError(w, http.StatusInternalServerError, "could not list scans")
			return
		}
		writeJSON(w, http.StatusOK, scans)
	})

	mux.HandleFunc("GET /api/scans/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid scan id")
			return
		}
		raw, err := st.GetScan(r.Context(), id)
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "scan not found")
			return
		}
		if err != nil {
			log.Printf("get scan: %v", err)
			writeError(w, http.StatusInternalServerError, "could not load scan")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(raw)
	})

	return withCORS(mux)
}

// authorized checks the bearer token in constant time.
func authorized(r *http.Request, apiKey string) bool {
	if apiKey == "" {
		return true
	}
	got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	return subtle.ConstantTimeCompare([]byte(got), []byte(apiKey)) == 1
}

// withCORS lets a dashboard on another origin read history (writes still need the key).
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
