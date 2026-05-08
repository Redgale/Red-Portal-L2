// Runs automatically via "postinstall" in package.json.
//
// File layout after this runs:
//   public/uv/uv.bundle.js   ← package (defines Ultraviolet global)
//   public/uv/uv.handler.js  ← package (request rewriter)
//   public/uv/uv.sw.js       ← package (defines UVServiceWorker) — NOT overwritten
//   public/uv/uv.config.js   ← OURS    (overwritten — sets __uv$config)
//   public/uv.sw.js          ← OURS    (root-level SW wrapper, importScripts the above)
//
// The root-level wrapper is at / so it can claim scope /service/ on all browsers
// without a Service-Worker-Allowed header. The package's uv.sw.js is kept intact
// because IT is what defines the UVServiceWorker class.

import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const uvDest  = resolve('public/uv');
const pubDest = resolve('public');

mkdirSync(uvDest, { recursive: true });

// ── 1. Copy ALL UV package files (bundle, handler, sw, etc.) ─────────────────
// Do NOT selectively exclude uv.sw.js — it defines UVServiceWorker.
cpSync(uvPath, uvDest, { recursive: true });
console.log('[copy-uv] UV dist copied → public/uv/');

// ── 2. Overwrite public/uv/uv.config.js with our custom config ───────────────
// Must load AFTER uv.bundle.js (which defines the Ultraviolet global).
writeFileSync(
  resolve(uvDest, 'uv.config.js'),
  `/*global Ultraviolet*/
self.__uv$config = {
  prefix:    '/service/',
  bare:      '/bare/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler:   '/uv/uv.handler.js',
  bundle:    '/uv/uv.bundle.js',
  config:    '/uv/uv.config.js',
  sw:        '/uv/uv.sw.js',
};
`,
);
console.log('[copy-uv] uv.config.js written → public/uv/uv.config.js');

// ── 3. Write root-level SW wrapper at public/uv.sw.js ────────────────────────
// Being at / lets it claim scope /service/ without any Service-Worker-Allowed header.
//
// Import order matters:
//   uv.bundle.js → defines Ultraviolet global
//   uv.config.js → uses Ultraviolet.codec to set __uv$config
//   uv.sw.js     → uses Ultraviolet + __uv$config to define UVServiceWorker
//
// Then we instantiate and wire up the fetch listener using the modern
// uv.route() / uv.fetch() API.
writeFileSync(
  resolve(pubDest, 'uv.sw.js'),
  `importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts('/uv/uv.sw.js');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      if (uv.route(event)) {
        return await uv.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});
`,
);
console.log('[copy-uv] root SW wrapper written → public/uv.sw.js');
