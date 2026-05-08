// Runs automatically via "postinstall" in package.json.
//
// 1. Copies UV dist files from node_modules → public/uv/
// 2. Writes public/uv/uv.config.js  (our custom config)
// 3. Writes public/uv.sw.js          (SW at root — avoids scope restrictions)
//
// Putting the SW at /uv.sw.js (root) means its default max-scope is /,
// so it can freely claim /service/ without needing a Service-Worker-Allowed header.
// Firefox is strict about this; a script at /uv/uv.sw.js can only claim /uv/* by default.

import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const uvDest  = resolve('public/uv');
const pubDest = resolve('public');

mkdirSync(uvDest, { recursive: true });

// ── 1. Copy UV package dist into public/uv/ ───────────────────────────────────
cpSync(uvPath, uvDest, { recursive: true });
console.log('[copy-uv] UV dist copied → public/uv/');

// ── 2. Write public/uv/uv.config.js ──────────────────────────────────────────
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
  sw:        '/uv.sw.js',
};
`,
);
console.log('[copy-uv] uv.config.js written → public/uv/uv.config.js');

// ── 3. Write public/uv.sw.js (at root, not inside /uv/) ──────────────────────
// Being at the root means the browser allows it to claim /service/ without any
// special Service-Worker-Allowed header.
// importScripts order: bundle (defines Ultraviolet) → config (uses Ultraviolet.codec)
writeFileSync(
  resolve(pubDest, 'uv.sw.js'),
  `importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');

const sw = new UVServiceWorker();
self.addEventListener('fetch', event => sw.fetch(event));
`,
);
console.log('[copy-uv] uv.sw.js written → public/uv.sw.js');
