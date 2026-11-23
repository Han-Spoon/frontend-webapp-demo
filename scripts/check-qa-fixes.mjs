import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
const previousWindow = globalThis.window;
try {
  const lazy = await server.ssrLoadModule('/src/app/lazyScreen.tsx');
  let reloads = 0;
  globalThis.window = { location: { reload() { reloads++; } } };
  const Screen = lazy.lazyScreen(async () => { throw new TypeError('Failed to fetch dynamically imported module'); });
  try { Screen({}); } catch (pending) { await pending; }
  assert.equal(lazy.hasScreenLoadFailure(), true);
  assert.equal(reloads, 0, 'Do not discard unsaved input automatically');
  lazy.retryFailedScreens();
  assert.equal(reloads, 1, 'Explicit recovery reloads the document, not the obsolete chunk');
  const { deduplicateStores } = await server.ssrLoadModule('/src/api/store.ts');
  const store = { storeId: 1, name: 'Fixture', roadAddress: 'Road 1', latitude: 37, longitude: 127 };
  assert.deepEqual(deduplicateStores([store, { ...store, storeId: 2 }, { ...store, storeId: 3, branchName: 'Second' }, { ...store, storeId: 4, latitude: 38 }]).map(item => item.storeId), [1, 3, 4]);
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const spa = new RegExp(`^${config.rewrites.at(-1).source}$`);
  for (const path of ['/map', '/cards', '/home', '/curation/sauce-on-side']) assert.ok(spa.test(path));
  for (const path of ['/assets/old-chunk.js', '/api/v1/missing']) assert.equal(spa.test(path), false);
  console.log('PASS: obsolete chunk recovery requires user action; SPA routes exclude assets and API');
} finally { globalThis.window = previousWindow; await server.close(); }
