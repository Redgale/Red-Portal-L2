import '../style.css';
import { games, testingGames, proxies } from './games.js';

// ── Color bands for game cards (cycles through) ──────────────────────
const BANDS = [
  '#FF1C1C', '#FF6820', '#FFB300',
  '#20FF8A', '#00D4FF', '#9B20FF', '#FF2099',
];

// ── Launch mode — 'fetch' or 'proxy' ────────────────────────────────
// 'fetch'  → try direct fetch first, fall back to UV proxy, then direct nav
// 'proxy'  → try UV proxy first,    fall back to direct fetch, then direct nav
// The fallback cascade always applies regardless of which mode is selected.
let launchMode = 'fetch';

// ── UV readiness flag ────────────────────────────────────────────────
let uvReady = false;

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

// ── Mode toggle UI ───────────────────────────────────────────────────
// Injected into the section-header of every games/testing/proxies section.
// All toggles share the same `launchMode` variable — clicking one syncs all.
function buildModeToggle() {
  const uid = Math.random().toString(36).slice(2);
  const wrap = document.createElement('div');
  wrap.className = 'mode-toggle';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Launch mode');
  wrap.innerHTML = `
    <button class="mode-btn active" data-mode="fetch"
            title="Try direct fetch first, fall back to UV proxy">
      🌐 Fetch
    </button>
    <button class="mode-btn" data-mode="proxy"
            title="Try UV proxy first, fall back to direct fetch">
      🔓 Proxy <span class="uv-dot" id="uvDot-${uid}"></span>
    </button>`;

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn[data-mode]');
    if (!btn) return;
    launchMode = btn.dataset.mode;

    // Sync every toggle on the page
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === launchMode);
    });

    toast(
      launchMode === 'fetch'
        ? '🌐 Fetch mode — direct fetch first, UV proxy as fallback'
        : '🔓 Proxy mode — UV proxy first, direct fetch as fallback',
      'info'
    );
  });

  return wrap;
}

// Lights up every UV indicator dot once the service worker is active.
function setUVDotState(ready) {
  document.querySelectorAll('.uv-dot').forEach(d => d.classList.toggle('ready', ready));
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
  // Force reflow so the CSS transition actually fires
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

// ── UV service worker registration ───────────────────────────────────
async function registerUV() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[UV] Service workers not supported');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('/uv/uv.sw.js', {
      scope: '/service/',
    });

    // Wait for an active worker (handles first-load case)
    await new Promise(resolve => {
      if (reg.active) { resolve(); return; }
      const sw = reg.installing || reg.waiting;
      if (sw) sw.addEventListener('statechange', e => {
        if (e.target.state === 'activated') resolve();
      });
      setTimeout(resolve, 3000); // safety — don't block forever
    });

    uvReady = true;
    setUVDotState(true);
    console.log('[UV] Service worker ready');
  } catch (err) {
    console.warn('[UV] SW registration failed:', err);
  }
}

// Returns the UV-proxied URL or null if UV isn't ready yet.
function getUVUrl(targetUrl) {
  try {
    const cfg = window.__uv$config;
    if (!uvReady || !cfg) return null;
    return cfg.prefix + cfg.encodeUrl(targetUrl);
  } catch {
    return null;
  }
}

// ── Stage helpers ────────────────────────────────────────────────────

// Attempts a direct fetch and injects the result as a blob URL.
// Resolves true on success, false on any failure.
function tryFetch(url, win) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12_000);

  return fetch(url, { signal: controller.signal })
    .then(res => {
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      const base  = url.replace(/([^/]*)(\?.*)?$/, '');
      const fixed = html.replace(/<head([^>]*)>/i, (m, a) => `<head${a}><base href="${base}">`);
      const blob  = new Blob([fixed], { type: 'text/html' });
      if (!win.closed) win.location.href = URL.createObjectURL(blob);
      return true;
    })
    .catch(() => { clearTimeout(tid); return false; });
}

// Attempts UV proxy routing. Returns true if UV was ready and we routed,
// false if UV wasn't available (SW not registered / not yet active).
function tryProxy(url, win) {
  const uvUrl = getUVUrl(url);
  if (!uvUrl) return false;
  if (!win.closed) win.location.href = uvUrl;
  return true;
}

// ── openGame — respects launchMode, always falls through to direct nav ──
//
// Fetch mode (default):
//   1. Direct fetch → blob URL              (cleanest, assets load perfectly)
//   2. UV proxy     → /service/<encoded>    (bypasses CORS via bare server)
//   3. Direct nav   → raw URL              (last resort, always works)
//
// Proxy mode:
//   1. UV proxy     → /service/<encoded>    (route through bare server first)
//   2. Direct fetch → blob URL              (fallback if UV not ready)
//   3. Direct nav   → raw URL              (last resort, always works)
//
async function openGame(url) {
  if (!url) { toast('No URL set for this game.', 'error'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // SYNC — must happen on the call stack of the click event.
  // Any async work before window.open() causes browsers to block it as a popup.
  const win = window.open('about:blank', '_blank');
  if (!win) {
    toast('Popup blocked — please allow popups for this site.', 'error');
    return;
  }

  // Fill popup immediately so it looks active while we work
  win.document.open();
  win.document.write(LOADING_PAGE);
  win.document.close();

  if (launchMode === 'fetch') {
    // Stage 1 — direct fetch
    if (await tryFetch(url, win)) return;
    // Stage 2 — UV proxy
    if (tryProxy(url, win)) return;
    // Stage 3 — direct navigate
    if (!win.closed) win.location.href = url;

  } else {
    // Stage 1 — UV proxy
    if (tryProxy(url, win)) return;
    // Stage 2 — direct fetch
    if (await tryFetch(url, win)) return;
    // Stage 3 — direct navigate
    if (!win.closed) win.location.href = url;
  }
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

// ── Website Fetcher ──────────────────────────────────────────────────
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
      const base  = url.replace(/([^/]*)(\?.*)?$/, '');
      const fixed = html.replace(/<head([^>]*)>/i, (m, a) => `<head${a}><base href="${base}">`);
      const blob  = new Blob([fixed], { type: 'text/html' });
      if (!win.closed) win.location.href = URL.createObjectURL(blob);
      status.textContent = 'Opened!';
    })
    .catch(() => {
      const uvUrl = getUVUrl(url);
      if (uvUrl) {
        if (!win.closed) win.location.href = uvUrl;
        status.textContent = 'Proxying through UV…';
      } else {
        if (!win.closed) win.location.href = url;
        status.textContent = 'Fetch blocked — navigated directly instead.';
      }
    })
    .finally(() => setTimeout(() => { status.textContent = ''; }, 4000));
}

// ── Boot ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Register UV service worker in the background — non-blocking.
  // The small dot next to "Proxy" turns green once it's active.
  registerUV();

  // Render game grids
  renderGrid('gamesGrid',     games);
  renderGrid('preLaunchGrid', testingGames);
  renderGrid('proxiesGrid',   proxies);

  // Inject the mode toggle into every game section's header
  ['games', 'Testing', 'proxies'].forEach(sectionId => {
    const header = document.querySelector(`#${sectionId} .section-header`);
    if (header) header.appendChild(buildModeToggle());
  });

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

  // Executor
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
