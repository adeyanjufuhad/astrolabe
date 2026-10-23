// Package store keeps scan history in Postgres (built for Neon's free tier).
package store

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq" // Postgres driver; supports TLS SNI, which Neon requires

	"github.com/adeyanjufuhad/astrolabe/internal/report"
)

//go:embed schema.sql
var schema string

// Store is a handle on the history database.
type Store struct {
	db *sql.DB
}

// ErrNotFound is returned when a scan or project doesn't exist.
var ErrNotFound = errors.New("not found")

// Open connects to Postgres using a URL such as Neon's
// postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
func Open(ctx context.Context, databaseURL string) (*Store, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}
	// Neon's free tier scales to zero; keep the pool small and short-lived.
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxIdleTime(4 * time.Minute)
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("connecting to database: %w", err)
	}
	return &Store{db: db}, nil
}

// Close releases the connection pool.
func (s *Store) Close() error { return s.db.Close() }

// Migrate creates the tables if they don't exist.
func (s *Store) Migrate(ctx context.Context) error {
	for _, stmt := range strings.Split(schema, ";") {
		if strings.TrimSpace(stripComments(stmt)) == "" {
			continue
		}
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}
	return nil
}

func stripComments(sqlText string) string {
	var b strings.Builder
	for _, line := range strings.Split(sqlText, "\n") {
		if !strings.HasPrefix(strings.TrimSpace(line), "--") {
			b.WriteString(line)
			b.WriteByte('\n')
		}
	}
	return b.String()
}

// SaveReport stores every page of a report as a scan under project and
// returns the new scan IDs.
func (s *Store) SaveReport(ctx context.Context, project string, r *report.Report) ([]int64, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var projectID int64
	err = tx.QueryRowContext(ctx,
		`INSERT INTO projects (name) VALUES ($1)
		 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
		 RETURNING id`, project).Scan(&projectID)
	if err != nil {
		return nil, fmt.Errorf("upserting project: %w", err)
	}

	var ids []int64
	for _, p := range r.Pages {
		payload, err := json.Marshal(struct {
			GeneratedAt time.Time `json:"generatedAt"`
			TokensFile  string    `json:"tokensFile"`
			Page        any       `json:"page"`
		}{r.GeneratedAt, r.TokensFile, p})
		if err != nil {
			return nil, err
		}
		var id int64
		err = tx.QueryRowContext(ctx,
			`INSERT INTO scans (project_id, url, title, score, checked, matched, git_sha, git_ref, tool_version, report)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
			projectID, p.URL, p.Title, p.Score, p.Checked, p.Matched, r.GitSHA, r.GitRef, r.Version, payload).Scan(&id)
		if err != nil {
			return nil, fmt.Errorf("inserting scan: %w", err)
		}
		for _, f := range p.Findings {
			var tok, val string
			var dist float64
			if f.Nearest != nil {
				tok, val, dist = f.Nearest.Token, f.Nearest.Value, f.Nearest.Distance
			}
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO findings (scan_id, category, value, severity, occurrences, nearest_token, nearest_value, distance)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				id, string(f.Category), f.Value, string(f.Severity), f.Occurrences, tok, val, dist); err != nil {
				return nil, fmt.Errorf("inserting finding: %w", err)
			}
		}
		ids = append(ids, id)
	}
	return ids, tx.Commit()
}

// ProjectSummary is one row of the project list.
type ProjectSummary struct {
	Name       string     `json:"name"`
	Scans      int        `json:"scans"`
	LastScore  *float64   `json:"lastScore"`
	LastScanAt *time.Time `json:"lastScanAt"`
}

// ListProjects returns projects with their latest score.
func (s *Store) ListProjects(ctx context.Context) ([]ProjectSummary, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT p.name, count(sc.id),
		       (SELECT score FROM scans WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1),
		       max(sc.created_at)
		FROM projects p LEFT JOIN scans sc ON sc.project_id = p.id
		GROUP BY p.id, p.name
		ORDER BY max(sc.created_at) DESC NULLS LAST, p.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ProjectSummary{}
	for rows.Next() {
		var p ProjectSummary
		if err := rows.Scan(&p.Name, &p.Scans, &p.LastScore, &p.LastScanAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ScanSummary is one point in a project's history.
type ScanSummary struct {
	ID         int64     `json:"id"`
	URL        string    `json:"url"`
	Title      string    `json:"title"`
	Score      float64   `json:"score"`
	Checked    int       `json:"checked"`
	Matched    int       `json:"matched"`
	NearMisses int       `json:"nearMisses"`
	OffSystem  int       `json:"offSystem"`
	GitSHA     string    `json:"gitSha"`
	GitRef     string    `json:"gitRef"`
	CreatedAt  time.Time `json:"createdAt"`
}

// ListScans returns a project's most recent scans, newest first.
func (s *Store) ListScans(ctx context.Context, project string, limit int) ([]ScanSummary, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT sc.id, sc.url, sc.title, sc.score, sc.checked, sc.matched,
		       count(f.id) FILTER (WHERE f.severity = 'near-miss'),
		       count(f.id) FILTER (WHERE f.severity = 'off-system'),
		       sc.git_sha, sc.git_ref, sc.created_at
		FROM scans sc
		JOIN projects p ON p.id = sc.project_id
		LEFT JOIN findings f ON f.scan_id = sc.id
		WHERE p.name = $1
		GROUP BY sc.id
		ORDER BY sc.created_at DESC
		LIMIT $2`, project, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ScanSummary{}
	for rows.Next() {
		var sc ScanSummary
		if err := rows.Scan(&sc.ID, &sc.URL, &sc.Title, &sc.Score, &sc.Checked, &sc.Matched,
			&sc.NearMisses, &sc.OffSystem, &sc.GitSHA, &sc.GitRef, &sc.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

// GetScan returns the stored JSON for one scan.
func (s *Store) GetScan(ctx context.Context, id int64) (json.RawMessage, error) {
	var raw []byte
	err := s.db.QueryRowContext(ctx, `SELECT report FROM scans WHERE id = $1`, id).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return raw, err
}
