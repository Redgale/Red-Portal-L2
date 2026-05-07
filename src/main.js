import '../style.css';
import { games, testingGames, proxies } from './games.js';

// ── Color bands for game cards (cycles through) ──────────────────────
const BANDS = [
  '#FF1C1C', '#FF6820', '#FFB300',
  '#20FF8A', '#00D4FF', '#9B20FF', '#FF2099',
];

// ── Game card emoji icons ─────────────────────────────────────────────
function getIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('geo') || n.includes('dash'))  return '🔷';
  if (n.includes('slope'))                        return '🔺';
  if (n.includes('cookie'))                       return '🍪';
  if (n.includes('among'))                        return '🪐';
  if (n.includes('drift') || n.includes('car'))   return '🚗';
  if (n.includes('subway') || n.includes('surf')) return '🛹';
  if (n.includes('mine') || n.includes('craft'))  return '⛏️';
  if (n.includes('shell') || n.includes('egg'))   return '🥚';
  if (n.includes('friday') || n.includes('fnf'))  return '🎤';
  if (n.includes('tunnel'))                       return '🌀';
  if (n.includes('boom'))                         return '💥';
  if (n.includes('ball') || n.includes('core'))   return '⚽';
  if (n.includes('bow'))                          return '🏹';
  if (n.includes('gta') || n.includes('city'))    return '🚔';
  if (n.includes('game') || n.includes('no'))     return '🎮';
  if (n.includes('1v1'))                          return '⚔️';
  return '🎯';
}

// ── Render game grid ─────────────────────────────────────────────────
function renderGrid(containerId, list) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';

  if (!list.length) {
    grid.innerHTML = '<p class="empty-msg">No games yet — add some in src/games.js</p>';
    return;
  }

  list.forEach((game, i) => {
    const band = BANDS[i % BANDS.length];
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.style.setProperty('--band', band);
    card.style.animationDelay = `${i * 30}ms`;
    card.innerHTML = `
      <div class="card-band"></div>
      <div class="card-body">
        <div class="card-icon">${getIcon(game.name)}</div>
        <span class="card-name">${game.name}</span>
      </div>`;
    grid.appendChild(card);
  });
}

// ── Search / filter ──────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('gameSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('#gamesGrid .game-card').forEach(card => {
      const name = card.querySelector('.card-name').textContent.toLowerCase();
      card.style.display = name.includes(q) ? '' : 'none';
    });
    const visible = [...document.querySelectorAll('#gamesGrid .game-card')]
      .filter(c => c.style.display !== 'none');
    const empty = document.querySelector('#gamesGrid .empty-msg');
    if (q && !visible.length) {
      if (!empty) {
        const msg = document.createElement('p');
        msg.className = 'empty-msg';
        msg.textContent = `No games matching "${q}"`;
        document.getElementById('gamesGrid').appendChild(msg);
      }
    } else if (empty) empty.remove();
  });
}

// ── Toast notifications ──────────────────────────────────────────────
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = message;
  container.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 350);
  }, 3500);
}

