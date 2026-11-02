-- The schema the migrations leave, written by schema.db.test.ts. Do not edit: a migration changes it.
-- core 001_core.sql
-- workspace 001_workspace.sql
-- workspace 002_canvases.sql
-- workspace 003_canvas_previews.sql
-- workspace 004_canvas_preview_fingerprint.sql
-- workspace 005_projects_required.sql
-- workspace 006_folders.sql
-- workspace 007_board.sql

CREATE TABLE core_mutations (
  request_id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  response TEXT NOT NULL CHECK(json_valid(response)),
  created_at TEXT NOT NULL
);

CREATE INDEX core_mutations_created_at ON core_mutations(created_at);

CREATE TABLE core_schema_migrations (module TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL, PRIMARY KEY (module, version));

CREATE TABLE workspace_canvas_previews (
  canvas_id TEXT PRIMARY KEY REFERENCES workspace_canvases(id) ON DELETE CASCADE,
  scene_version INTEGER NOT NULL CHECK (scene_version > 0),
  png BLOB NOT NULL CHECK (length(png) BETWEEN 1 AND 262144),
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 1568),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 1568),
  created_at TEXT NOT NULL
, scene_fingerprint TEXT);

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
, pinned_at TEXT, folder_id TEXT REFERENCES workspace_folders(id));

CREATE INDEX workspace_canvases_folder ON workspace_canvases(folder_id) WHERE folder_id IS NOT NULL;

CREATE INDEX workspace_canvases_pinned ON workspace_canvases(project_id, pinned_at) WHERE pinned_at IS NOT NULL;

CREATE INDEX workspace_canvases_project ON workspace_canvases(project_id, deleted_at, updated_at);

CREATE INDEX workspace_canvases_recent ON workspace_canvases(deleted_at, updated_at);

CREATE TRIGGER workspace_canvases_folder_on_insert BEFORE INSERT ON workspace_canvases
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.folder_id must be an active folder of its project')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND deleted_at IS NULL
  );
END;

CREATE TRIGGER workspace_canvases_folder_on_update
BEFORE UPDATE OF folder_id, project_id, deleted_at ON workspace_canvases
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.folder_id must be a folder of its project, active for a live item')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND (deleted_at IS NULL OR NEW.deleted_at IS NOT NULL)
  );
END;

CREATE TRIGGER workspace_canvases_project_required_on_insert BEFORE INSERT ON workspace_canvases
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.project_id is required');
END;

CREATE TRIGGER workspace_canvases_project_required_on_update BEFORE UPDATE OF project_id ON workspace_canvases
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.project_id is required');
END;

