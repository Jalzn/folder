-- Every document, drawing and task belongs to a project. Items without one move to the project
-- Geral, created only when there are such items. Moving them is not an edit: versions and dates
-- stay, so autosaves and drawing previews remain valid.

-- Mark colour and selector order. Positions follow the old sidebar, most recently edited first,
-- with archived projects after the active ones. Colours rotate by creation; grey is left to Geral.
ALTER TABLE workspace_projects
  ADD COLUMN color TEXT NOT NULL DEFAULT 'gray' CHECK (color IN ('violet', 'ochre', 'gray', 'green'));
ALTER TABLE workspace_projects ADD COLUMN position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0);

UPDATE workspace_projects
SET
  position = ordered.position,
  color = CASE ordered.creation % 3 WHEN 0 THEN 'violet' WHEN 1 THEN 'ochre' ELSE 'green' END
FROM (
  SELECT
    id,
    row_number() OVER (ORDER BY archived_at IS NOT NULL, updated_at DESC, id) - 1 AS position,
    row_number() OVER (ORDER BY created_at, id) - 1 AS creation
  FROM workspace_projects
) AS ordered
WHERE workspace_projects.id = ordered.id;

-- Geral, at the end of the selector, only for items without a project, trashed ones included.
INSERT INTO workspace_projects (id, name, version, archived_at, created_at, updated_at, color, position)
SELECT
  '00000000-0000-4000-8000-000000000001',
  'Geral',
  1,
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'gray',
  (SELECT coalesce(max(position) + 1, 0) FROM workspace_projects)
WHERE NOT EXISTS (SELECT 1 FROM workspace_projects WHERE id = '00000000-0000-4000-8000-000000000001')
  AND (
    EXISTS (SELECT 1 FROM workspace_documents WHERE project_id IS NULL)
    OR EXISTS (SELECT 1 FROM workspace_canvases WHERE project_id IS NULL)
    OR EXISTS (SELECT 1 FROM workspace_tasks WHERE project_id IS NULL)
  );

-- Project boards change when tasks join Geral, so a move based on an earlier read is refused.
UPDATE workspace_state
SET board_revision = board_revision + 1
WHERE EXISTS (SELECT 1 FROM workspace_tasks WHERE project_id IS NULL);

UPDATE workspace_documents SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE workspace_canvases SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE workspace_tasks SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;

-- The project stays required. Rebuilding these tables to declare the column NOT NULL would mean
-- turning foreign keys off outside the migration transaction, since sources and previews refer
-- to them. The triggers also refuse the ON DELETE SET NULL of the project keys.
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
CREATE TRIGGER workspace_tasks_project_required_on_insert BEFORE INSERT ON workspace_tasks
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.project_id is required');
END;
CREATE TRIGGER workspace_tasks_project_required_on_update BEFORE UPDATE OF project_id ON workspace_tasks
WHEN NEW.project_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'workspace_tasks.project_id is required');
END;

-- Pinned documents and drawings, in the order they were pinned.
ALTER TABLE workspace_documents ADD COLUMN pinned_at TEXT;
ALTER TABLE workspace_canvases ADD COLUMN pinned_at TEXT;
CREATE INDEX workspace_documents_pinned ON workspace_documents(project_id, pinned_at) WHERE pinned_at IS NOT NULL;
CREATE INDEX workspace_canvases_pinned ON workspace_canvases(project_id, pinned_at) WHERE pinned_at IS NOT NULL;

-- A task outlives its source document: deleting the document for good leaves the source without
-- it, with the title kept here. No table refers to the sources, so they are rebuilt in place. The
-- outer join makes a source without its document fail the copy instead of vanishing.
CREATE TABLE workspace_task_sources_new (
  task_id TEXT PRIMARY KEY REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES workspace_documents(id) ON DELETE SET NULL,
  document_title TEXT NOT NULL,
  block_id TEXT,
  excerpt TEXT NOT NULL
);
INSERT INTO workspace_task_sources_new (task_id, document_id, document_title, block_id, excerpt)
SELECT source.task_id, source.document_id, document.title, source.block_id, source.excerpt
FROM workspace_task_sources AS source
LEFT JOIN workspace_documents AS document ON document.id = source.document_id;
DROP TABLE workspace_task_sources;
ALTER TABLE workspace_task_sources_new RENAME TO workspace_task_sources;
CREATE INDEX workspace_task_sources_document ON workspace_task_sources(document_id);
