import type { IsoInstant } from '@tinyfold/core/domain';
import { type Kysely, sql } from 'kysely';
import type { EmbeddedDrawing, EmbeddedTask, EmbedPreview, EmbedProject } from '../../application/embeds/ports.js';
import type { CanvasScene } from '../../domain/canvas/index.js';
import { previewShowsScene } from '../../domain/canvas/preview.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { taskLabels } from '../sql/task-labels.js';
import { taskChecklist } from '../sql/task-source.js';

const project = (row: {
  project_id: string;
  project_name: string;
  project_color: EmbedProject['color'];
  project_archived_at: IsoInstant | null;
}): EmbedProject => ({
  id: row.project_id,
  name: row.project_name,
  color: row.project_color,
  archived: row.project_archived_at !== null,
});

const projectFields = [
  'project.id as project_id',
  'project.name as project_name',
  'project.color as project_color',
  'project.archived_at as project_archived_at',
] as const;

/** Each ID once, in the order asked. */
const distinct = (ids: readonly string[]) => [...new Set(ids)];
export async function tasks(db: Kysely<WorkspaceTables>, asked: readonly string[]): Promise<EmbeddedTask[]> {
  const ids = distinct(asked);
  if (!ids.length) return [];
  const rows = await db
    .selectFrom('workspace_tasks as item')
    .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
    .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
    .select([
      'item.id',
      'item.title',
      'item.version',
      'item.deleted_at',
      'item.due_on',
      'item.completed_at',
      'item.checklist_done',
      'item.checklist_total',
      'col.id as column_id',
      'col.name as column_name',
      'col.is_done as column_is_done',
    ])
    .select(projectFields)
    .where('item.id', 'in', ids)
    .execute();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const labels = await taskLabels(
    db,
    rows.filter((row) => row.deleted_at === null).map((row) => row.id),
  );
  return ids.map((id): EmbeddedTask => {
    const row = byId.get(id);
    if (!row) return { state: 'missing', id };
    if (row.deleted_at !== null) return { state: 'trashed', id, title: row.title, version: row.version };
    return {
      state: 'live',
      id,
      title: row.title,
      version: row.version,
      column: { id: row.column_id, name: row.column_name, isDone: row.column_is_done === 1 },
      dueOn: row.due_on,
      completedAt: row.completed_at,
      labels: labels.get(id) ?? [],
      checklist: taskChecklist(row),
      project: project(row),
    };
  });
}
export async function drawings(db: Kysely<WorkspaceTables>, asked: readonly string[]): Promise<EmbeddedDrawing[]> {
  const ids = distinct(asked);
  if (!ids.length) return [];
  const rows = await db
    .selectFrom('workspace_canvases as item')
    .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
    .leftJoin('workspace_folders as folder', (join) =>
      join.onRef('folder.id', '=', 'item.folder_id').on('folder.deleted_at', 'is', null),
    )
    .leftJoin('workspace_canvas_previews as preview', 'preview.canvas_id', 'item.id')
    .select([
      'item.id',
      'item.title',
      'item.version',
      'item.deleted_at',
      'folder.id as folder_id',
      'folder.name as folder_name',
      'preview.scene_version',
      'preview.scene_fingerprint',
      'preview.width',
      'preview.height',
      // SQLite reads the scene's elements itself, so a drawing's JSON reaches JavaScript only when
      // its preview has to be compared with the scene.
      sql<number>`(select count(*) from json_each(item.scene, '$.elements')
          where coalesce(json_extract(json_each.value, '$.isDeleted'), 0) = 0)`.as('live_elements'),
    ])
    .select(projectFields)
    .where('item.id', 'in', ids)
    .execute();
  // A preview made at the drawing's current version shows its scene; any other is compared by the
  // scene's fingerprint, since renaming, moving or the trash change the version, not the scene.
  const toCompare = rows.filter(
    (row) => row.deleted_at === null && row.scene_version !== null && row.scene_version !== row.version,
  );
  const scenes = toCompare.length
    ? new Map(
        (
          await db
            .selectFrom('workspace_canvases')
            .select(['id', 'scene'])
            .where(
              'id',
              'in',
              toCompare.map((row) => row.id),
            )
            .execute()
        ).map((row) => [row.id, JSON.parse(row.scene) as CanvasScene]),
      )
    : new Map<string, CanvasScene>();
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id): EmbeddedDrawing => {
    const row = byId.get(id);
    if (!row) return { state: 'missing', id };
    if (row.deleted_at !== null) return { state: 'trashed', id, title: row.title, version: row.version };
    let preview: EmbedPreview | null = null;
    if (row.scene_version !== null && row.width !== null && row.height !== null) {
      const scene = scenes.get(id);
      const current =
        row.scene_version === row.version ||
        (scene !== undefined &&
          previewShowsScene(
            { sceneVersion: row.scene_version, sceneFingerprint: row.scene_fingerprint },
            { version: row.version, scene },
          ));
      preview = {
        fingerprint: row.scene_fingerprint,
        sceneVersion: row.scene_version,
        width: row.width,
        height: row.height,
        current,
      };
    }
    return {
      state: 'live',
      id,
      title: row.title,
      version: row.version,
      project: project(row),
      folder: row.folder_id !== null && row.folder_name !== null ? { id: row.folder_id, name: row.folder_name } : null,
      preview,
      empty: row.live_elements === 0,
    };
  });
}
