import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // Dev-server: proxy /bare/ → local bare server (node copy-uv.js && node server.js).
  // In production Vercel handles /bare/ via api/bare.js.
  server: {
    proxy: {
      '/bare': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
