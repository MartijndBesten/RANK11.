import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single` bundelt alles in één HTML-bestand (voor de reviewpreview).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  base: './',
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
  // Lokale online-stack: /api gaat naar wrangler dev (tools/dev-online.mjs). Zelfde origin, dus het sessiecookie werkt.
  server: { port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } } },
}));