CREATE TABLE workspace_columns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  name_key TEXT NOT NULL CHECK (length(name_key) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  is_done INTEGER NOT NULL CHECK (is_done IN (0, 1)),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX workspace_columns_active_name ON workspace_columns(name_key) WHERE deleted_at IS NULL;

CREATE INDEX workspace_columns_order ON workspace_columns(deleted_at, position);

CREATE TRIGGER workspace_columns_done_handover AFTER UPDATE OF is_done ON workspace_columns
WHEN OLD.is_done = 0 AND NEW.is_done = 1
BEGIN
  UPDATE workspace_columns SET is_done = 0 WHERE is_done = 1 AND deleted_at IS NULL AND id <> NEW.id;
  UPDATE workspace_tasks
  SET completed_at = CASE WHEN NEW.updated_at IS NOT OLD.updated_at THEN NEW.updated_at
    ELSE strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END
  WHERE column_id = NEW.id AND completed_at IS NULL;
END;

CREATE TRIGGER workspace_columns_done_kept AFTER UPDATE OF is_done ON workspace_columns
WHEN OLD.is_done = 1 AND NEW.is_done = 0
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns must keep a done column: make another column the done one')
  WHERE NOT EXISTS (SELECT 1 FROM workspace_columns WHERE is_done = 1 AND deleted_at IS NULL);
  UPDATE workspace_tasks SET completed_at = NULL WHERE column_id = NEW.id AND completed_at IS NOT NULL;
END;

CREATE TRIGGER workspace_columns_done_on_delete BEFORE DELETE ON workspace_columns
WHEN OLD.is_done = 1 AND OLD.deleted_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns cannot delete the done column');
END;

CREATE TRIGGER workspace_columns_done_on_insert BEFORE INSERT ON workspace_columns
WHEN NEW.is_done = 1 AND NEW.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM workspace_columns WHERE is_done = 1 AND deleted_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns can have only one done column');
END;

CREATE TRIGGER workspace_columns_done_on_restore BEFORE UPDATE OF deleted_at ON workspace_columns
WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND NEW.is_done = 1
  AND EXISTS (SELECT 1 FROM workspace_columns WHERE is_done = 1 AND deleted_at IS NULL AND id <> NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns can have only one done column');
END;

CREATE TRIGGER workspace_columns_done_only_active BEFORE UPDATE OF is_done ON workspace_columns
WHEN OLD.is_done = 0 AND NEW.is_done = 1 AND NEW.deleted_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns: only an active column can be the done one');
END;

CREATE TRIGGER workspace_columns_empty_on_delete BEFORE UPDATE OF deleted_at ON workspace_columns
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND (NEW.is_done = 1 OR EXISTS (SELECT 1 FROM workspace_tasks WHERE column_id = NEW.id))
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns cannot be deleted with tasks or as the done column');
END;

CREATE TRIGGER workspace_columns_id_in_use BEFORE INSERT ON workspace_columns
WHEN EXISTS (SELECT 1 FROM workspace_columns WHERE id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns.id is in use');
END;

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
, pinned_at TEXT, folder_id TEXT REFERENCES workspace_folders(id));

CREATE INDEX workspace_documents_folder ON workspace_documents(folder_id) WHERE folder_id IS NOT NULL;

CREATE INDEX workspace_documents_pinned ON workspace_documents(project_id, pinned_at) WHERE pinned_at IS NOT NULL;

CREATE INDEX workspace_documents_project ON workspace_documents(project_id, deleted_at, updated_at);

CREATE TRIGGER workspace_documents_folder_on_insert BEFORE INSERT ON workspace_documents
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.folder_id must be an active folder of its project')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND deleted_at IS NULL
  );
END;

CREATE TRIGGER workspace_documents_folder_on_update
BEFORE UPDATE OF folder_id, project_id, deleted_at ON workspace_documents
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.folder_id must be a folder of its project, active for a live item')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND (deleted_at IS NULL OR NEW.deleted_at IS NOT NULL)
  );
END;

CREATE TRIGGER workspace_documents_project_required_on_insert BEFORE INSERT ON workspace_documents
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.project_id is required');
END;

CREATE TRIGGER workspace_documents_project_required_on_update BEFORE UPDATE OF project_id ON workspace_documents
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.project_id is required');
END;

CREATE TABLE workspace_folders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES workspace_projects(id),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  -- The name without case and accents, computed by the application: SQLite does not normalize.
  name_key TEXT NOT NULL CHECK (length(name_key) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX workspace_folders_active_name ON workspace_folders(project_id, name_key) WHERE deleted_at IS NULL;

CREATE INDEX workspace_folders_project ON workspace_folders(project_id, deleted_at, position);

CREATE TRIGGER workspace_folders_empty_on_delete BEFORE UPDATE OF deleted_at ON workspace_folders
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM workspace_documents WHERE folder_id = NEW.id AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM workspace_canvases WHERE folder_id = NEW.id AND deleted_at IS NULL)
  )
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders cannot be deleted with live items');
END;

CREATE TRIGGER workspace_folders_id_in_use BEFORE INSERT ON workspace_folders
WHEN EXISTS (SELECT 1 FROM workspace_folders WHERE id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders.id is in use');
END;

CREATE TRIGGER workspace_folders_project_fixed BEFORE UPDATE OF project_id ON workspace_folders
WHEN NEW.project_id IS NOT OLD.project_id
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders.project_id cannot change');
END;

CREATE TABLE workspace_labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 30),
  name_key TEXT NOT NULL CHECK (length(name_key) > 0),
  color TEXT NOT NULL CHECK (color IN ('blue', 'slate', 'purple', 'teal', 'amber', 'coral', 'lime')),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX workspace_labels_active_name ON workspace_labels(name_key) WHERE deleted_at IS NULL;

