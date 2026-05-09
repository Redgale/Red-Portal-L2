// Runs automatically via "postinstall" in package.json.
//
// Copies all static client-side assets needed by UV + bare-mux into public/:
//   public/uv/          ← UV dist (bundle, handler, sw, config)
//   public/baremux/     ← bare-mux client + SharedWorker
//   public/epoxy/       ← epoxy transport module
//   public/uv.sw.js     ← our root-level SW wrapper (claims /service/ scope)

import { uvPath }     from '@titaniumnetwork-dev/ultraviolet';
import { bareMuxPath } from '@mercuryworkshop/bare-mux';
import { epoxyPath }  from '@mercuryworkshop/epoxy-transport';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const uvDest     = resolve('public/uv');
const baremuxDest = resolve('public/baremux');
const epoxyDest  = resolve('public/epoxy');
const pubDest    = resolve('public');

for (const dir of [uvDest, baremuxDest, epoxyDest]) {
  mkdirSync(dir, { recursive: true });
}

// ── 1. UV dist ────────────────────────────────────────────────────────────────
cpSync(uvPath, uvDest, { recursive: true });
console.log('[copy-uv] UV dist → public/uv/');

// ── 2. bare-mux client files ──────────────────────────────────────────────────
cpSync(bareMuxPath, baremuxDest, { recursive: true });
console.log('[copy-uv] bare-mux → public/baremux/');

// ── 3. epoxy transport ────────────────────────────────────────────────────────
cpSync(epoxyPath, epoxyDest, { recursive: true });
console.log('[copy-uv] epoxy → public/epoxy/');

// ── 4. Custom uv.config.js (overwrites the package default) ──────────────────
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
console.log('[copy-uv] uv.config.js → public/uv/uv.config.js');

// ── 5. Root-level SW wrapper ──────────────────────────────────────────────────
// Lives at / so it can claim scope /service/ without Service-Worker-Allowed header.
// Imports the package's own uv.sw.js which defines UVServiceWorker.
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
console.log('[copy-uv] root SW wrapper → public/uv.sw.js');
