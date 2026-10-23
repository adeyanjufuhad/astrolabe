-- Astrolabe scan history. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS projects (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scans (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    score       NUMERIC(5,2) NOT NULL,
    checked     INTEGER NOT NULL,
    matched     INTEGER NOT NULL,
    git_sha     TEXT NOT NULL DEFAULT '',
    git_ref     TEXT NOT NULL DEFAULT '',
    tool_version TEXT NOT NULL DEFAULT '',
    report      JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scans_project_created_idx ON scans (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS findings (
    id            BIGSERIAL PRIMARY KEY,
    scan_id       BIGINT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    category      TEXT NOT NULL,
    value         TEXT NOT NULL,
    severity      TEXT NOT NULL,
    occurrences   INTEGER NOT NULL,
    nearest_token TEXT NOT NULL DEFAULT '',
    nearest_value TEXT NOT NULL DEFAULT '',
    distance      DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS findings_scan_idx ON findings (scan_id);
