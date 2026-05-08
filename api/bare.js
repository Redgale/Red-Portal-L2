// ── Vercel Serverless Bare Server ─────────────────────────────────────────────
// Vercel routes /bare/* here via vercel.json rewrites.
// The bare server speaks the Bare protocol that Ultraviolet's SW uses to
// forward requests — effectively acting as a CORS-bypass relay.
//
// Dep:  @tomphttp/bare-server-node (already in package.json)

import BareServer from '@tomphttp/bare-server-node';

// Singleton bare server instance (persists across warm invocations)
let bare;

function getBare() {
  if (!bare) bare = new BareServer('/bare/', { logErrors: false });
  return bare;
}

export default async function handler(req, res) {
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
