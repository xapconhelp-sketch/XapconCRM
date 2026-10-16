import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

test('compiled weather function runs with native Node ESM resolution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xapcon-weather-esm-'));
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
    for (const file of ['api/contractor-weather.ts', 'server/contractorWeather.ts', 'server/requestCache.ts']) {
      const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
      const destination = join(root, file.replace(/\.ts$/, '.js'));
      await mkdir(dirname(destination), { recursive: true });
      const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
      await writeFile(destination, output.outputText);
    }
    const entry = pathToFileURL(join(root, 'api/contractor-weather.js')).href;
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      const {default: handler} = await import(${JSON.stringify(entry)});
      const response = {statusCode: 200, setHeader() {}, end(body) {this.body = JSON.parse(body);}};
      await handler({method: 'GET', url: '/api/contractor-weather'}, response);
      console.log(JSON.stringify({status: response.statusCode, error: response.body.error}));
    `], { encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.equal(result.status, 400);
    assert.match(result.error, /dirección/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
