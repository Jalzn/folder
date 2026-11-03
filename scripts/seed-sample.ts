/**
 * Fills a temporary database with the sample data of docs/interface/brief.md, filed in the folders of
 * docs/interface/pastas.md §5, for visual checks and screenshots, never for production. The board has
 * the brief's columns, labels, due dates and the prototype's descriptions, and the brief's items
 * without a project live in Geral, as migration 005 left them. Due dates and completions count from
 * the day the seed runs, in UTC, as the brief's count from October 30th. The scenes are built here,
 * since the test helpers of the testing/ folders stay out of runtime code.
 *
 *   DATABASE_PATH=/tmp/tinyfold-10/tinyfold.sqlite pnpm seed:sample
 *   DATABASE_PATH=/tmp/tinyfold-10/grande.sqlite pnpm seed:sample --grande
 *
 * `--grande` takes Tinyfold to 55 items in four folders, like the prototype's "Simular projeto grande":
 * Produto 11, MCP 12, Arquitetura 18, Operação 8 and 5 loose at the root, besides the pinned vision.
 * It also adds 60 tasks completed 15 to 120 days before, for the done column's footer and the pages of
 * Concluídas.
 *
 * Writes only inside the system's temporary folders, to a new file or an empty database: before
 * migrating anything, it refuses any other target (see assertSeedTarget), the main database
 * (data/tinyfold.sqlite) and the production one (/data/tinyfold.sqlite) included.
 */
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { todayIn } from '../src/core/domain/index.js';
import { createDatabase, type Database, migrate } from '../src/core/infra/index.js';
import { readConfig } from '../src/server/config.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/server/workspace/index.js';
import { seed } from './sample-seed.js';
import { assertSeedTarget, temporaryRoots } from './seed-target.js';

/**
 * Spreads the sample's writes over the last `days`, an hour and a half apart, so recency orders them
 * as written and the interface shows plausible dates. It never passes the current time.
 */
function sampleClock(days: number) {
  const step = 90 * 60_000;
  let at = Date.now() - days * 24 * 60 * 60_000;
  return () => {
    at = Math.min(at + step, Date.now());
    return new Date(at);
  };
}

/** The only option is `--grande`; anything else is refused before the database is opened. */
function readOptions(args: string[]) {
  const unknown = args.filter((arg) => arg !== '--grande');
  if (unknown.length > 0) throw new Error(`Opção desconhecida: ${unknown.join(' ')}. Use apenas --grande.`);
  return { grande: args.includes('--grande') };
}

/** Writes the sample to a migrated database; the seed's tests call it on their own. */
export function seedSample(db: Database, options: { grande: boolean }) {
  // The large project's 54 more writes would reach the current time within two days.
  // Sample edit dates advance; request receipts keep their real creation time.
  const workspace = createWorkspaceService(db, sampleClock(options.grande ? 7 : 2), undefined, () => new Date());
  const at = (instant: string) => createWorkspaceService(db, () => new Date(instant));
  return seed({ workspace, at, today: todayIn('UTC', new Date()) }, options);
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const { databasePath } = readConfig();
  assertSeedTarget(databasePath, { roots: temporaryRoots(), production: process.env.NODE_ENV === 'production' });
  const db = createDatabase(databasePath);
  try {
    await migrate(db, modules);
    const projects = await seedSample(db, options);
    const names = projects.map((project) => project.name).join(', ');
    console.info(`Exemplo${options.grande ? ' grande' : ''} criado em ${databasePath}: ${names}.`);
  } finally {
    await db.destroy();
  }
}

// Run as a script, not when a test imports the sample. The module's URL has the real path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href)
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Falha ao criar o exemplo.');
    process.exitCode = 1;
  }
