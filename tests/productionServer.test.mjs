import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { tsImport } from 'tsx/esm/api';

const { createProductionApp } = await tsImport('../server/productionApp.ts', import.meta.url);

test('production serves SPA routes and caches assets without exposing server sources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'xapcon-production-test-'));
  let server;
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'index.html'), '<html lang="es">CRM</html>');
    await writeFile(path.join(root, 'assets', 'app-123.js'), 'console.log("CRM");'.repeat(200));
    await writeFile(path.join(root, 'server.cjs'), 'SERVER_PRIVATE');
    await writeFile(path.join(root, 'server.cjs.map'), 'SOURCE_PRIVATE');
    server = createProductionApp(root).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const route of ['/', '/admin/dashboard', '/contractor/org/claims']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(await response.text(), /CRM/);
    }
    for (const route of ['/server.cjs', '/server.cjs.map', '/.env', '/missing.js', '/api/missing']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 404, route);
      assert.doesNotMatch(await response.text(), /SERVER_PRIVATE|SOURCE_PRIVATE/);
    }
    const asset = await fetch(base + '/assets/app-123.js');
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.equal(asset.headers.get('content-encoding'), 'gzip');
    assert.equal((await fetch(base + '/assets/missing.js')).status, 404);
    assert.equal((await fetch(base + '/api/contractor-weather')).status, 400);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
