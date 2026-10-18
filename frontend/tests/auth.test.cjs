const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

function loadAuth(fetch) {
  const source = readFileSync(resolve(__dirname, '../src/api/auth.ts'), 'utf8')
    .replace('import.meta.env.VITE_API_BASE_URL', '"http://localhost:3001"');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('exports', 'fetch', outputText)(exports, fetch);
  return exports;
}

const account = { id: 'account-1', did: 'did:plc:pet1', handle: 'pet.bsky.social' };

test('login sends backend credentials and receives the app session', async () => {
  const session = { token: 'app-token', account };
  const api = loadAuth(async (url, options) => {
    assert.equal(url, 'http://localhost:3001/api/auth/connect');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { identifier: account.handle, password: 'app-password' });
    return Response.json(session);
  });
  assert.deepEqual(await api.connectAccount(account.handle, 'app-password'), session);
});

test('restoring an account uses the app bearer token', async () => {
  const api = loadAuth(async (url, options) => {
    assert.equal(url, 'http://localhost:3001/api/account');
    assert.equal(options.headers.Authorization, 'Bearer app-token');
    return Response.json(account);
  });
  assert.deepEqual(await api.getAccount('app-token'), account);
});

test('authentication and rate-limit failures are not accepted as sessions', async () => {
  for (const status of [401, 429, 502]) {
    const api = loadAuth(async () => Response.json({ error: 'upstream failure' }, { status }));
    await assert.rejects(api.connectAccount(account.handle, 'invalid-password'));
    await assert.rejects(api.getAccount('invalid-token'));
  }
});
