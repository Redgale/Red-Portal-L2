// Runs automatically via "postinstall" in package.json.
// 1. Copies UV dist files (bundle, handler…) from node_modules → public/uv/
// 2. Writes our custom uv.config.js  (overrides the package default)
// 3. Writes our custom uv.sw.js      (adds the required importScripts wrapper)
//
// public/uv/ is entirely generated — gitignore it, never commit it.

import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dest = resolve('public/uv');
mkdirSync(dest, { recursive: true });

// ── 1. Copy UV package dist ───────────────────────────────────────────────────
cpSync(uvPath, dest, { recursive: true });
console.log('[copy-uv] UV dist copied → public/uv/');

// ── 2. uv.config.js ──────────────────────────────────────────────────────────
// Must load AFTER uv.bundle.js (which defines the Ultraviolet global).
writeFileSync(
  resolve(dest, 'uv.config.js'),
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
console.log('[copy-uv] uv.config.js written');

// ── 3. uv.sw.js ──────────────────────────────────────────────────────────────
// importScripts order matters:
//   bundle  → defines Ultraviolet global
//   config  → sets __uv$config (uses Ultraviolet.codec)
//   then we can instantiate UVServiceWorker
writeFileSync(
  resolve(dest, 'uv.sw.js'),
  `importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');

const sw = new UVServiceWorker();
self.addEventListener('fetch', event => sw.fetch(event));
`,
);
console.log('[copy-uv] uv.sw.js written');
