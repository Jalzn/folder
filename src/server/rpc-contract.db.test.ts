import { createHash, randomUUID } from 'node:crypto';
import { type AnyProcedure, isProcedure } from '@orpc/server';
import { createAccessTokens } from '@tinyfold/auth';
import { createWorkspace } from '@tinyfold/workspace';
import { emptyCanvasScene } from '@tinyfold/workspace/domain';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createRouter } from './router.js';
import { useAppFixture } from './testing/app.js';

/*
 * The RPC contract and the write fingerprints, pinned before stage 12 moves the code behind them:
 * - the procedures and the JSON Schema of each input, as a tab or a script sends it;
 * - the operation name each write keeps its request records under. It goes into the fingerprint in
 *   core_mutations, so renaming it, or changing the input a write fingerprints, turns a retry within
 *   30 days into REQUEST_REUSED.
 */

const origin = 'http://localhost:5170';
const password = 'tinyfold-contract-password';
const appFixture = useAppFixture(password, origin);

async function fixture() {
  const { db, auth, browser } = await appFixture({ web: false });
  const { client } = browser();
  await client.auth.login({ password });
  return {
    db,
    router: createRouter(auth, createAccessTokens(db), createWorkspace(db, { timeZone: () => auth.timeZone() }).router),
    client,
  };
}

