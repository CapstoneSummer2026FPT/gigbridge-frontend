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
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        'seo-client': resolve(projectRoot, 'src/seo/client.tsx'),
        'landing-client': resolve(projectRoot, 'src/features/landing/client.tsx'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/seo-[name]-[hash].js',
        assetFileNames: assetInfo => assetInfo.name === 'style.css'
          ? 'assets/landing.css'
          : 'assets/seo-[name]-[hash][extname]',
      },
    },
  },
});
