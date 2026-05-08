import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';

export default defineConfig({
  plugins: [
    // Copies uv.bundle.js, uv.handler.js, etc. → dist/uv/ at build time.
    // At dev time, Vite serves them directly from node_modules via the alias below.
    viteStaticCopy({
      targets: [
        { src: `${uvPath}/*.js`, dest: 'uv' },
      ],
    }),
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // Dev-server: proxy /bare/ → the local bare server (npm run bare).
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
