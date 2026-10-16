import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {defineConfig} from 'vite';
import { contractorWeatherMiddleware } from './server/contractorWeather';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const contractorWeatherApi: Plugin = {
  name: 'xapcon-contractor-weather-api',
  configureServer(server) {
    server.middlewares.use('/api/contractor-weather', contractorWeatherMiddleware);
  },
};

export default defineConfig(() => {
  return {
    plugins: [contractorWeatherApi, react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, '.'),
      },
    },
    build: {
      outDir: 'dist/client',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('@supabase/')) return 'supabase';
            if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
            if (id.includes('@radix-ui/') || id.includes('/radix-ui/')) return 'ui';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
