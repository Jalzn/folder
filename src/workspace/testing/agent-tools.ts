import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, vi } from 'vitest';
import type { Project } from '../domain/project-models.js';
import { createWorkspaceTools } from '../infra/mcp/index.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from './projects.js';

export { paragraph, request } from './builders.js';
export const missingId = '00000000-0000-4000-8000-000000000000';

/**
 * The agent read tools over a fresh temporary database for each test, with the workspace service
 * to arrange data and an active project for its items. Every write advances the clock by a second,
 * so recency order is explicit. The clock starts at noon UTC on 2026-10-31, and the owner's time zone
 * is UTC until a test sets another.
 */
export function useAgentTools() {
  let directory = '';
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let tools: ReturnType<typeof createWorkspaceTools>;
  let project: Project;
  let now = new Date(0);
  let timeZone = 'UTC';
  const logError = vi.fn();

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-tools-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    now = new Date('2026-10-31T12:00:00Z');
    timeZone = 'UTC';
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    tools = createWorkspaceTools(db, { logError, clock: () => now, timeZone: async () => timeZone });
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
    /** The tools themselves, for their names, descriptions and schemas. */
    get tools() {
      return tools;
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
    /** The owner's time zone the tools read dates in. */
    setTimeZone(zone: string) {
      timeZone = zone;
    },
    /** Moves the clock, which the next write advances by a second again. */
    setNow(instant: string) {
      now = new Date(instant);
    },
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
