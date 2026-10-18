import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

// Do not load local credentials or access the database during unit tests.
process.env.DOTENV_CONFIG_PATH = '.env.test-not-present';
process.env.ENCRYPTION_KEY = '0'.repeat(64);
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
const { default: env } = await import('../src/config.js');
const { generatePost, validateAutonomousPost } = await import('../src/ai.js');
const { submitPost } = await import('../src/post.js');
const { encrypt } = await import('../src/crypto.js');
const { BskyAgent } = await import('@atproto/api');
type BlueskyAgent = InstanceType<typeof BskyAgent>;
const pet = {
  id: 'pet-1', account_id: 'account-1', name: 'ぽち', personality: 'のんびり',
  topics: 'ひなたぼっこ', style: 'やさしい', interval_minutes: 120, enabled: 0,
  next_run_at: null, last_post_at: null, last_error: null, created_at: '',
};

beforeEach(() => {
  env.GEMINI_API_KEY = 'test-gemini-key';
  env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
  // Any unmocked request must fail locally instead of reaching a provider.
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network request'); });
});
afterEach(() => mock.restoreAll());

function respond(body: unknown, status = 200) {
  return mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status }));
}

function completed(text: string) {
  return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] };
}

test('uses the Gemini request format with server-side authentication and safety settings', async () => {
  env.GEMINI_MODEL = 'custom-gemini-model';
  const request = respond(completed('  ひなたでおひるねしたよ。  '));
  assert.equal(await generatePost(pet), 'ひなたでおひるねしたよ。');
  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0]!.arguments as unknown as [string, RequestInit];
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/custom-gemini-model:generateContent');
  assert.equal(options.method, 'POST');
  assert.equal(new Headers(options.headers).get('x-goog-api-key'), 'test-gemini-key');
  assert.ok(options.signal instanceof AbortSignal);
  const body = JSON.parse(options.body as string);
  assert.match(body.systemInstruction.parts[0].text, /1〜180文字/);
  assert.match(body.contents[0].parts[0].text, /ペット名: ぽち/);
  assert.equal(body.contents[0].role, 'user');
  assert.deepEqual(body.safetySettings, [
    'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH',
    'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT',
  ].map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' })));
});

test('joins text parts and excludes thought parts', async () => {
  respond({ candidates: [{ finishReason: 'STOP', content: { parts: [
    { text: 'internal reasoning', thought: true }, { text: 'おひさま' }, { text: 'ぽかぽか。' },
  ] } }] });
  assert.equal(await generatePost(pet), 'おひさまぽかぽか。');
});

test('rejects a missing API key before making a request', async () => {
  env.GEMINI_API_KEY = '';
  const request = respond(completed('こんにちは。'));
  await assert.rejects(generatePost(pet), /GEMINI_API_KEY is not configured/);
  assert.equal(request.mock.callCount(), 0);
});

test('rejects blocked prompts even when text is returned', async () => {
  respond({ ...completed('使ってはいけない本文'), promptFeedback: { blockReason: 'SAFETY' } });
  await assert.rejects(generatePost(pet), /blocked by safety filters/);
});

test('rejects candidates marked unsafe', async () => {
  respond({ candidates: [{ finishReason: 'STOP', safetyRatings: [{ blocked: true }],
    content: { parts: [{ text: '使ってはいけない本文' }] } }] });
  await assert.rejects(generatePost(pet), /blocked by safety filters/);
});

for (const finishReason of ['SAFETY', 'MAX_TOKENS', 'RECITATION', undefined]) {
  test(`rejects incomplete output (${finishReason ?? 'missing finish reason'})`, async () => {
    respond({ candidates: [{ finishReason, content: { parts: [{ text: '途中の本文' }] } }] });
    await assert.rejects(generatePost(pet), /generation did not complete/);
  });
}

for (const body of [{}, { candidates: [] }, completed(''), completed('   '),
  { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'thinking' }] } }] }]) {
  test(`rejects empty output: ${JSON.stringify(body)}`, async () => {
    respond(body);
    await assert.rejects(generatePost(pet), /output was empty|1-180 Unicode characters/);
  });
}

test('reports upstream HTTP errors without including provider response contents', async () => {
  respond({ error: { message: 'provider details must not be logged' } }, 429);
  await assert.rejects(generatePost(pet), { message: 'Gemini API HTTP 429' });
});

test('propagates network failures', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(generatePost(pet), /fetch failed/);
});

for (const text of ['https://example.com', 'www.example.com', '@someone hello', '#tag', 'あ'.repeat(181)]) {
  test(`validates generated text: ${text.slice(0, 30)}`, async () => {
    respond(completed(text));
    await assert.rejects(generatePost(pet), /AI output/);
  });
}

test('counts Unicode code points and retains code fence cleanup', () => {
  assert.equal(validateAutonomousPost('🐾'.repeat(180)), '🐾'.repeat(180));
  assert.equal(validateAutonomousPost('```text\nおはよう。\n```'), 'おはよう。');
});

function mockBluesky() {
  const login = mock.method(BskyAgent.prototype, 'login', async () => (
    {} as Awaited<ReturnType<BlueskyAgent['login']>>
  ));
  const post = mock.method(BskyAgent.prototype, 'post', async () => ({
    uri: 'at://did:plc:test/app.bsky.feed.post/test', cid: 'test-cid',
  } as Awaited<ReturnType<BlueskyAgent['post']>>));
  const account = {
    id: 'account-1', did: 'did:plc:test', handle: 'test.bsky.social',
    secret: encrypt('test-password'), token_hash: 'unused-test-token',
  };
  return { login, post, account };
}

test('publishes Gemini-generated content through the Bluesky integration from main', async () => {
  const request = respond(completed('ひなたでおひるねしたよ。'));
  const { login, post, account } = mockBluesky();
  const result = await submitPost(account, pet);
  assert.equal(request.mock.callCount(), 1);
  assert.equal(login.mock.callCount(), 1);
  assert.deepEqual(login.mock.calls[0]!.arguments[0], {
    identifier: account.did, password: 'test-password',
  });
  assert.equal(post.mock.callCount(), 1);
  assert.equal(post.mock.calls[0]!.arguments[0]!.text, 'ひなたでおひるねしたよ。');
  assert.equal(result.success, true);
  assert.equal(result.content, 'ひなたでおひるねしたよ。');
  assert.equal(result.uri, 'at://did:plc:test/app.bsky.feed.post/test');
  assert.equal(result.cid, 'test-cid');
});

test('publishes manually supplied text without calling Gemini', async () => {
  const request = respond(completed('unused'));
  const { post, account } = mockBluesky();
  const result = await submitPost(account, pet, '飼い主からの投稿です。');
  assert.equal(request.mock.callCount(), 0);
  assert.equal(post.mock.calls[0]!.arguments[0]!.text, '飼い主からの投稿です。');
  assert.equal(result.content, '飼い主からの投稿です。');
});

test('does not log in or publish when Gemini blocks generation', async () => {
  respond({ promptFeedback: { blockReason: 'SAFETY' } });
  const { login, post, account } = mockBluesky();
  const logged = mock.method(console, 'error', () => {});
  await assert.rejects(submitPost(account, pet), /blocked by safety filters/);
  assert.equal(login.mock.callCount(), 0);
  assert.equal(post.mock.callCount(), 0);
  assert.equal(logged.mock.callCount(), 1);
});
