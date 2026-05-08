// Runs via "postinstall" in package.json.
// 1. Copies all UV dist files (bundle, handler, etc.) from node_modules → public/uv/
// 2. Writes our custom uv.config.js  (overrides the package default)
// 3. Writes our custom uv.sw.js      (adds the required importScripts wrapper)
//
// public/uv/ is entirely generated — gitignore it, never commit it.

import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dest = resolve('public/uv');
mkdirSync(dest, { recursive: true });

// ── Step 1: copy everything from the UV package dist ─────────────────
cpSync(uvPath, dest, { recursive: true });
console.log('[copy-uv] UV dist files copied to public/uv/');

// ── Step 2: write our uv.config.js ───────────────────────────────────
// This MUST load after uv.bundle.js (which defines `Ultraviolet`).
// The prefix /service/ is the scope our service worker is registered on.
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

// ── Step 3: write our uv.sw.js ───────────────────────────────────────
// importScripts order matters: bundle first (defines Ultraviolet global),
// then config (uses Ultraviolet.codec), then the UV SW class.
writeFileSync(
  resolve(dest, 'uv.sw.js'),
  `importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');

const sw = new UVServiceWorker();
self.addEventListener('fetch', event => sw.fetch(event));
`,
);
console.log('[copy-uv] uv.sw.js written');
