// ── Red Portal — Production Server ───────────────────────────────────────────
import { createServer }          from 'http';
import { join, dirname }         from 'path';
import { fileURLToPath }         from 'url';
import express                   from 'express';
import { createBareServer }      from '@tomphttp/bare-server-node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = parseInt(process.env.PORT || '8080', 10);

// ── CORS headers applied to every response ───────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':   '*',
  'Access-Control-Allow-Methods':  'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers':  '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age':        '86400',
  'Cross-Origin-Resource-Policy':  'cross-origin',
  'Cross-Origin-Opener-Policy':    'same-origin-allow-popups',
  'Cross-Origin-Embedder-Policy':  'unsafe-none',
};

function applyCORS(res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

// ── Bare server ───────────────────────────────────────────────────────────────
const bare = createBareServer('/bare/');

// ── Express (static file server) ─────────────────────────────────────────────
const app = express();

// Prevent caching of UV-proxied responses
app.use('/service/', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// uv.sw.js lives at the root (/uv.sw.js) so it can claim /service/ scope
// without needing a Service-Worker-Allowed header — browser allows any sub-scope
// of the script's own directory, and root covers everything.
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  applyCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// ── WebSocket upgrades ────────────────────────────────────────────────────────
server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Red Portal running → http://localhost:${PORT}`);
});
