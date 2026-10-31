import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function excalidrawFonts(): Plugin {
  return {
    name: 'tinyfold-excalidraw-fonts',
    async configResolved(config) {
      await cp(
        fileURLToPath(new URL('./node_modules/@excalidraw/excalidraw/dist/prod/fonts/', import.meta.url)),
        resolve(config.publicDir, 'excalidraw/fonts'),
        { recursive: true },
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, '../..', ''), ...process.env };
  const server = `http://127.0.0.1:${env.PORT ?? 3370}`;
  return {
    plugins: [react(), excalidrawFonts()],
    server: {
      host: 'localhost',
      port: Number(env.WEB_PORT ?? 5170),
      strictPort: true,
      // Same paths as in production: Claude Code uses /mcp, and /.well-known must answer its OAuth
      // discovery with the server's JSON 404 instead of the SPA's index.html.
      proxy: { '/rpc': server, '/mcp': server, '/.well-known': server },
    },
    // Keep font URLs on this origin, as required by the server's font-src policy.
    build: { outDir: 'dist', assetsInlineLimit: 0 },
  };
});
