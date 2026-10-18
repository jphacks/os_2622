const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

function loadApi(fetch) {
  const source = readFileSync(resolve(__dirname, '../src/api/bots.ts'), 'utf8')
    .replace('import.meta.env.VITE_API_BASE_URL', '"http://localhost:3001"');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('exports', 'fetch', outputText)(exports, fetch);
  return exports;
}
const bot = { id: 'did:plc:pet', name: 'もち', personality: '好奇心旺盛', interests: ['散歩'], status: 'active', createdAt: '2026-10-18T00:00:00.000Z' };

test('creation uses the login token without resending credentials', async () => {
  const input = { bot: { name: bot.name, personality: bot.personality, interests: bot.interests } };
  const api = loadApi(async (url, options) => {
    assert.equal(url, 'http://localhost:3001/api/bots');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer app-token');
    assert.deepEqual(JSON.parse(options.body), input);
    return Response.json({ bot }, { status: 201 });
  });
  assert.deepEqual(await api.createBot('app-token', input), { bot });
});

test('registered profile and unregistered state come from the API', async () => {
  for (const profile of [bot, null]) {
    const api = loadApi(async (url, options) => {
      assert.equal(url, 'http://localhost:3001/api/bots/me');
      assert.equal(options.headers.Authorization, 'Bearer app-token');
      return Response.json({ bot: profile });
    });
    assert.deepEqual(await api.getMyBot('app-token'), profile);
  }
});

test('registration errors retain status, code, and field messages', async () => {
  const error = { code: 'VALIDATION_ERROR', message: '入力内容を確認してください。', fields: { name: '名前が必要です。' } };
  const api = loadApi(async () => Response.json({ error }, { status: 400 }));
  await assert.rejects(api.createBot('app-token', { bot }), (result) => {
    assert.equal(result.status, 400);
    assert.equal(result.code, error.code);
    assert.deepEqual(result.fields, error.fields);
    return true;
  });
});

test('profile fetch failure is not treated as an unregistered account', async () => {
  const api = loadApi(async () => Response.json({ error: 'PDS unavailable' }, { status: 502 }));
  await assert.rejects(api.getMyBot('app-token'));
});
