import { randomUUID } from 'node:crypto';
import { copyFile, mkdtemp, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IsoInstant } from '@tinyfold/core/domain';
import { toIsoInstant } from '@tinyfold/core/domain';
import {
  coreModule,
  type Database,
  executeMigrationScript,
  migrate,
  setForeignKeys,
  tables,
} from '@tinyfold/core/infra';
import { type CanvasScene, canvasPlainText, emptyCanvasScene } from '../domain/canvas.js';
import { documentPlainText } from '../domain/document.js';
import type { DocumentBlock } from '../domain/document-models.js';

/** A task's status before migration 007 replaced it with a column. */
type LegacyStatus = 'todo' | 'doing' | 'done';

import { searchText } from '../domain/search-text.js';
import { workspaceModule } from '../infra/module.js';

/**
 * Applies the workspace migrations up to `version` only, as an installation of an earlier stage
 * would have them. The files are copied to a folder inside `scratch`.
 */
export async function migrateWorkspaceTo(db: Database, version: number, scratch: string) {
  const folder = await mkdtemp(join(scratch, `migrations-${version}-`));
  const names = (await readdir(workspaceModule.migrations)).filter((name) => Number(name.slice(0, 3)) <= version);
  for (const name of names) await copyFile(new URL(name, workspaceModule.migrations), join(folder, name));
  return migrate(db, [coreModule, { ...workspaceModule, migrations: pathToFileURL(`${folder}/`) }]);
}

/**
 * Loads into an empty database a real stage 09 database: the SQL dump (`sqlite3 .dump`) of
 * `seed:sample`, or of `seed:sample --grande`, made by the code of 1da6617, with its migrations,
 * request records and all. The dump turns the keys off for itself; they are turned on again.
 */
export async function loadStage09Fixture(db: Database, name: 'sample' | 'grande'): Promise<void> {
  const dump = await readFile(new URL(`./fixtures/stage-09-${name}.sql`, import.meta.url), 'utf8');
  executeMigrationScript(db, dump);
  setForeignKeys(db, true);
}

interface LegacyItem {
  id: string;
  project_id: string | null;
  title: string;
  plain_text: string;
  search_text: string;
  format_version: number;
  version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
  /** Since migration 005. */
  pinned_at?: IsoInstant | null;
}

/**
 * The tables as migrations 001 to 004 left them, before every item needed a project, with the
 * columns migration 005 added as optional.
 */
interface LegacyTables {
  workspace_projects: {
    id: string;
    name: string;
    version: number;
    archived_at: IsoInstant | null;
    created_at: IsoInstant;
    updated_at: IsoInstant;
    /** Since migration 005. */
    color?: 'violet' | 'ochre' | 'gray' | 'green';
    position?: number;
  };
  workspace_documents: LegacyItem & { content: string };
  workspace_canvases: LegacyItem & { scene: string };
  workspace_canvas_previews: {
    canvas_id: string;
    scene_version: number;
    /** Since migration 004. */
    scene_fingerprint?: string | null;
    png: Buffer;
    width: number;
    height: number;
    created_at: IsoInstant;
  };
  workspace_tasks: {
    id: string;
    project_id: string | null;
    title: string;
    status: LegacyStatus;
    position: number;
    version: number;
    created_at: IsoInstant;
    updated_at: IsoInstant;
    deleted_at: IsoInstant | null;
  };
  workspace_task_sources: {
    task_id: string;
    document_id: string;
    block_id: string | null;
    excerpt: string;
    /** Since migration 005. */
    document_title?: string;
  };
}

interface Dates {
  createdAt?: IsoInstant;
  updatedAt?: IsoInstant;
  deletedAt?: IsoInstant | null;
}

interface ItemFields extends Dates {
  projectId?: string | null;
  title?: string;
  version?: number;
  /** Only at migration 005. */
  pinnedAt?: IsoInstant | null;
}

