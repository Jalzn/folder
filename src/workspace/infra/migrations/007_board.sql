-- migrate: foreign_keys off
-- Board columns, labels and task fields. workspace_tasks is rebuilt, and workspace_task_sources
-- refers to it, so this runs with the keys off (see the migration runner): with them on, dropping
-- the old table would delete every source by cascade. foreign_key_check runs before the commit.

-- Columns are the same for every project. The three initial ones keep fixed IDs only so that this
-- migration can place the old statuses; after it, no rule depends on them.
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

INSERT INTO workspace_columns (id, name, name_key, position, is_done, version, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-000000000010', 'A fazer', 'a fazer', 0, 0, 1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('00000000-0000-4000-8000-000000000011', 'Em andamento', 'em andamento', 1, 0, 1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('00000000-0000-4000-8000-000000000012', 'Concluído', 'concluido', 2, 1, 1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Tasks, rebuilt: the column replaces the status, the project is NOT NULL (the triggers of 005 go
-- with the old table), and the title and description form the text, with a version of its own.
-- Versions, positions, dates and the trash stay as they are. A done task's completion is its last
-- edit, the closest there is.
CREATE TABLE workspace_tasks_new (
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
INSERT INTO workspace_tasks_new (
  id, project_id, column_id, title, position, due_on, completed_at, description, description_plain_text,
  search_text, checklist_done, checklist_total, version, text_version, created_at, updated_at, deleted_at
)
SELECT id, project_id,
  CASE status
    WHEN 'todo' THEN '00000000-0000-4000-8000-000000000010'
    WHEN 'doing' THEN '00000000-0000-4000-8000-000000000011'
    ELSE '00000000-0000-4000-8000-000000000012'
  END,
  title, position, NULL,
  CASE WHEN status = 'done' THEN updated_at END,
  '[]', '', workspace_search_text(title || char(10)), 0, 0,
  version, 1, created_at, updated_at, deleted_at
FROM workspace_tasks;
DROP TABLE workspace_tasks;
-- workspace_task_sources refers to workspace_tasks by name, so it refers to this table now.
ALTER TABLE workspace_tasks_new RENAME TO workspace_tasks;
CREATE INDEX workspace_tasks_board ON workspace_tasks(project_id, column_id, deleted_at, position);
CREATE INDEX workspace_tasks_project ON workspace_tasks(project_id);
CREATE INDEX workspace_tasks_column ON workspace_tasks(column_id);
CREATE INDEX workspace_tasks_done ON workspace_tasks(project_id, completed_at)
  WHERE completed_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX workspace_tasks_due ON workspace_tasks(project_id, due_on)
  WHERE due_on IS NOT NULL AND deleted_at IS NULL;

-- Labels are the same for every project and are only deleted logically: a task keeps its links
-- to a deleted label, which no read shows, so restoring the label gives it back to every task.
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
-- No ON DELETE on label_id: a label is never deleted for good, and the key refuses whoever tries.
CREATE TABLE workspace_task_labels (
  task_id TEXT NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES workspace_labels(id),
  PRIMARY KEY (task_id, label_id)
) WITHOUT ROWID;
CREATE INDEX workspace_task_labels_label ON workspace_task_labels(label_id);

-- Every task, live or trashed, is in an active column: deleting a column moves its tasks first.
-- Each check is one lookup by the column's primary key; saving the text does not set column_id.
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

-- completed_at is set exactly when the task is in the done column.
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

-- A column is deleted only once its tasks, live and trashed, went elsewhere, and never as the done one.
CREATE TRIGGER workspace_columns_empty_on_delete BEFORE UPDATE OF deleted_at ON workspace_columns
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND (NEW.is_done = 1 OR EXISTS (SELECT 1 FROM workspace_tasks WHERE column_id = NEW.id))
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns cannot be deleted with tasks or as the done column');
END;

-- Exactly one active done column. Making a column the done one (is_done 0 -> 1, one row at a time)
-- hands the role over: the old done column stops being it, its tasks lose their completion and the
-- new one's are completed, at the column's new updated_at when the write sets one, as the
-- application does, or at the current time. The done column stops being it only so. A unique index
-- could not allow the handover, which writes the new done column before clearing the old one, so a
-- second done column inserted or restored is refused by these triggers instead.
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

-- INSERT OR REPLACE deletes and inserts a row again without the UPDATE triggers, and the keys are
-- checked only at the end of the statement. A BEFORE INSERT runs before the implicit delete, and a
-- real insert never has rows pointing at a new id. Only hand-written SQL gets here.
CREATE TRIGGER workspace_folders_id_in_use BEFORE INSERT ON workspace_folders
WHEN EXISTS (SELECT 1 FROM workspace_documents WHERE folder_id = NEW.id)
  OR EXISTS (SELECT 1 FROM workspace_canvases WHERE folder_id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders.id is in use');
END;
CREATE TRIGGER workspace_columns_id_in_use BEFORE INSERT ON workspace_columns
WHEN EXISTS (SELECT 1 FROM workspace_tasks WHERE column_id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_columns.id is in use');
END;
CREATE TRIGGER workspace_labels_id_in_use BEFORE INSERT ON workspace_labels
WHEN EXISTS (SELECT 1 FROM workspace_task_labels WHERE label_id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'workspace_labels.id is in use');
END;

-- Every board read before this migration is out of date; cursors t~… issued before are refused.
UPDATE workspace_state SET board_revision = board_revision + 1 WHERE id = 1;
