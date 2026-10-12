import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, Plugin } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function expressBackendPlugin(): Plugin {
  return {
    name: 'express-backend',
    async configureServer(server) {
      try {
        const { app } = await import('./backend/src/app.ts');
        server.middlewares.use(app);
        console.log('[Vite] Express backend mounted on /api routes.');
      } catch (err) {
        console.error('[Vite] Failed to mount Express backend plugin:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressBackendPlugin()],
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
