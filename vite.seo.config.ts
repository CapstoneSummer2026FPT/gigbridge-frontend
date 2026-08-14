import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    rollupOptions: {
      input: resolve(projectRoot, 'src/seo/client.tsx'),
      output: {
        entryFileNames: 'assets/seo-client.js',
        chunkFileNames: 'assets/seo-[name]-[hash].js',
        assetFileNames: 'assets/seo-[name]-[hash][extname]',
      },
    },
  },
});
