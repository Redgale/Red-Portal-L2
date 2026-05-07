// ── Ultraviolet Service Worker ────────────────────────────────────────────────
// This file is registered with scope /service/ so it only intercepts requests
// that go through the UV proxy prefix, leaving all other app fetches alone.

importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');

const sw = new UVServiceWorker();

self.addEventListener('fetch', event => sw.fetch(event));