/**
 * Writes rows as the workspace did before migration 005, or, with `at: 5`, as migrations 001 to 005
 * left it (project colour and position, pins, sources with the document's title), with derived text
 * columns computed as the repositories computed them. Each row is a minute after the previous one
 * unless dated.
 */
export function legacyRows(connection: Database, { at = 4 }: { at?: 4 | 5 } = {}) {
  const db = tables<LegacyTables>(connection);
  let clock = Date.parse('2026-10-01T12:00:00.000Z');
  const next = () => {
    clock += 60_000;
    return toIsoInstant(new Date(clock));
  };
  const dates = (fields: Dates) => {
    const createdAt = fields.createdAt ?? next();
    return { created_at: createdAt, updated_at: fields.updatedAt ?? createdAt, deleted_at: fields.deletedAt ?? null };
  };
  const item = (fields: ItemFields, plainText: string) => {
    const title = fields.title ?? 'Sem título';
    return {
      id: randomUUID(),
      project_id: fields.projectId ?? null,
      title,
      plain_text: plainText,
      search_text: searchText(`${title}\n${plainText}`),
      format_version: 1,
      version: fields.version ?? 1,
      ...dates(fields),
      ...(at === 5 ? { pinned_at: fields.pinnedAt ?? null } : {}),
    };
  };

  return {
    async project(
      name: string,
      fields: Dates & { archivedAt?: IsoInstant | null; version?: number; position?: number } = {},
    ) {
      const { created_at, updated_at } = dates(fields);
      const row = {
        id: randomUUID(),
        name,
        version: fields.version ?? 1,
        archived_at: fields.archivedAt ?? null,
        created_at,
        updated_at,
        ...(at === 5 ? { color: 'violet' as const, position: fields.position ?? 0 } : {}),
      };
      await db.insertInto('workspace_projects').values(row).execute();
      return row;
    },
    async document(fields: ItemFields & { content?: DocumentBlock[] } = {}) {
      const content = fields.content ?? [];
      const row = { ...item(fields, documentPlainText(content)), content: JSON.stringify(content) };
      await db.insertInto('workspace_documents').values(row).execute();
      return row;
    },
    async canvas(fields: ItemFields & { scene?: CanvasScene } = {}) {
      const scene = fields.scene ?? emptyCanvasScene();
      const row = { ...item(fields, canvasPlainText(scene)), scene: JSON.stringify(scene) };
      await db.insertInto('workspace_canvases').values(row).execute();
      return row;
    },
    /** A preview of the canvas, with the scene fingerprint only when given, as migration 004 added it. */
    async preview(canvasId: string, png: Uint8Array, fields: { sceneVersion?: number; fingerprint?: string } = {}) {
      const row = {
        canvas_id: canvasId,
        scene_version: fields.sceneVersion ?? 1,
        ...(fields.fingerprint === undefined ? {} : { scene_fingerprint: fields.fingerprint }),
        png: Buffer.from(png),
        width: 10,
        height: 10,
        created_at: next(),
      };
      await db.insertInto('workspace_canvas_previews').values(row).execute();
      return row;
    },
    async task(fields: Omit<ItemFields, 'title'> & { title: string; status?: LegacyStatus; position?: number }) {
      const row = {
        id: randomUUID(),
        project_id: fields.projectId ?? null,
        title: fields.title,
        status: fields.status ?? 'todo',
        position: fields.position ?? 0,
        version: fields.version ?? 1,
        ...dates(fields),
      };
      await db.insertInto('workspace_tasks').values(row).execute();
      return row;
    },
    async source(taskId: string, documentId: string, excerpt: string, blockId: string | null = null) {
      const documentTitle = async () =>
        (
          await db
            .selectFrom('workspace_documents')
            .select('title')
            .where('id', '=', documentId)
            .executeTakeFirstOrThrow()
        ).title;
      const row = {
        task_id: taskId,
        document_id: documentId,
        block_id: blockId,
        excerpt,
        ...(at === 5 ? { document_title: await documentTitle() } : {}),
      };
      await db.insertInto('workspace_task_sources').values(row).execute();
      return row;
    },
  };
}
