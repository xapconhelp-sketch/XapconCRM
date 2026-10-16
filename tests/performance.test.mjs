import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryAll } from '../src/lib/queryAll.js';
import { backgroundRefresh } from '../src/lib/backgroundRefresh.js';

test('paged queries load more than 1000 records without truncating or duplicating them', async () => {
  const rows = Array.from({ length: 1253 }, (_, id) => ({ id }));
  const pages = [];
  const result = await queryAll(async (from, to) => {
    pages.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  });
  assert.deepEqual(result, { data: rows, error: null });
  assert.deepEqual(pages, [[0, 499], [500, 999], [1000, 1499]]);
});

test('paged queries distinguish an empty list from a failed partial read', async () => {
  assert.deepEqual(await queryAll(async () => ({ data: [], error: null })), { data: [], error: null });
  const failure = { message: 'Access denied' };
  assert.deepEqual(await queryAll(async from => from === 0
    ? { data: [{ id: 1 }, { id: 2 }], error: null }
    : { data: null, error: failure }, 2), { data: null, error: failure });
});

test('an exact page boundary requests the last empty page', async () => {
  const rows = [1, 2, 3, 4];
  let calls = 0;
  const result = await queryAll(async (from, to) => {
    calls++;
    return { data: rows.slice(from, to + 1), error: null };
  }, 2);
  assert.deepEqual(result.data, rows);
  assert.equal(calls, 3);
});

test('realtime bursts never overlap and preserve a follow-up refresh', async () => {
  let finish;
  let calls = 0;
  let concurrent = 0;
  let maxConcurrent = 0;
  const runner = backgroundRefresh(async () => {
    calls++;
    maxConcurrent = Math.max(maxConcurrent, ++concurrent);
    if (calls === 1) await new Promise(resolve => { finish = resolve; });
    concurrent--;
  }, () => true);
  const first = runner.refresh();
  await Promise.all([runner.refresh(), runner.refresh(), runner.refresh()]);
  finish();
  await first;
  assert.equal(calls, 2);
  assert.equal(maxConcurrent, 1);
});

test('hidden tabs and disposed contexts do not request data', async () => {
  let visible = false;
  let calls = 0;
  const runner = backgroundRefresh(async () => { calls++; }, () => visible);
  await runner.refresh();
  assert.equal(calls, 0);
  visible = true;
  await runner.refresh();
  runner.stop();
  await runner.refresh();
  assert.equal(calls, 1);
});

test('refresh recovers after a network failure', async () => {
  const errors = [];
  let calls = 0;
  const runner = backgroundRefresh(async () => {
    if (++calls === 1) throw new Error('offline');
  }, () => true, error => errors.push(error.message));
  await runner.refresh();
  await runner.refresh();
  assert.equal(calls, 2);
  assert.deepEqual(errors, ['offline']);
});
