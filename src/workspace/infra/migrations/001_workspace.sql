CREATE TABLE workspace_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE workspace_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES workspace_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (json_valid(content)),
  plain_text TEXT NOT NULL,
  search_text TEXT NOT NULL,
  format_version INTEGER NOT NULL CHECK (format_version = 1),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX workspace_documents_project ON workspace_documents(project_id, deleted_at, updated_at);

CREATE TABLE workspace_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES workspace_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
  position INTEGER NOT NULL CHECK (position >= 0),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX workspace_tasks_board ON workspace_tasks(deleted_at, status, position);
CREATE INDEX workspace_tasks_project ON workspace_tasks(project_id);

CREATE TABLE workspace_task_sources (
  task_id TEXT PRIMARY KEY REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES workspace_documents(id),
  block_id TEXT,
  excerpt TEXT NOT NULL
);
CREATE INDEX workspace_task_sources_document ON workspace_task_sources(document_id);

CREATE TABLE workspace_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  board_revision INTEGER NOT NULL CHECK (board_revision >= 0)
);
INSERT INTO workspace_state(id, board_revision) VALUES (1, 0);
