import { rmSync } from 'node:fs';

/** Removes this run's database folder (runDataDirectory). */
export default function globalTeardown() {
  const directory = process.env.TINYFOLD_E2E_DATA;
  if (directory) rmSync(directory, { recursive: true, force: true });
}
