import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

test('the replacement Excel reader preserves the complete reference materials catalog', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'xapcon-catalog-test-'));
  try {
    const output = path.join(root, 'materials.json');
    await promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/update_catalog.ts', output]);
    const reference = JSON.parse(await readFile('src/data/materials.json', 'utf8'));
    const imported = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(imported.length, 92);
    assert.deepEqual(imported, reference);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
