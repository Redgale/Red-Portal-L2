// Copies UV's compiled dist files from node_modules into public/uv/
// so Vite picks them up as plain static assets — no plugin needed.
// Runs automatically via "postinstall" in package.json.

import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { cpSync, mkdirSync } from 'fs';

mkdirSync('public/uv', { recursive: true });
cpSync(uvPath, 'public/uv', { recursive: true });

console.log('[copy-uv] UV files copied to public/uv/ from', uvPath);
