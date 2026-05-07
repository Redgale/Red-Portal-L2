// ── Ultraviolet runtime configuration ────────────────────────────────────────
// This file is loaded in TWO contexts:
//   1. The main page  (via <script src="/uv/uv.config.js">) — for URL encoding
//   2. The service worker (importScripts)                    — for routing
//
// `Ultraviolet` is injected by uv.bundle.js, which must be loaded first.
//
// ⚠️  Change `bare` to your deployed bare-server URL if you're not on Vercel.
//     For local dev the vite proxy routes /bare → localhost:8080.

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
