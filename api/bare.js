// ── Vercel Serverless Bare Server ─────────────────────────────────────────────
// Handles /bare/* — the Ultraviolet proxy relay.
//
// Vercel's vercel.json `headers` block only applies to static file responses.
// Serverless function responses bypass it entirely, so CORS headers MUST be
// set here manually on every response path (success, error, and OPTIONS preflight).

import BareServer from '@tomphttp/bare-server-node';

// ── CORS headers applied to every response ───────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':   '*',
  'Access-Control-Allow-Methods':  'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers':  '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age':        '86400',
  'Cross-Origin-Resource-Policy':  'cross-origin',
};

function setCORSHeaders(res) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

// ── Singleton bare server instance ───────────────────────────────────────────
let bare;
function getBare() {
  if (!bare) bare = new BareServer('/bare/', { logErrors: false });
  return bare;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Always set CORS headers first — this covers all response codes including
  // 4xx and 5xx, which vercel.json headers would miss.
  setCORSHeaders(res);

  // Handle OPTIONS preflight immediately — no need to touch the bare server.
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const b = getBare();

  if (b.shouldRoute(req)) {
    try {
      await b.routeRequest(req, res);
    } catch (err) {
      console.error('[bare] routeRequest error:', err);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Bare server error');
      }
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}

// Disable Vercel's body parser — bare server reads the raw stream directly.
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
