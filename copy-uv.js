// Runs automatically via "postinstall" in package.json.
//
// Uses createRequire to resolve each package's root directory — bare-mux and
// epoxy-transport don't export a path helper like UV does, so we find them via
// their main entry point and walk up to the package root.
//
// File layout after this runs:
//   public/uv/         ← UV dist (bundle, handler, sw, config-overwritten)
//   public/baremux/    ← bare-mux dist (index.js + worker.js)
//   public/epoxy/      ← epoxy-transport dist (index.mjs)
//   public/uv.sw.js    ← our root-level SW wrapper
import { uvPath }        from '@titaniumnetwork-dev/ultraviolet';
import { createRequire } from 'module';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);

// Walk up from a resolved file path until we find the package root
// (i.e. the directory that contains a package.json with a matching name).
function pkgRoot(resolvedFile) {
  let dir = dirname(resolvedFile);
  while (true) {
    try {
      // If this directory has a package.json, it's the root.
      require(resolve(dir, 'package.json'));
      return dir;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) throw new Error(`Could not find package root for ${resolvedFile}`);
      dir = parent;
    }
  }
}

// Resolve package root directories via their main entry point instead of
// /package.json (which isn't listed in their "exports" map).
const bareMuxDir = pkgRoot(require.resolve('@mercuryworkshop/bare-mux'));
const epoxyDir   = pkgRoot(require.resolve('@mercuryworkshop/epoxy-transport'));

const uvDest      = resolve(__dirname, 'public/uv');
const baremuxDest = resolve(__dirname, 'public/baremux');
const epoxyDest   = resolve(__dirname, 'public/epoxy');
const pubDest     = resolve(__dirname, 'public');

for (const dir of [uvDest, baremuxDest, epoxyDest]) {
  mkdirSync(dir, { recursive: true });
}

// ── 1. UV dist ────────────────────────────────────────────────────────────────
cpSync(uvPath, uvDest, { recursive: true });
console.log('[copy-uv] UV dist → public/uv/');

// ── 2. bare-mux dist ──────────────────────────────────────────────────────────
// Copies index.js (page-side BareMuxConnection) and worker.js (SharedWorker)
cpSync(resolve(bareMuxDir, 'dist'), baremuxDest, { recursive: true });
console.log('[copy-uv] bare-mux dist → public/baremux/');

// ── 3. epoxy-transport dist ───────────────────────────────────────────────────
// Copies index.mjs (the transport loaded by the SharedWorker at runtime)
cpSync(resolve(epoxyDir, 'dist'), epoxyDest, { recursive: true });
console.log('[copy-uv] epoxy dist → public/epoxy/');

// ── 4. Custom uv.config.js ────────────────────────────────────────────────────
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
// At / so it can claim scope /service/ without any Service-Worker-Allowed header.
// Imports the package's uv.sw.js last — it defines UVServiceWorker.
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
