import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    // Dev only: proxy /bare to the bare server running separately (node server.js).
    // In production on Koyeb, everything runs on the same port — no proxy needed.
    proxy: {
      '/bare': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
