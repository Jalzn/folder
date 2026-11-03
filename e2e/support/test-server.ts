import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { E2E_PASSWORD, serverEnv } from './server.js';

async function availablePort() {
  const reservation = createServer();
  try {
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const address = reservation.address();
    if (!address || typeof address === 'string') throw new Error('No test server port.');
    return address.port;
  } finally {
    if (reservation.listening)
      await new Promise<void>((resolve, reject) => reservation.close((error) => (error ? reject(error) : resolve())));
  }
}

/** A real server with a new SQLite file; no application database is opened. */
export async function startTestServer({ sample = false } = {}) {
  const port = await availablePort();
  const directory = await mkdtemp(join(tmpdir(), 'tinyfold-e2e-worker-'));
  const databasePath = join(directory, 'tinyfold.sqlite');
  const origin = `http://localhost:${port}`;
  const env = { ...process.env, ...serverEnv({ port, databasePath }) };
  let stop = () => rm(directory, { recursive: true, force: true });
  try {
    if (sample)
      await promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/seed-sample.ts'], {
        env,
        timeout: 30_000,
      });
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/server/main.ts'], { env, stdio: 'pipe' });
    let output = '';
    const collect = (data: Buffer) => {
      output = (output + data.toString()).slice(-8000);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    let spawnError: Error | undefined;
    child.on('error', (error) => {
      spawnError = error;
    });
    // close also fires after a spawn error and after the output streams have drained.
    const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
    const stopOnExit = () => {
      child.kill('SIGTERM');
    };
    process.once('exit', stopOnExit);
    stop = async () => {
      process.removeListener('exit', stopOnExit);
      if (!spawnError && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM');
        const force = setTimeout(() => child.kill('SIGKILL'), 5000);
        try {
          await closed;
        } finally {
          clearTimeout(force);
        }
      }
      await closed;
      await rm(directory, { recursive: true, force: true });
    };
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (spawnError || child.exitCode !== null || child.signalCode !== null)
        throw new Error(`Test server exited before readiness: ${spawnError?.message ?? output}`);
      // The startup line proves this child bound the port, rather than another local service.
      if (output.includes(`Tinyfold em http://127.0.0.1:${port}`)) {
        const response = await fetch(`${origin}/ready`, { signal: AbortSignal.timeout(1000) }).catch(() => null);
        if (response?.ok) return { origin, password: E2E_PASSWORD, stop };
      }
      await delay(50);
    }
    throw new Error(`Test server did not become ready: ${output}`);
  } catch (error) {
    await stop();
    throw error;
  }
}

export type TestServer = Awaited<ReturnType<typeof startTestServer>>;
