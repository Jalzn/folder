import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, '../..', ''), ...process.env };
  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: Number(env.WEB_PORT ?? 5170),
      strictPort: true,
      proxy: { '/rpc': `http://127.0.0.1:${env.PORT ?? 3370}` },
    },
    // Keep font URLs on this origin, as required by the server's font-src policy.
    build: { outDir: 'dist', assetsInlineLimit: 0 },
  };
});
