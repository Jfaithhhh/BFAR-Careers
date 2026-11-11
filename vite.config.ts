import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
<<<<<<< HEAD
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
=======
import path from 'path';
import {defineConfig} from 'vite';
>>>>>>> 4f77d638f40086800e2d793cd83af69492abef34

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
<<<<<<< HEAD
      host: true, // Nagpapahintulot na ma-access ang server sa iyong local network (LAN)
      port: 3000,
=======
>>>>>>> 4f77d638f40086800e2d793cd83af69492abef34
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
<<<<<<< HEAD
});
=======
});
>>>>>>> 4f77d638f40086800e2d793cd83af69492abef34
