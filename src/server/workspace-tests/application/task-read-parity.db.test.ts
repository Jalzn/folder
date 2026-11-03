import { afterEach, expect, it } from 'vitest';
import { check, paragraph, request } from '../../testing/workspace/builders.js';
import { useWorkspaceDb } from '../../testing/workspace/database.js';
import { composeWorkspace } from '../../workspace/index.js';

const workspace = useWorkspaceDb({ start: '2026-11-03T12:00:00Z' });
let composed: ReturnType<typeof composeWorkspace> | undefined;
afterEach(() => composed?.dispose());
it('keeps labels, checklist, column and source consistent in the board, drawer and agent reads', async () => {
  composed = composeWorkspace(workspace.db);
  const readTask = composed.modules.board.queries.tasks.readForAgent;
  const s = workspace.service;
  const project = await s.createProject({ ...request(), name: 'Leituras' });
  const document = await s.createDocument({
    ...request(),
    projectId: project.id,
    title: 'Origem',
    content: [paragraph('Trecho de origem.', 'source')],
  });
  const z = await s.createLabel({ ...request(), name: 'Zebra', color: 'blue' });
  const a = await s.createLabel({ ...request(), name: 'Ação', color: 'teal' });
  const task = await s.createTask({
    ...request(),
    projectId: project.id,
    title: 'Conferir',
    dueOn: '2026-11-01',
    labelIds: [z.id, a.id],
    description: [check('Feito', true), check('Falta', false)],
    source: {
      documentId: document.id,
      blockId: 'source',
      excerpt: 'Trecho de origem.',
      expectedVersion: document.version,
    },
  });
  const board = (await s.projectBoard({ projectId: project.id })).tasks.find((value) => value.id === task.id);
  const drawer = await s.getTask({ id: task.id });
  const agent = (await readTask({ id: task.id })).task;
  expect(board).toMatchObject({
    labelIds: [a.id, z.id],
    checklist: { done: 1, total: 2 },
    dueOn: '2026-11-01',
    source: { documentId: document.id, documentTitle: 'Origem', available: true },
  });
  expect(drawer).toMatchObject({
    ...board,
    description: expect.arrayContaining([
      expect.objectContaining({ type: 'checkListItem', props: { checked: true } }),
      expect.objectContaining({ type: 'checkListItem', props: { checked: false } }),
    ]),
  });
  expect(agent).toMatchObject({
    id: task.id,
    labels: [{ id: a.id }, { id: z.id }],
    checklist: board?.checklist,
    column: { id: board?.columnId },
    dueOn: board?.dueOn,
    source: drawer.source,
  });
  await s.deleteDocument({ ...request(), id: document.id, expectedVersion: document.version });
  // The owner keeps the origin title; agent reads hide the title of a trashed source.
  expect((await s.getTask({ id: task.id })).source).toMatchObject({ available: false, documentTitle: 'Origem' });
  expect((await readTask({ id: task.id })).task.source).toMatchObject({
    available: false,
    documentTitle: null,
  });
});
