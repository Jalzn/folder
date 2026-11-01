import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, vi } from 'vitest';
import type { DocumentBlock, Project } from '../domain/models.js';
import { createWorkspaceTools } from '../infra/mcp/index.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from './projects.js';

export const request = () => ({ requestId: randomUUID() });
export const missingId = '00000000-0000-4000-8000-000000000000';

export const paragraph = (text: string, id?: string): DocumentBlock => ({
  ...(id ? { id } : {}),
  type: 'paragraph',
  content: [{ type: 'text', text, styles: {} }],
});

/**
 * The agent read tools over a fresh temporary database for each test, with the workspace service
 * to arrange data and an active project for its items. Every write advances the clock by a second,
 * so recency order is explicit.
 */
export function useAgentTools() {
  let directory = '';
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let tools: ReturnType<typeof createWorkspaceTools>;
  let project: Project;
  const logError = vi.fn();

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-tools-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    let now = new Date('2026-10-31T12:00:00Z');
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    tools = createWorkspaceTools(db, { logError });
    project = await testProject(service);
    logError.mockClear();
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  /** The whole tool result, as the MCP endpoint receives it. */
  async function run(name: string, input: Record<string, unknown>) {
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Unknown tool ${name}`);
    return tool.handler(tool.inputSchema.parse(input));
  }

  /** The first text of a tool result, and whether it is an error. */
  async function call(name: string, input: Record<string, unknown>) {
    const result = await run(name, input);
    const [first] = result.content;
    return { isError: result.isError === true, text: first?.type === 'text' ? first.text : '' };
  }

  return {
    get service() {
      return service;
    },
    /** The database under the tools, for rows the service no longer writes. */
    get db() {
      return db;
    },
    /** The project each test's items go to, unless the test makes its own. */
    get project() {
      return project;
    },
    logError,
    run,
    call,
    json: async <T = Record<string, unknown>>(name: string, input: Record<string, unknown> = {}) =>
      JSON.parse((await call(name, input)).text) as T,
    /** Closes the database under the tools, so their next query fails. */
    async closeDatabase() {
      await db.destroy();
      // A fresh handle for afterEach to close; the tools keep the closed one.
      db = createDatabase(join(directory, 'test.sqlite'));
    },
  };
}
