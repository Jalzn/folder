import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

/** What the web bundle is built from: the web, and the pure modules of the other packages it imports. */
const SOURCES = ['src/web', 'src/workspace/domain', 'src/auth/domain'];
/** Files that never reach the bundle. */
const NOT_BUNDLED = /\.test\.tsx?$|\/testing\//;

/**
 * Refuses to test a web bundle older than its code: the server serves src/web/dist as it is, and the e2e
 * script does not build it. Compares with the newest file git knows in the sources, tracked or new, so the
 * ignored outputs (dist, node_modules, the copied Excalidraw fonts) never count.
 */
export default function globalSetup() {
  let built: number;
  try {
    built = statSync('src/web/dist/index.html').mtimeMs;
  } catch {
    throw new Error('Não há bundle da web: rode `pnpm build` antes do E2E.');
  }
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...SOURCES], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !NOT_BUNDLED.test(file));
  let newest = { file: '', time: 0 };
  for (const file of files) {
    let time: number;
    try {
      time = statSync(file).mtimeMs;
    } catch {
      continue; // Deleted and not yet committed.
    }
    if (time > newest.time) newest = { file, time };
  }
  if (newest.time > built)
    throw new Error(`O bundle da web é mais antigo que ${newest.file}: rode \`pnpm build\` antes do E2E.`);
}
