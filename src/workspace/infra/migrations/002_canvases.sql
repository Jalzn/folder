CREATE TABLE workspace_canvases (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES workspace_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scene TEXT NOT NULL CHECK (json_valid(scene)),
  plain_text TEXT NOT NULL,
  search_text TEXT NOT NULL,
  format_version INTEGER NOT NULL CHECK (format_version = 1),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX workspace_canvases_project ON workspace_canvases(project_id, deleted_at, updated_at);
CREATE INDEX workspace_canvases_recent ON workspace_canvases(deleted_at, updated_at);