/** Every procedure of the router, by its dotted path, in path order. */
const procedures = (router: object, prefix: string[] = []): [string, AnyProcedure][] =>
  Object.entries(router)
    .flatMap(([key, value]): [string, AnyProcedure][] =>
      isProcedure(value) ? [[[...prefix, key].join('.'), value]] : procedures(value as object, [...prefix, key]),
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const inputSchema = (procedure: AnyProcedure) => procedure['~orpc'].inputSchema as z.ZodType | undefined;
/**
 * An input's JSON Schema from both sides: what a client may send (strict objects refuse other keys)
 * and what the use case gets after the transforms, with the checks of piped fields such as titles.
 * Refinements have no JSON Schema: the tests of each rule keep them.
 */
function jsonSchemas(schema: z.ZodType | undefined) {
  if (!schema) return null;
  const { $schema: _sent, ...sent } = z.toJSONSchema(schema, { io: 'input' });
  const { $schema: _parsed, ...parsed } = z.toJSONSchema(schema, { io: 'output', unrepresentable: 'any' });
  return { sent, parsed };
}
/** A write is a procedure whose input carries a request ID. */
const isWrite = (procedure: AnyProcedure) =>
  Object.hasOwn(jsonSchemas(inputSchema(procedure))?.sent.properties ?? {}, 'requestId');

/** core/infra/write.ts's fingerprint, written again here so that a change to it shows. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
const fingerprint = (operation: string, input: unknown) =>
  createHash('sha256').update(canonical({ operation, input })).digest('hex');

const id = () => randomUUID();
const edit = () => ({ requestId: id(), id: id(), expectedVersion: 1 });
const instant = '2026-11-02T12:00:00.000Z';

/**
 * A valid input for each write, by procedure, with a variant for each item type a write takes. The
 * IDs need not exist: a replayed request answers before the write reads anything.
 */
const writes: Record<string, Record<string, unknown>[]> = {
  'workspace.createProject': [{ requestId: id(), name: 'Projeto', color: 'violet' }],
  'workspace.updateProject': [{ ...edit(), name: 'Projeto', color: 'ochre', archived: false }],
  'workspace.moveProject': [{ requestId: id(), id: id(), beforeProjectId: null }],
  'workspace.createFolder': [{ requestId: id(), projectId: id(), name: 'Pasta' }],
  'workspace.renameFolder': [{ ...edit(), name: 'Pasta' }],
  'workspace.moveFolder': [{ requestId: id(), id: id(), beforeFolderId: id() }],
  'workspace.deleteFolder': [{ ...edit(), withItems: true }],
  'workspace.restoreFolder': [
    {
      ...edit(),
      moved: [{ type: 'document', id: id(), pinnedAt: instant, keptPin: true }],
      trashed: [{ type: 'drawing', id: id(), version: 2, pinnedAt: null }],
    },
  ],
  'workspace.createDocument': [{ requestId: id(), title: 'Documento', projectId: id(), folderId: id(), content: [] }],
  'workspace.saveDocument': [{ ...edit(), title: 'Documento', content: [] }],
  'workspace.deleteDocument': [edit()],
  'workspace.restoreDocument': [edit()],
  'workspace.createCanvas': [
    { requestId: id(), title: 'Desenho', projectId: id(), folderId: id(), scene: emptyCanvasScene() },
  ],
  'workspace.saveCanvas': [{ ...edit(), title: 'Desenho', scene: emptyCanvasScene() }],
  'workspace.deleteCanvas': [edit()],
  'workspace.restoreCanvas': [edit()],
  'workspace.createTask': [
    { requestId: id(), title: 'Tarefa', projectId: id(), columnId: id(), dueOn: '2026-11-03', labelIds: [id()] },
    { requestId: id(), title: 'Tarefa', source: { documentId: id(), blockId: 'bloco', excerpt: 'Trecho' } },
  ],
  'workspace.updateTask': [{ ...edit(), projectId: id(), columnId: id(), dueOn: null, labelIds: [] }],
  'workspace.saveTaskText': [{ requestId: id(), id: id(), expectedTextVersion: 1, title: 'Tarefa', description: [] }],
  'workspace.deleteTask': [edit()],
  'workspace.restoreTask': [edit()],
  'workspace.moveTask': [{ ...edit(), expectedRevision: 0, columnId: id(), beforeTaskId: null }],
  'workspace.createColumn': [{ requestId: id(), name: 'Coluna' }],
  'workspace.renameColumn': [{ ...edit(), name: 'Coluna' }],
  'workspace.moveColumn': [{ requestId: id(), id: id(), beforeColumnId: null }],
  'workspace.deleteColumn': [{ ...edit(), destinationId: id() }],
  'workspace.restoreColumn': [{ ...edit(), moved: [{ id: id(), version: 2, position: 0, completedAt: null }] }],
  'workspace.setDoneColumn': [{ requestId: id(), id: id(), restore: [{ id: id(), completedAt: instant }] }],
  'workspace.createLabel': [{ requestId: id(), name: 'Etiqueta', color: 'blue' }],
  'workspace.updateLabel': [{ ...edit(), name: 'Etiqueta', color: 'teal' }],
  'workspace.deleteLabel': [edit()],
  'workspace.restoreLabel': [edit()],
  'workspace.purgeDocument': [edit()],
  'workspace.purgeCanvas': [edit()],
  'workspace.purgeTask': [edit()],
  'workspace.emptyTrash': [
    {
      requestId: id(),
      projectId: id(),
      items: [
        { type: 'document', id: id(), version: 2 },
        { type: 'drawing', id: id(), version: 2 },
        { type: 'task', id: id(), version: 2 },
      ],
    },
  ],
  'workspace.moveItem': [
    { requestId: id(), type: 'document', id: id(), projectId: id(), folderId: null },
    { requestId: id(), type: 'drawing', id: id(), projectId: id(), expectedVersion: 1 },
  ],
};

describe('RPC contract', () => {
  it('keeps the procedures and the JSON Schema of each input', async () => {
    const { router } = await fixture();
    const inputs = Object.fromEntries(
      procedures(router).map(([path, procedure]) => [path, jsonSchemas(inputSchema(procedure))]),
    );
    await expect(`${JSON.stringify(inputs, null, 2)}\n`).toMatchFileSnapshot('./contract/rpc-inputs.snap');
  });

  it('keeps each write under its own operation name, with the same fingerprint', async () => {
    const { db, router, client } = await fixture();
    const all = procedures(router);
    const writeProcedures = all.filter(([, procedure]) => isWrite(procedure)).map(([path]) => path);
    expect(Object.keys(writes).sort()).toEqual(writeProcedures);
    for (const [path, procedure] of all.filter(([path]) => path in writes)) {
      const operation = path;
      for (const input of writes[path] ?? []) {
        // The record a first answer would have left: a replay answers it without running the write.
        const parsed = (inputSchema(procedure) as z.ZodType).parse(input);
        const answer = { replayed: operation };
        await sql`insert into core_mutations (request_id, operation, fingerprint, response, created_at)
          values (${input.requestId}, ${operation}, ${fingerprint(operation, parsed)}, ${JSON.stringify(answer)}, ${instant})`.execute(
          db,
        );
        let call: unknown = client;
        for (const part of path.split('.')) call = (call as Record<string, unknown>)[part];
        await expect((call as (input: unknown) => Promise<unknown>)(input), path).resolves.toEqual(answer);
      }
    }
    await expect(`${writeProcedures.join('\n')}\n`).toMatchFileSnapshot('./contract/write-operations.snap');
  });
});
