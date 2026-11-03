import { sql } from 'kysely';
import type { EventDraft } from '#core/application';
import { type Database, tables, versionedUpdate } from '#core/infra';
import type { DrawingEvent } from '../../application/contracts/events.js';
import type { DrawingsRepository } from '../../application/ports.js';
import { canvasModel, canvasRow, canvasSummary } from '../sql/mappers.js';
import type { DrawingsTables } from '../sql/tables.js';

export function drawingsRepository(
  connection: Database,
  emit: (event: EventDraft<DrawingEvent>) => void,
  assertWritable: () => void,
): DrawingsRepository {
  const db = tables<DrawingsTables>(connection);
  const beforePlacement = (id: string) =>
    db
      .selectFrom('workspace_canvases')
      .select(['version', 'folder_id', 'pinned_at'])
      .where('id', '=', id)
      .executeTakeFirst();
  return {
    async listCanvases(input) {
      let query = db
        .selectFrom('workspace_canvases')
        .select([
          'id',
          'project_id',
          'title',
          sql<string>`substr(plain_text, 1, 280)`.as('plain_text'),
          'format_version',
          'version',
          'created_at',
          'updated_at',
          'deleted_at',
          'pinned_at',
          'folder_id',
        ])
        .where('deleted_at', 'is', null);
      if (input.projectId) query = query.where('project_id', '=', input.projectId);
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map(canvasSummary);
    },
    async findCanvas(id) {
      const row = await db.selectFrom('workspace_canvases').selectAll().where('id', '=', id).executeTakeFirst();
      return row && canvasModel(row);
    },
    async insertCanvas(canvas) {
      assertWritable();
      await db.insertInto('workspace_canvases').values(canvasRow(canvas)).execute();
      emit({ type: 'drawing.created', entityId: canvas.id, payload: { version: canvas.version } });
    },
    async saveCanvas(canvas, expectedVersion) {
      assertWritable();
      await versionedUpdate(db.updateTable('workspace_canvases').set(canvasRow(canvas)), {
        id: canvas.id,
        expectedVersion,
        idColumn: 'id',
        versionColumn: 'version',
      });
      emit({ type: 'drawing.saved', entityId: canvas.id, payload: { version: canvas.version } });
    },
    async canvasPreview(canvasId) {
      const row = await db
        .selectFrom('workspace_canvas_previews')
        .select(['scene_version', 'scene_fingerprint'])
        .where('canvas_id', '=', canvasId)
        .executeTakeFirst();
      return row && { sceneVersion: row.scene_version, sceneFingerprint: row.scene_fingerprint };
    },
    async storedPreview(canvasId) {
      const row = await db
        .selectFrom('workspace_canvas_previews')
        .select(['scene_version', 'scene_fingerprint', 'width', 'height', 'png'])
        .where('canvas_id', '=', canvasId)
        .executeTakeFirst();
      return (
        row && {
          sceneVersion: row.scene_version,
          sceneFingerprint: row.scene_fingerprint,
          width: row.width,
          height: row.height,
          png: new Uint8Array(row.png.buffer, row.png.byteOffset, row.png.byteLength),
        }
      );
    },
    async liveCanvasPreviewImage(canvasId) {
      const row = await db
        .selectFrom('workspace_canvas_previews as preview')
        .innerJoin('workspace_canvases as canvas', 'canvas.id', 'preview.canvas_id')
        .select(['preview.png', 'preview.scene_version', 'preview.scene_fingerprint'])
        .where('preview.canvas_id', '=', canvasId)
        .where('canvas.deleted_at', 'is', null)
        .executeTakeFirst();
      return (
        row && {
          png: new Uint8Array(row.png.buffer, row.png.byteOffset, row.png.byteLength),
          sceneVersion: row.scene_version,
          sceneFingerprint: row.scene_fingerprint,
        }
      );
    },
    async saveCanvasPreview(preview) {
      assertWritable();
      const previous = await db
        .selectFrom('workspace_canvas_previews')
        .selectAll()
        .where('canvas_id', '=', preview.canvasId)
        .executeTakeFirst();
      const values = {
        scene_version: preview.sceneVersion,
        scene_fingerprint: preview.sceneFingerprint,
        png: preview.png,
        width: preview.width,
        height: preview.height,
        created_at: preview.createdAt,
      };
      await db
        .insertInto('workspace_canvas_previews')
        .values({ canvas_id: preview.canvasId, ...values })
        .onConflict((conflict) => conflict.column('canvas_id').doUpdateSet(values))
        .execute();
      const unchanged =
        previous &&
        previous.scene_version === preview.sceneVersion &&
        previous.scene_fingerprint === preview.sceneFingerprint &&
        previous.width === preview.width &&
        previous.height === preview.height &&
        previous.png.byteLength === preview.png.byteLength &&
        previous.png.every((byte, index) => byte === preview.png[index]);
      if (!unchanged)
        emit({
          type: 'drawing.previewStored',
          entityId: preview.canvasId,
          payload: { sceneVersion: preview.sceneVersion, sceneFingerprint: preview.sceneFingerprint },
        });
    },
    async trashCanvas({ id, at, expectedVersion }) {
      assertWritable();
      await versionedUpdate(
        db
          .updateTable('workspace_canvases')
          .set({ deleted_at: at, updated_at: at, pinned_at: null, version: expectedVersion + 1 }),
        {
          id,
          expectedVersion,
          idColumn: 'id',
          versionColumn: 'version',
        },
      );
      emit({ type: 'drawing.trashed', entityId: id, payload: { version: expectedVersion + 1 } });
    },
    async restoreCanvas({ id, place, at, expectedVersion }) {
      assertWritable();
      await versionedUpdate(
        db.updateTable('workspace_canvases').set({
          deleted_at: null,
          updated_at: at,
          folder_id: place.folderId,
          pinned_at: place.pinnedAt,
          version: expectedVersion + 1,
        }),
        { id, expectedVersion, idColumn: 'id', versionColumn: 'version' },
      );
      emit({ type: 'drawing.restored', entityId: id, payload: { version: expectedVersion + 1 } });
    },
    async moveCanvas({ id, projectId, expectedVersion }) {
      assertWritable();
      await versionedUpdate(
        db
          .updateTable('workspace_canvases')
          .set({ project_id: projectId, folder_id: null, pinned_at: null, version: expectedVersion + 1 }),
        { id, expectedVersion, idColumn: 'id', versionColumn: 'version' },
      );
      emit({
        type: 'drawing.placementChanged',
        entityId: id,
        payload: { reason: 'project', version: expectedVersion + 1 },
      });
    },
    async placeCanvas({ id, folderId, pinnedAt }) {
      assertWritable();
      const previous = await beforePlacement(id);
      await db
        .updateTable('workspace_canvases')
        .set({ folder_id: folderId, pinned_at: pinnedAt })
        .where('id', '=', id)
        .execute();
      if (previous && (previous.folder_id !== folderId || previous.pinned_at !== pinnedAt))
        emit({
          type: 'drawing.placementChanged',
          entityId: id,
          payload: { reason: 'folder', version: previous.version },
        });
    },
    async setCanvasPinnedAt({ id, pinnedAt }) {
      assertWritable();
      const previous = await beforePlacement(id);
      await db.updateTable('workspace_canvases').set({ pinned_at: pinnedAt }).where('id', '=', id).execute();
      if (previous && previous.pinned_at !== pinnedAt)
        emit({ type: 'drawing.placementChanged', entityId: id, payload: { reason: 'pin', version: previous.version } });
    },
    async deleteCanvasRow(id) {
      assertWritable();
      const previous = await beforePlacement(id);
      await db.deleteFrom('workspace_canvases').where('id', '=', id).execute();
      if (previous) emit({ type: 'drawing.purged', entityId: id, payload: { version: previous.version } });
    },
  };
}