// ── Loading page injected into popup immediately ─────────────────────
const LOADING_PAGE = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Loading…</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#06070E;display:flex;flex-direction:column;align-items:center;
       justify-content:center;min-height:100vh;gap:1.25rem;
       font-family:'Chakra Petch',monospace;color:#FF1C1C;}
  .ring{width:52px;height:52px;border:3px solid rgba(255,28,28,.18);
        border-top-color:#FF1C1C;border-radius:50%;
        animation:spin .75s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}
  p{font-size:.78rem;letter-spacing:.18em;color:#505070;text-transform:uppercase;}
</style></head>
<body><div class="ring"></div><p>Loading game…</p></body></html>`;

// ── Ultraviolet proxy helpers ────────────────────────────────────────
//
// UV works in three pieces:
//   1. uv.bundle.js  — sets the global `Ultraviolet` object (loaded via <script>)
//   2. uv.config.js  — sets `self.__uv$config` (loaded via <script> after bundle)
//   3. uv.sw.js      — the service worker, registered below with scope /service/
//
// When a fetch() fails (CORS / firewall), we route the popup to:
//   /service/<xor-encoded-url>
// The service worker intercepts that, proxies it through /bare/ (our Vercel
// serverless bare server), and returns the real response — bypassing CORS.

let uvReady = false; // true once the SW is active and controlling the page

async function registerUV() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[UV] Service workers not supported');
    return;
  }
  try {
    // Scope is /service/ so the SW only intercepts UV-proxied requests,
    // leaving all other page fetches completely unaffected.
    const reg = await navigator.serviceWorker.register('/uv/uv.sw.js', {
      scope: '/service/',
    });

    // Wait for an active worker (handles first-load case where SW hasn't
    // activated yet — typically resolves in < 200 ms on subsequent loads).
    await new Promise(resolve => {
      if (reg.active) { resolve(); return; }
      const sw = reg.installing || reg.waiting;
      if (sw) sw.addEventListener('statechange', e => {
        if (e.target.state === 'activated') resolve();
      });
      // Timeout safety — we still fall back to direct navigate if SW is slow
      setTimeout(resolve, 3000);
    });

    uvReady = true;
    console.log('[UV] Service worker ready');
  } catch (err) {
    console.warn('[UV] SW registration failed:', err);
  }
}

/**
 * Returns the UV-proxied URL for a given target, or null if UV isn't ready.
 * Requires window.__uv$config (set by uv.config.js) to be present.
 */
function getUVUrl(targetUrl) {
  try {
    const cfg = window.__uv$config;
    if (!uvReady || !cfg) return null;
    return cfg.prefix + cfg.encodeUrl(targetUrl);
  } catch {
    return null;
  }
}

// ── THE FIX: open popup synchronously, fetch asynchronously ─────────
//
// Three-stage cascade (game always opens):
//
//   Stage 1 — Direct fetch + blob inject
//     ✓ CORS allowed  →  inject <base> tag, serve as blob URL (cleanest)
//
//   Stage 2 — UV proxy (Ultraviolet service worker via /bare/)
//     CORS blocked, UV ready  →  navigate popup to /service/<encoded-url>
//     The SW proxies through our own Vercel bare server. No popup re-open
//     needed — we just change location.href on the already-open popup.
//
//   Stage 3 — Direct navigate
//     UV not ready / bare server down  →  navigate popup directly to the URL.
//     Game still opens; assets that are cross-origin may not load but it's
//     the best we can do without a proxy.
//
function openGame(url) {
  if (!url) { toast('No URL set for this game.', 'error'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // SYNC — open popup tied to this user gesture BEFORE any await/then.
  const win = window.open('about:blank', '_blank');
  if (!win) {
    toast('Popup blocked — please allow popups for this site.', 'error');
    return;
  }

  // Fill popup immediately so it looks alive while we work in background.
  win.document.open();
  win.document.write(LOADING_PAGE);
  win.document.close();

  // Stage 1 — direct fetch with 12-second timeout
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12_000);

  fetch(url, { signal: controller.signal })
    .then(res => {
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      // Stage 1 success: inject <base> so relative assets resolve correctly,
      // then serve the whole page as a blob URL in the already-open popup.
      const base = url.replace(/([^/]*)(\?.*)?$/, '');
      const fixed = html.replace(/<head([^>]*)>/i, (m, a) => `<head${a}><base href="${base}">`);
      const blob  = new Blob([fixed], { type: 'text/html' });
      if (!win.closed) win.location.href = URL.createObjectURL(blob);
    })
    .catch(() => {
      clearTimeout(tid);
      if (win.closed) return;

      // Stage 2 — UV proxy
      const uvUrl = getUVUrl(url);
      if (uvUrl) {
        console.log('[UV] Proxying via UV:', url);
        win.location.href = uvUrl;
        return;
      }

      // Stage 3 — bare direct navigate
      console.log('[UV] Falling back to direct navigate:', url);
      win.location.href = url;
    });
}

// ── Navigation ───────────────────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const section = document.getElementById(id);
  if (section) section.classList.add('active');
  const link = document.querySelector(`.nav-link[data-section="${id}"]`);
  if (link) link.classList.add('active');
}

// ── HTML Executor ────────────────────────────────────────────────────
function executeTyped() {
  const html   = document.getElementById('htmlInput').value;
  const status = document.getElementById('execTypedStatus');
  if (!html.trim()) { status.textContent = 'Enter some HTML to execute.'; return; }
  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
  status.textContent = 'Opened in new tab.';
  setTimeout(() => { status.textContent = ''; }, 3000);
}

function executeFile() {
  const status = document.getElementById('execFileStatus');
  const input  = document.getElementById('fileInput');
  const file   = input?.files[0];
  if (!file) { status.textContent = 'Select a file first.'; return; }
  const reader = new FileReader();
  reader.onload = e => {
    const blob = new Blob([e.target.result], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
    status.textContent = 'File opened in new tab.';
    setTimeout(() => { status.textContent = ''; }, 3000);
    input.value = '';
  };
  reader.onerror = () => { status.textContent = 'Failed to read file.'; };
  reader.readAsText(file);
}

// ── Website Fetcher (same 3-stage cascade) ──────────────────────────
function fetchSite() {
  const input  = document.getElementById('urlInput');
  const status = document.getElementById('fetchStatus');
  let url = input.value.trim();
  if (!url) { status.textContent = 'Enter a URL.'; return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // SYNC open
  const win = window.open('about:blank', '_blank');
  if (!win) {
    status.textContent = 'Popup blocked! Allow popups to use the fetcher.';
    return;
  }
  win.document.open();
  win.document.write(LOADING_PAGE);
  win.document.close();

  status.textContent = `Fetching ${url}…`;
  input.value = '';

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 15_000);

  fetch(url, { signal: controller.signal })
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
    .then(html => {
      // Stage 1 success
      const base  = url.replace(/([^/]*)(\?.*)?$/, '');
      const fixed = html.replace(/<head([^>]*)>/i, (m, a) => `<head${a}><base href="${base}">`);
      const blob  = new Blob([fixed], { type: 'text/html' });
      if (!win.closed) win.location.href = URL.createObjectURL(blob);
      status.textContent = 'Opened!';
    })
    .catch(() => {
      if (win.closed) return;

      // Stage 2 — UV proxy
      const uvUrl = getUVUrl(url);
      if (uvUrl) {
        console.log('[UV] Fetcher proxying via UV:', url);
        win.location.href = uvUrl;
        status.textContent = 'Proxying through UV…';
      } else {
        // Stage 3 — direct
        win.location.href = url;
        status.textContent = 'Fetch blocked — navigated directly instead.';
      }
    })
    .finally(() => setTimeout(() => { status.textContent = ''; }, 4000));
}

// ── Boot ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Register UV service worker in the background — doesn't block render.
  // By the time a user clicks a game card, it will almost certainly be ready.
  registerUV();

  // Render game grids
  renderGrid('gamesGrid',     games);
  renderGrid('preLaunchGrid', testingGames);
  renderGrid('proxiesGrid',   proxies);

  // Search
  initSearch();

  // Nav
  document.getElementById('mainNav').addEventListener('click', e => {
    const link = e.target.closest('.nav-link[data-section]');
    if (!link) return;
    e.preventDefault();
    showSection(link.dataset.section);
  });

  // Game grid click delegation
  ['gamesGrid', 'preLaunchGrid', 'proxiesGrid'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      const card = e.target.closest('.game-card');
      if (!card) return;
      e.preventDefault();
      openGame(card.href);
    });
  });

  // Executor buttons
  document.getElementById('btnRunHtml')?.addEventListener('click', executeTyped);
  document.getElementById('btnOpenFile')?.addEventListener('click', executeFile);

  // Fetcher
  document.getElementById('btnFetchSite')?.addEventListener('click', fetchSite);
  document.getElementById('urlInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchSite();
  });

  // Google Form
  document.getElementById('btnOpenForm')?.addEventListener('click', () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLScaYcFE6kxkrrnx09OX8QLJZluyDLUeH65pDbRa-I2DapeQ7A/viewform?usp=dialog',
      '_blank'
    );
  });
});