CREATE TRIGGER workspace_labels_id_in_use BEFORE INSERT ON workspace_labels
WHEN EXISTS (SELECT 1 FROM workspace_labels WHERE id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_labels.id is in use');
END;

CREATE TABLE workspace_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, color TEXT NOT NULL DEFAULT 'gray' CHECK (color IN ('violet', 'ochre', 'gray', 'green')), position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0));

CREATE TABLE workspace_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  board_revision INTEGER NOT NULL CHECK (board_revision >= 0)
);

CREATE TABLE workspace_task_labels (
  task_id TEXT NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES workspace_labels(id),
  PRIMARY KEY (task_id, label_id)
) WITHOUT ROWID;

CREATE INDEX workspace_task_labels_label ON workspace_task_labels(label_id);

CREATE TABLE "workspace_task_sources" (
  task_id TEXT PRIMARY KEY REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES workspace_documents(id) ON DELETE SET NULL,
  document_title TEXT NOT NULL,
  block_id TEXT,
  excerpt TEXT NOT NULL
);

CREATE INDEX workspace_task_sources_document ON workspace_task_sources(document_id);

CREATE TABLE "workspace_tasks" (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES workspace_projects(id),
  column_id TEXT NOT NULL REFERENCES workspace_columns(id),
  title TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  due_on TEXT CHECK (due_on IS NULL OR (length(due_on) = 10 AND date(due_on) IS due_on)),
  completed_at TEXT,
  description TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(description)),
  description_plain_text TEXT NOT NULL DEFAULT '',
  search_text TEXT NOT NULL,
  checklist_done INTEGER NOT NULL DEFAULT 0 CHECK (checklist_done >= 0),
  checklist_total INTEGER NOT NULL DEFAULT 0 CHECK (checklist_total >= checklist_done),
  version INTEGER NOT NULL CHECK (version > 0),
  text_version INTEGER NOT NULL CHECK (text_version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX workspace_tasks_board ON workspace_tasks(project_id, column_id, deleted_at, position);

CREATE INDEX workspace_tasks_column ON workspace_tasks(column_id);

CREATE INDEX workspace_tasks_done ON workspace_tasks(project_id, completed_at)
  WHERE completed_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX workspace_tasks_due ON workspace_tasks(project_id, due_on)
  WHERE due_on IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX workspace_tasks_project ON workspace_tasks(project_id);

CREATE TRIGGER workspace_tasks_column_on_insert BEFORE INSERT ON workspace_tasks
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.column_id must be an active column')
  WHERE NOT EXISTS (SELECT 1 FROM workspace_columns WHERE id = NEW.column_id AND deleted_at IS NULL);
END;

CREATE TRIGGER workspace_tasks_column_on_update BEFORE UPDATE OF column_id ON workspace_tasks
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.column_id must be an active column')
  WHERE NOT EXISTS (SELECT 1 FROM workspace_columns WHERE id = NEW.column_id AND deleted_at IS NULL);
END;

CREATE TRIGGER workspace_tasks_completion_on_insert BEFORE INSERT ON workspace_tasks
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.completed_at must be set exactly in the done column')
  WHERE EXISTS (
    SELECT 1 FROM workspace_columns WHERE id = NEW.column_id AND is_done IS NOT (NEW.completed_at IS NOT NULL)
  );
END;

CREATE TRIGGER workspace_tasks_completion_on_update BEFORE UPDATE OF column_id, completed_at ON workspace_tasks
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.completed_at must be set exactly in the done column')
  WHERE EXISTS (
    SELECT 1 FROM workspace_columns WHERE id = NEW.column_id AND is_done IS NOT (NEW.completed_at IS NOT NULL)
  );
END;
