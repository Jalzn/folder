import { randomUUID } from 'node:crypto';
import type { Database } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../domain/models.js';
import type { WorkspaceService } from '../infra/service.js';
import { request } from '../testing/builders.js';
import { useWorkspaceDb } from '../testing/database.js';
import { testFolder } from '../testing/folders.js';
import { testProject } from '../testing/projects.js';

describe('folders', () => {
  const workspace = useWorkspaceDb({ prefix: 'tinyfold-folders-', start: '2026-10-31T12:00:00Z' });
  let db: Database;
  let service: WorkspaceService;
  let project: Project;
  beforeEach(async () => {
    ({ db, service } = workspace);
    project = await testProject(service);
  });

  /** The project's active folders as [name, position, version], in order. */
  const folders = async (projectId = project.id) =>
    (
      await sql<{ name: string; position: number; version: number }>`select name, position, version
        from workspace_folders where project_id = ${projectId} and deleted_at is null order by position`.execute(db)
    ).rows.map((row) => [row.name, row.position, row.version]);
  const itemRow = async (id: string) =>
    (
      await sql<Record<string, unknown>>`select id, folder_id, version, updated_at, deleted_at, pinned_at
        from workspace_documents where id = ${id} union all select id, folder_id, version, updated_at, deleted_at, pinned_at
        from workspace_canvases where id = ${id}`.execute(db)
    ).rows[0];
  const newDocument = (folderId?: string, title = 'Documento') =>
    service.createDocument({ ...request(), projectId: project.id, title, ...(folderId ? { folderId } : {}) });
  const newCanvas = (folderId?: string) =>
    service.createCanvas({ ...request(), projectId: project.id, ...(folderId ? { folderId } : {}) });
  const pinned = (id: string, at: string) =>
    sql`update workspace_documents set pinned_at = ${at} where id = ${id}`.execute(db);

  describe('createFolder', () => {
    it('puts a new folder at the top, with the name tidied, and moves the others down', async () => {
      expect(await service.createFolder({ ...request(), projectId: project.id, name: '  MCP \n ' })).toEqual({
        id: expect.any(String),
        version: 1,
        position: 0,
      });
      await testFolder(service, project.id, 'Arquitetura');
      expect(await folders()).toEqual([
        ['Arquitetura', 0, 1],
        ['MCP', 1, 1],
      ]);
    });

    it('refuses an empty or long name, a repeated one in another case or accent, and a 201st folder', async () => {
      const create = (name: string, projectId = project.id) => service.createFolder({ ...request(), projectId, name });
      for (const name of [' \n ', '́'])
        await expect(create(name)).rejects.toMatchObject({ code: 'VALIDATION', message: 'Dê um nome à pasta.' });
      await expect(create('x'.repeat(101))).rejects.toMatchObject({ code: 'VALIDATION' });
      await create('Ações');
      await expect(create('ACOES')).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Já existe uma pasta Ações.',
      });
      // Another project may have the same name.
      await create('Ações', (await testProject(service, 'Outro')).id);
      for (let index = 1; index < 200; index += 1) await create(`Pasta ${index}`);
      await expect(create('Uma a mais')).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Máximo de 200 pastas neste projeto.',
      });
    });

    it('refuses a name that draws nothing, a look-alike of another and control characters', async () => {
      const create = (name: string) => service.createFolder({ ...request(), projectId: project.id, name });
      for (const name of ['\u{200B}', '\u{3164}', '\u{00AD}\u{2060}', '\u{200D}'])
        await expect(create(name)).rejects.toMatchObject({ code: 'VALIDATION', message: 'Dê um nome à pasta.' });
      await create('Ações');
      // Default ignorable code points, assigned or not, and unassigned ones draw nothing either.
      for (const name of [
        'Ａｃｏｅｓ',
        'Aç\u{200B}ões',
        'Aç\u{00AD}ões',
        'Ações\u{2060}',
        'Ações\u{034F}',
        'Ações\u{E0080}',
        'Ações\u{FFF0}',
        'Ações\u{0378}',
        'Ações\u{FFF9}',
        'Ações\u{13430}',
      ])
        await expect(create(name)).rejects.toMatchObject({
          code: 'DOMAIN_RULE',
          message: 'Já existe uma pasta Ações.',
        });
      // A NUL ends the text for SQLite's length(): refused before it reaches the CHECK.
      const controls = { code: 'VALIDATION', message: 'Use só letras, números, espaços e símbolos no nome da pasta.' };
      for (const name of ['\u{0000}x', 'a\u{0000}b', '\u{0001}', 'a\u{007F}', 'a\u{0085}'])
        await expect(create(name)).rejects.toMatchObject(controls);
      const mcp = await create('M\u{200B}CP\tdo\nprojeto');
      await expect(
        service.renameFolder({ ...request(), id: mcp.id, expectedVersion: 1, name: '\u{0000}MCP' }),
      ).rejects.toMatchObject(controls);
      expect(
        (
          await sql<{ name: string; name_key: string }>`select name, name_key from workspace_folders
          order by position`.execute(db)
        ).rows,
      ).toEqual([
        { name: 'MCP do projeto', name_key: 'mcp do projeto' },
        { name: 'Ações', name_key: 'acoes' },
      ]);
    });

    it('refuses an archived or missing project', async () => {
      await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
      await expect(service.createFolder({ ...request(), projectId: project.id, name: 'MCP' })).rejects.toMatchObject({
        code: 'VALIDATION',
        message: 'Desarquive o projeto antes de mudar as pastas.',
      });
      await expect(service.createFolder({ ...request(), projectId: randomUUID(), name: 'MCP' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('answers a repeated request again and keeps one folder out of two simultaneous ones', async () => {
      const input = { ...request(), projectId: project.id, name: 'MCP' };
      const first = await service.createFolder(input);
      expect(await service.createFolder(input)).toEqual(first);
      const results = await Promise.allSettled(
        ['Arquitetura', 'arquitetura'].map((name) =>
          service.createFolder({ ...request(), projectId: project.id, name }),
        ),
      );
      expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect((await folders()).map(([name]) => name)).toHaveLength(2);
    });
  });

  describe('renameFolder', () => {
    it('renames with a new version, keeps its own name in another case and refuses another folder’s', async () => {
      const mcp = await testFolder(service, project.id, 'mcp');
      await testFolder(service, project.id, 'Arquitetura');
      const rename = (name: string, expectedVersion: number) =>
        service.renameFolder({ ...request(), id: mcp.id, expectedVersion, name });
      expect(await rename('MCP', 1)).toEqual({ id: mcp.id, version: 2 });
      await expect(rename('arquitetura', 2)).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Já existe uma pasta Arquitetura.',
      });
      await expect(rename('Leitura', 1)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 2, withItems: false });
      await expect(rename('Leitura', 3)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('moveFolder', () => {
    it('numbers the folders again without a new version, and refuses a folder of another project', async () => {
      const [c, b, a] = [
        await testFolder(service, project.id, 'C'),
        await testFolder(service, project.id, 'B'),
        await testFolder(service, project.id, 'A'),
      ];
      expect(await service.moveFolder({ ...request(), id: a.id, beforeFolderId: null })).toEqual({
        folders: [
          { id: b.id, position: 0 },
          { id: c.id, position: 1 },
          { id: a.id, position: 2 },
        ],
      });
      await service.moveFolder({ ...request(), id: c.id, beforeFolderId: b.id });
      expect(await folders()).toEqual([
        ['C', 0, 1],
        ['B', 1, 1],
        ['A', 2, 1],
      ]);
      const elsewhere = await testFolder(service, (await testProject(service, 'Outro')).id, 'D');
      await expect(service.moveFolder({ ...request(), id: a.id, beforeFolderId: elsewhere.id })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      await expect(service.moveFolder({ ...request(), id: a.id, beforeFolderId: a.id })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
      await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
      await expect(service.moveFolder({ ...request(), id: a.id, beforeFolderId: null })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });
  });

  describe('deleteFolder and restoreFolder', () => {
    it('moves the items to the root without editing them, keeps pins while the root has room, and undoes it', async () => {
      await testFolder(service, project.id, 'Outra');
      const mcp = await testFolder(service, project.id, 'MCP');
      // Seven pins at the root leave room for one of the folder's two.
      for (let index = 0; index < 7; index += 1)
        await pinned((await newDocument()).id, `2026-10-0${index + 1}T00:00:00.000Z`);
      const [first, second] = [await newDocument(mcp.id, 'Primeiro'), await newDocument(mcp.id, 'Segundo')];
      const drawing = await newCanvas(mcp.id);
      await pinned(second.id, '2026-10-20T00:00:00.000Z');
      await pinned(first.id, '2026-10-21T00:00:00.000Z');
      const before = await Promise.all([first, second, drawing].map((item) => itemRow(item.id)));

      const deleted = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: false });
      expect(deleted).toEqual({
        id: mcp.id,
        version: 2,
        moved: [
          { type: 'document', id: second.id, pinnedAt: '2026-10-20T00:00:00.000Z', keptPin: true },
          { type: 'document', id: first.id, pinnedAt: '2026-10-21T00:00:00.000Z', keptPin: false },
          { type: 'drawing', id: drawing.id, pinnedAt: null, keptPin: false },
        ],
        trashed: [],
        unpinned: 1,
        complete: true,
      });
      const after = await Promise.all([first, second, drawing].map((item) => itemRow(item.id)));
      expect(after).toEqual([
        { ...before[0], folder_id: null, pinned_at: null },
        { ...before[1], folder_id: null },
        { ...before[2], folder_id: null },
      ]);
      expect(await folders()).toEqual([['Outra', 0, 1]]);
      // The folder cannot be deleted twice, nor restored at an old version.
      await expect(
        service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 2, withItems: false }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      const undo = { ...request(), id: mcp.id, expectedVersion: 2, moved: deleted.moved, trashed: deleted.trashed };
      expect(await service.restoreFolder(undo)).toEqual({
        id: mcp.id,
        version: 3,
        position: 0,
        restored: 3,
        skipped: 0,
      });
      expect(await service.restoreFolder(undo)).toEqual({
        id: mcp.id,
        version: 3,
        position: 0,
        restored: 3,
        skipped: 0,
      });
      expect(await Promise.all([first, second, drawing].map((item) => itemRow(item.id)))).toEqual(before);
      expect(await folders()).toEqual([
        ['MCP', 0, 3],
        ['Outra', 1, 1],
      ]);
      await expect(service.restoreFolder({ ...undo, ...request() })).rejects.toMatchObject({
        code: 'VERSION_CONFLICT',
      });
      await expect(service.restoreFolder({ ...undo, ...request(), expectedVersion: 3 })).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Esta pasta não foi excluída.',
      });
    });

    it('gives a pin back only to an item that lost it, never to one unpinned since', async () => {
      const mcp = await testFolder(service, project.id, 'MCP');
      for (let index = 0; index < 7; index += 1)
        await pinned((await newDocument()).id, `2026-10-0${index + 1}T00:00:00.000Z`);
      const [kept, lost] = [await newDocument(mcp.id, 'Mantido'), await newDocument(mcp.id, 'Perdido')];
      await pinned(kept.id, '2026-10-20T00:00:00.000Z');
      await pinned(lost.id, '2026-10-21T00:00:00.000Z');
      const deleted = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: false });
      expect(deleted.moved.map((item) => [item.id, item.keptPin])).toEqual([
        [kept.id, true],
        [lost.id, false],
      ]);
      // At the root, the user unpins the item that kept its pin.
      await service.unpinItem({ type: 'document', id: kept.id });

      const undo = { ...request(), id: mcp.id, expectedVersion: 2, moved: deleted.moved, trashed: [] };
      expect(await service.restoreFolder(undo)).toMatchObject({ restored: 2, skipped: 0 });
      expect(await itemRow(kept.id)).toMatchObject({ folder_id: mcp.id, pinned_at: null });
      expect(await itemRow(lost.id)).toMatchObject({ folder_id: mcp.id, pinned_at: '2026-10-21T00:00:00.000Z' });
    });

    it('takes back from the trash only what the deletion trashed, and drops a pin set after it', async () => {
      const deletedAt = async (id: string) =>
        (await sql<{ deleted_at: string }>`select deleted_at from workspace_folders where id = ${id}`.execute(db))
          .rows[0]?.deleted_at ?? '';
      const after = (instant: string) => new Date(Date.parse(instant) + 1).toISOString();
      const mcp = await testFolder(service, project.id, 'MCP');
      const [earlier, withFolder] = [await newDocument(mcp.id, 'Antes'), await newDocument(mcp.id, 'Junto')];
      // Trashed from the folder before the folder: same origin and version, another instant.
      const trashedEarlier = await service.deleteDocument({ ...request(), id: earlier.id, expectedVersion: 1 });
      const deleted = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: true });
      expect(deleted.trashed.map((item) => item.id)).toEqual([withFolder.id]);
      const late = after(await deletedAt(mcp.id));
      const forged = { type: 'document' as const, id: earlier.id, version: trashedEarlier.version, pinnedAt: late };
      expect(
        await service.restoreFolder({
          ...request(),
          id: mcp.id,
          expectedVersion: deleted.version,
          moved: [],
          trashed: [{ type: 'document', id: withFolder.id, version: 2, pinnedAt: late }, forged],
        }),
      ).toMatchObject({ restored: 1, skipped: 1 });
      // A pin later than the deletion is none the deletion answered: the item comes back without it.
      expect(await itemRow(withFolder.id)).toMatchObject({ folder_id: mcp.id, deleted_at: null, pinned_at: null });
      expect(await itemRow(earlier.id)).toMatchObject({ folder_id: mcp.id, deleted_at: expect.any(String) });

      // The same for an item moved to the root; a pin at the deletion's own instant still comes back.
      const arquitetura = await testFolder(service, project.id, 'Arquitetura');
      const [tarde, naHora] = [
        await newDocument(arquitetura.id, 'Tarde'),
        await newDocument(arquitetura.id, 'Na hora'),
      ];
      const toRoot = await service.deleteFolder({
        ...request(),
        id: arquitetura.id,
        expectedVersion: 1,
        withItems: false,
      });
      const instant = await deletedAt(arquitetura.id);
      expect(
        await service.restoreFolder({
          ...request(),
          id: arquitetura.id,
          expectedVersion: toRoot.version,
          moved: [
            { type: 'document', id: tarde.id, pinnedAt: after(instant), keptPin: false },
            { type: 'document', id: naHora.id, pinnedAt: instant, keptPin: false },
          ],
          trashed: [],
        }),
      ).toMatchObject({ restored: 2, skipped: 0 });
      expect(await itemRow(tarde.id)).toMatchObject({ folder_id: arquitetura.id, pinned_at: null });
      expect(await itemRow(naHora.id)).toMatchObject({ folder_id: arquitetura.id, pinned_at: instant });
    });

    it('trusts the moved list, which no stored origin can check: a root item listed by mistake goes in', async () => {
      const mcp = await testFolder(service, project.id, 'MCP');
      const alwaysAtRoot = await newDocument();
      const deleted = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: false });
      const forged = { type: 'document' as const, id: alwaysAtRoot.id, pinnedAt: '2020-01-01T00:00:00.000Z' };
      expect(
        await service.restoreFolder({
          ...request(),
          id: mcp.id,
          expectedVersion: deleted.version,
          moved: [{ ...forged, keptPin: false }],
          trashed: [],
        }),
      ).toMatchObject({ restored: 1, skipped: 0 });
      expect(await itemRow(alwaysAtRoot.id)).toMatchObject({ folder_id: mcp.id, pinned_at: forged.pinnedAt });
    });

    it('sends the items to the trash with the folder, keeping it as their origin, and undoes it', async () => {
      const mcp = await testFolder(service, project.id, 'MCP');
      const document = await newDocument(mcp.id);
      const drawing = await newCanvas(mcp.id);
      await pinned(document.id, '2026-10-20T00:00:00.000Z');

      const deleted = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: true });
      expect(deleted).toMatchObject({
        moved: [],
        trashed: [
          { type: 'document', id: document.id, version: 2, pinnedAt: '2026-10-20T00:00:00.000Z' },
          { type: 'drawing', id: drawing.id, version: 2, pinnedAt: null },
        ],
        unpinned: 0,
        complete: true,
      });
      const folderDeletedAt = (
        await sql<{ deleted_at: string }>`select deleted_at from workspace_folders where id = ${mcp.id}`.execute(db)
      ).rows[0]?.deleted_at;
      expect(await itemRow(document.id)).toMatchObject({
        folder_id: mcp.id,
        version: 2,
        pinned_at: null,
        deleted_at: folderDeletedAt,
      });
      expect((await service.listTrash({ projectId: project.id })).items.map((item) => item.id).sort()).toEqual(
        [document.id, drawing.id].sort(),
      );

      expect(
        await service.restoreFolder({
          ...request(),
          id: mcp.id,
          expectedVersion: 2,
          moved: deleted.moved,
          trashed: deleted.trashed,
        }),
      ).toMatchObject({ restored: 2, skipped: 0 });
      expect(await itemRow(document.id)).toMatchObject({
        folder_id: mcp.id,
        version: 3,
        deleted_at: null,
        pinned_at: '2026-10-20T00:00:00.000Z',
      });
      expect((await service.listTrash({ projectId: project.id })).items).toEqual([]);
    });

    it('skips what changed since the deletion, and refuses a name another folder took', async () => {
      const mcp = await testFolder(service, project.id, 'MCP');
      const [stays, refiled, movedAway] = [
        await newDocument(mcp.id),
        await newDocument(mcp.id),
        await newDocument(mcp.id),
      ];
      const [restoredElsewhere, editedInTrash] = [await newCanvas(mcp.id), await newDocument(mcp.id)];
      const other = await testProject(service, 'Outro');

      const toRoot = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: false });
      const elsewhere = await testFolder(service, project.id, 'Outra');
      await sql`update workspace_documents set folder_id = ${elsewhere.id} where id = ${refiled.id}`.execute(db);
      await service.moveItem({
        ...request(),
        type: 'document',
        id: movedAway.id,
        projectId: other.id,
        expectedVersion: 1,
      });
      // A trashed item restored, or changed in the trash, since the deletion is no longer as listed.
      const trash = async (id: string, type: 'document' | 'drawing') =>
        type === 'document'
          ? service.deleteDocument({ ...request(), id, expectedVersion: 1 })
          : service.deleteCanvas({ ...request(), id, expectedVersion: 1 });
      const [drawingInTrash, documentInTrash] = [
        await trash(restoredElsewhere.id, 'drawing'),
        await trash(editedInTrash.id, 'document'),
      ];
      await service.restoreCanvas({ ...request(), id: restoredElsewhere.id, expectedVersion: drawingInTrash.version });
      await sql`update workspace_documents set version = version + 1 where id = ${editedInTrash.id}`.execute(db);

      const taken = await testFolder(service, project.id, 'mcp');
      const undo = {
        ...request(),
        id: mcp.id,
        expectedVersion: 2,
        moved: toRoot.moved.filter((item) => item.id !== restoredElsewhere.id && item.id !== editedInTrash.id),
        trashed: [
          { type: 'drawing' as const, id: restoredElsewhere.id, version: drawingInTrash.version, pinnedAt: null },
          { type: 'document' as const, id: editedInTrash.id, version: documentInTrash.version, pinnedAt: null },
        ],
      };
      await expect(service.restoreFolder(undo)).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Já existe uma pasta mcp. Renomeie-a antes de desfazer.',
      });
      await service.renameFolder({ ...request(), id: taken.id, expectedVersion: 1, name: 'Nova' });
      expect(await service.restoreFolder({ ...undo, ...request() })).toEqual({
        id: mcp.id,
        version: 3,
        // Back where it was, before the two folders created since.
        position: 0,
        restored: 1,
        skipped: 4,
      });
      expect((await itemRow(stays.id))?.folder_id).toBe(mcp.id);
      expect((await itemRow(refiled.id))?.folder_id).toBe(elsewhere.id);
      expect((await itemRow(restoredElsewhere.id))?.folder_id).toBeNull();
    });

    it('lists at most 1,000 items, says so, and still moves them all', async () => {
      const big = await testFolder(service, project.id, 'Grande');
      await sql`insert into workspace_documents (id, project_id, title, content, plain_text, search_text, format_version,
        version, created_at, updated_at, folder_id)
        select lower(hex(randomblob(16))), ${project.id}, 'x', '[]', '', 'x', 1, 1, 'a', 'a', ${big.id}
        from (with recursive n(i) as (select 1 union all select i + 1 from n where i < 1001) select i from n)`.execute(
        db,
      );
      const deleted = await service.deleteFolder({ ...request(), id: big.id, expectedVersion: 1, withItems: false });
      expect([deleted.moved.length, deleted.complete]).toEqual([1_000, false]);
      expect(
        (
          await sql<{
            count: number;
          }>`select count(*) as count from workspace_documents where folder_id is null`.execute(db)
        ).rows[0]?.count,
      ).toBe(1_001);
    });

    it('refuses to change the folders of an archived project', async () => {
      const mcp = await testFolder(service, project.id, 'MCP');
      const deleted = await service.deleteFolder({ ...request(), id: mcp.id, expectedVersion: 1, withItems: false });
      const kept = await testFolder(service, project.id, 'Arquitetura');
      await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
      const archived = { code: 'VALIDATION', message: 'Desarquive o projeto antes de mudar as pastas.' };
      await expect(
        service.renameFolder({ ...request(), id: kept.id, expectedVersion: 1, name: 'Outro' }),
      ).rejects.toMatchObject(archived);
      await expect(
        service.deleteFolder({ ...request(), id: kept.id, expectedVersion: 1, withItems: false }),
      ).rejects.toMatchObject(archived);
      await expect(
        service.restoreFolder({ ...request(), id: mcp.id, expectedVersion: deleted.version, moved: [], trashed: [] }),
      ).rejects.toMatchObject(archived);
    });
  });

  describe('listFolders', () => {
    it('lists the active folders by project and position, with their live items counted', async () => {
      const other = await testProject(service, 'Outro');
      const [b, a] = [await testFolder(service, project.id, 'B'), await testFolder(service, project.id, 'A')];
      const gone = await testFolder(service, project.id, 'Excluída');
      await service.deleteFolder({ ...request(), id: gone.id, expectedVersion: 1, withItems: false });
      const elsewhere = await testFolder(service, other.id, 'C');
      await newDocument(a.id);
      await newCanvas(a.id);
      const trashed = await newDocument(a.id);
      await service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: 1 });
      const summary = (id: string, projectId: string, name: string, position: number, items: number) => ({
        id,
        projectId,
        name,
        position,
        version: 1,
        items,
      });
      expect(await service.listFolders({ projectId: project.id })).toEqual({
        folders: [summary(a.id, project.id, 'A', 0, 2), summary(b.id, project.id, 'B', 1, 0)],
      });
      expect((await service.listFolders({})).folders.map((folder) => folder.id)).toEqual([a.id, b.id, elsewhere.id]);
      await expect(service.listFolders({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
