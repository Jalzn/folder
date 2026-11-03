import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { embedIds, excerptPresent } from '@tinyfold/rich-text/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type Database, migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/server/workspace/index.js';
import { SAMPLE_DOCUMENTS, sampleScenes, TOKEN_BLOCK, TOKEN_EXCERPT } from './sample-content.js';
import { seedSample } from './seed-sample.js';

// What `pnpm seed:sample` stores: the content of sample-content.ts, each item at version 1, and the
// embeds and origin of the brief resolved as they should be.
describe('the stored sample', () => {
  let directory: string;
  let db: Database;
  let workspace: ReturnType<typeof createWorkspaceService>;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-seed-sample-'));
    db = createDatabase(join(directory, 'tinyfold.sqlite'));
    await migrate(db, modules);
    await seedSample(db, { grande: false });
    workspace = createWorkspaceService(db);
  });
  afterAll(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  const everything = async () => {
    const projects = await workspace.listProjects({ includeArchived: true });
    const documents = [];
    const drawings = [];
    for (const project of projects) {
      documents.push(...(await workspace.listDocuments({ projectId: project.id })));
      drawings.push(...(await workspace.listCanvases({ projectId: project.id })));
    }
    return { documents, drawings };
  };

  it('stores each document as the content module writes it, at version 1', async () => {
    const { documents } = await everything();
    expect(documents.map((document) => document.title).sort()).toEqual(
      [...Object.keys(SAMPLE_DOCUMENTS), 'Visão do produto'].sort(),
    );
    for (const summary of documents) {
      const document = await workspace.getDocument({ id: summary.id });
      expect(document.version, document.title).toBe(1);
      if (document.title in SAMPLE_DOCUMENTS)
        expect(document.content, document.title).toEqual(
          SAMPLE_DOCUMENTS[document.title as keyof typeof SAMPLE_DOCUMENTS],
        );
    }
  });

  it('stores each drawing as the content module builds it, at version 1', async () => {
    const { drawings } = await everything();
    const scenes = sampleScenes();
    expect(drawings.map((drawing) => drawing.title).sort()).toEqual(Object.keys(scenes).sort());
    // Only the time of building differs.
    const withoutTime = (elements: readonly object[]) =>
      elements.map(({ updated: _, ...element }: { updated?: unknown }) => element);
    for (const summary of drawings) {
      const drawing = await workspace.getCanvas({ id: summary.id });
      expect(drawing.version, drawing.title).toBe(1);
      expect(withoutTime(drawing.scene.elements), drawing.title).toEqual(
        withoutTime(scenes[drawing.title as keyof typeof scenes].elements),
      );
    }
  });

  it("resolves the vision's embeds and keeps the token task's origin in its paragraph", async () => {
    const { documents } = await everything();
    const vision = await workspace.getDocument({
      id: documents.find((item) => item.title === 'Visão do produto')?.id ?? '',
    });
    const { tasks, drawings } = await workspace.resolveEmbeds(embedIds(vision.content));
    expect(tasks.map((task) => [task.state, 'title' in task ? task.title : null])).toEqual([
      ['live', 'Gerar token pessoal no Perfil'],
      ['trashed', 'Revisar textos do onboarding'],
    ]);
    expect(drawings.map((drawing) => [drawing.state, 'title' in drawing ? drawing.title : null])).toEqual([
      ['live', 'Navegação com projeto no centro'],
    ]);
    const mcp = await workspace.getDocument({
      id: documents.find((item) => item.title === 'MCP somente leitura')?.id ?? '',
    });
    const [token] = (await workspace.listTasks({ documentId: mcp.id })).tasks;
    expect(token).toMatchObject({
      title: 'Gerar token pessoal no Perfil',
      source: { blockId: TOKEN_BLOCK.id, excerpt: TOKEN_EXCERPT, available: true, blockAvailable: true },
    });
    expect(excerptPresent(mcp, TOKEN_BLOCK.id, TOKEN_EXCERPT)).toBe(true);
  });
});
