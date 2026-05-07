# Red Portal v2

A Vite-powered games portal with a dark cyberpunk aesthetic.

## Quick Start

```bash
npm install
npm run dev       # start dev server at localhost:5173
npm run build     # build for production → dist/
npm run preview   # preview the production build locally
```

## Deploy

Drop the `dist/` folder onto **Netlify**, **Cloudflare Pages**, or any static host.
The `public/_headers` file is automatically copied to `dist/` and handles CORS headers.

## Adding Games

Edit **`src/games.js`** — three arrays:

| Array          | Tab shown        |
|----------------|------------------|
| `games`        | 🎮 Games         |
| `testingGames` | 🧪 Testing       |
| `proxies`      | 🔓 Proxies       |

```js
export const games = [
  { name: 'My Game', url: 'https://my-game.vercel.app/' },
  // ...
];
```

## Bug Fix — Fetch Cascade

**Old behaviour:** If one game fetch failed (CORS), `window.open()` would be in
the `.catch()` callback — async — so the browser treated it as an unsolicited popup
and blocked it. Every click after that would also be blocked.

**Fix (in `src/main.js`):**
1. `window.open()` is called **synchronously** on the click event, before any `await`.
2. A loading screen is immediately injected into the popup.
3. The fetch happens in the background.
4. Success → inject `<base>` tag + serve blob URL.
5. Failure → fall back to direct navigation. The game still opens, just without the base-tag fix.

Games always open. No cascading failures.
