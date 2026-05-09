// ── Red Portal — Production Server ───────────────────────────────────────────
import { createServer }       from 'http';
import { join, dirname }      from 'path';
import { fileURLToPath }      from 'url';
import express                from 'express';
import { createBareServer }   from '@tomphttp/bare-server-node';
import { server as wisp }     from '@mercuryworkshop/wisp-js/server';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = parseInt(process.env.PORT || '8080', 10);

// ── CORS headers ──────────────────────────────────────────────────────────────
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

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();

app.use('/service/', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(join(__dirname, 'dist')));

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
// /wisp/ → wisp-js server (epoxy transport tunnels through here)
// /bare/ → bare server (fallback WS proxy)
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/wisp/')) {
    wisp.routeRequest(req, socket, head);
  } else if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Red Portal running → http://localhost:${PORT}`);
});
