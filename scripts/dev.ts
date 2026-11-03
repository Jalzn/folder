import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const commands = [
  [fileURLToPath(import.meta.resolve('tsx/cli')), 'watch', '--env-file-if-exists=.env', 'src/server/main.ts'],
  [
    fileURLToPath(new URL('./bin/vite.js', import.meta.resolve('vite/package.json'))),
    '--config',
    'src/web/vite.config.ts',
  ],
];
// Each CLI owns its watcher. Keeping Vite in a child also keeps its process.exit handler out of this host.
const children = commands.map((args) => {
  const child = spawn(process.execPath, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    env: process.env,
    // The terminal signals this runner; each CLI receives one forwarded signal.
    // Sharing the terminal's group would deliver SIGINT twice and force tsx to kill its server.
    detached: process.platform !== 'win32',
  });
  const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
  return { process: child, closed };
});
let stopping: Promise<void> | undefined;
const stop = (signal: NodeJS.Signals = 'SIGTERM') => {
  stopping ??= (async () => {
    for (const child of children) {
      if (child.process.exitCode === null && child.process.signalCode === null) child.process.kill(signal);
    }
    await Promise.all(children.map((child) => child.closed));
  })();
  return stopping;
};
for (const child of children) {
  child.process.once('error', (error) => {
    console.error(error);
    process.exitCode = 1;
    void stop();
  });
  child.process.once('exit', (code) => {
    if (!stopping) {
      process.exitCode = code ?? 1;
      void stop();
    }
  });
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void stop(signal);
  });
}
