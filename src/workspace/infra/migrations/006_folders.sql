-- Folders group a project's documents and drawings on one level. Nothing moves: every item starts
-- at the project's root (folder_id null), and versions, dates, pins and the board revision stay.

-- A deleted folder keeps its row: it names where trashed items came from and lets the deletion be
-- undone. Folders are never deleted for good, so the item keys have no ON DELETE.
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

-- Null is the project's root.
ALTER TABLE workspace_documents ADD COLUMN folder_id TEXT REFERENCES workspace_folders(id);
ALTER TABLE workspace_canvases ADD COLUMN folder_id TEXT REFERENCES workspace_folders(id);
CREATE INDEX workspace_documents_folder ON workspace_documents(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX workspace_canvases_folder ON workspace_canvases(folder_id) WHERE folder_id IS NOT NULL;

-- A new item goes only into an active folder of its own project.
CREATE TRIGGER workspace_documents_folder_on_insert BEFORE INSERT ON workspace_documents
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_documents.folder_id must be an active folder of its project')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND deleted_at IS NULL
  );
END;
CREATE TRIGGER workspace_canvases_folder_on_insert BEFORE INSERT ON workspace_canvases
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_canvases.folder_id must be an active folder of its project')
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_folders
    WHERE id = NEW.folder_id AND project_id = NEW.project_id AND deleted_at IS NULL
  );
END;

-- An item keeps a folder of its own project. Only a trashed item may point at a deleted folder,
-- where it came from; restoring it clears folder_id in the same UPDATE. Saves write every column,
-- so this runs on each autosave: one lookup by primary key.
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

-- A folder stays in its project.
CREATE TRIGGER workspace_folders_project_fixed BEFORE UPDATE OF project_id ON workspace_folders
WHEN NEW.project_id IS NOT OLD.project_id
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders.project_id cannot change');
END;

-- A folder is deleted only once its live documents and drawings went to the root or the trash.
CREATE TRIGGER workspace_folders_empty_on_delete BEFORE UPDATE OF deleted_at ON workspace_folders
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM workspace_documents WHERE folder_id = NEW.id AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM workspace_canvases WHERE folder_id = NEW.id AND deleted_at IS NULL)
  )
BEGIN
  SELECT RAISE(ABORT, 'workspace_folders cannot be deleted with live items');
END;
