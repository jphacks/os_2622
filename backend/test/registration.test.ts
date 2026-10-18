import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import type { AtpSessionData } from '@atproto/api';
import {
  registerBot, RegistrationError, type RegistrationDependencies, type ValidatedCreateBotInput,
} from '../src/bot-registration.js';

// Keep credentials, the real database, and external services out of these tests.
process.env.DOTENV_CONFIG_PATH = '.env.test-not-present';
process.env.DATABASE_PATH = ':memory:';
process.env.ENCRYPTION_KEY = '0'.repeat(64);
process.env.GEMINI_API_KEY = 'test-gemini-key';
const { default: env } = await import('../src/config.js');
const { BskyAgent } = await import('@atproto/api');
const { PET_PROFILE_COLLECTION, PET_PROFILE_RKEY } = await import('../src/pet-profile-record.js');
const { publishPetPost } = await import('../src/pet-post.js');
type PostInput = Parameters<InstanceType<typeof BskyAgent>['post']>[0];

const did = 'did:plc:test';
const profileUri = `at://${did}/${PET_PROFILE_COLLECTION}/${PET_PROFILE_RKEY}`;
const input: ValidatedCreateBotInput = {
  account: { identifier: 'test.bsky.social', appPassword: 'test-password' },
  bot: { name: 'もち', personality: '好奇心旺盛', interests: ['散歩'] },
};
// Deliberately different from the submitted form, to detect accidental reuse.
const savedProfile = { name: 'ぽち', personality: 'のんびり', interests: ['ひなたぼっこ', 'お昼寝'] };
const generatedText = 'ひなたでおひるねしたよ。';

beforeEach(() => {
  env.GEMINI_API_KEY = 'test-gemini-key';
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network request'); });
});
afterEach(() => mock.restoreAll());

function setup() {
  const events: string[] = [];
  const agent = new BskyAgent({ service: 'https://pds.example' });
  const account = {
    did, handle: 'test.bsky.social', pdsUrl: 'https://pds.example', agent,
    session: { did, handle: 'test.bsky.social', accessJwt: 'access', refreshJwt: 'refresh', active: true } satisfies AtpSessionData,
  };
  const getRecord = mock.method(agent.com.atproto.repo, 'getRecord', async () => {
    events.push('readProfile');
    return {
      success: true, headers: {}, data: { uri: profileUri, value: { $type: PET_PROFILE_COLLECTION, ...savedProfile } },
    };
  });
  const post = mock.method(agent, 'post', async ({ text }: PostInput) => {
    const id = text === generatedText ? 'daily' : 'intro';
    events.push(id);
    return { uri: `at://${did}/app.bsky.feed.post/${id}`, cid: `${id}-cid` };
  });
  const generate = mock.method(globalThis, 'fetch', async () => {
    events.push('generate');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: generatedText }] } }] });
  });
  let registered = false;
  const deps: RegistrationDependencies<typeof account> = {
    authenticate: async () => { events.push('authenticate'); return account; },
    isRegistered: () => registered,
    createProfile: async () => { events.push('createProfile'); return profileUri; },
    saveAccount: () => { events.push('saveAccount'); registered = true; },
    onSaved: () => { events.push('onSaved'); },
    publishIntroduction: (pet, text) => pet.agent.post({ text }),
    publishAdditionalPost: publishPetPost,
    now: () => new Date('2026-10-18T00:00:00.000Z'),
  };
  return { deps, events, getRecord, post, generate };
}

test('registration posts a greeting followed by one generated post from the PDS settings', async () => {
  const { deps, events, getRecord, post, generate } = setup();
  const result = await registerBot(input, deps);
  assert.deepEqual(events, ['authenticate', 'createProfile', 'saveAccount', 'onSaved', 'intro', 'readProfile', 'generate', 'daily']);
  assert.deepEqual(result.firstPost, { status: 'posted', uri: `at://${did}/app.bsky.feed.post/intro`, cid: 'intro-cid' });
  assert.deepEqual(result.additionalPost, { status: 'posted', uri: `at://${did}/app.bsky.feed.post/daily`, cid: 'daily-cid' });
  assert.equal(getRecord.mock.callCount(), 1);
  assert.deepEqual(getRecord.mock.calls[0]!.arguments[0], { repo: did, collection: PET_PROFILE_COLLECTION, rkey: PET_PROFILE_RKEY });
  const options = generate.mock.calls[0]!.arguments[1] as RequestInit;
  const prompt = JSON.parse(options.body as string).contents[0].parts[0].text;
  assert.match(prompt, /ペット名: ぽち\n性格: のんびり\n興味: ひなたぼっこ、お昼寝/);
  assert.doesNotMatch(prompt, /もち|好奇心旺盛|散歩/);
  assert.equal(post.mock.callCount(), 2);
  assert.equal(post.mock.calls[0]!.arguments[0]!.text, '初めまして！AIペットのもちです！！');
  assert.equal(post.mock.calls[1]!.arguments[0]!.text, generatedText);
  assert.ok(post.mock.calls[1]!.arguments[0]!.createdAt);
});

test('duplicate registration does not repeat either post', async () => {
  const { deps, post, generate } = setup();
  await registerBot(input, deps);
  await assert.rejects(registerBot(input, deps), { status: 409, code: 'ACCOUNT_ALREADY_REGISTERED' });
  assert.equal(post.mock.callCount(), 2);
  assert.equal(generate.mock.callCount(), 1);
});

test('greeting failure still allows the additional post and leaves registration successful', async () => {
  const { deps, post } = setup();
  deps.publishIntroduction = async () => { throw new Error('Greeting failed'); };
  const result = await registerBot(input, deps);
  assert.deepEqual(result.firstPost, { status: 'failed' });
  assert.equal(result.additionalPost.status, 'posted');
  assert.equal(result.bot.status, 'active');
  assert.equal(post.mock.callCount(), 1);
  assert.equal(post.mock.calls[0]!.arguments[0]!.text, generatedText);
});

for (const failure of ['pds', 'invalid-profile', 'gemini', 'invalid-output', 'missing-key', 'publish'] as const) {
  test(`additional post failure (${failure}) preserves registration and greeting without retrying`, async () => {
    const { deps, getRecord, post, generate } = setup();
    if (failure === 'pds') getRecord.mock.mockImplementation(async () => { throw new Error('PDS unavailable'); });
    if (failure === 'invalid-profile') getRecord.mock.mockImplementation(async () => ({
      success: true, headers: {}, data: { uri: profileUri, value: { name: 'incomplete' } },
    }));
    if (failure === 'gemini') generate.mock.mockImplementation(async () => Response.json({ error: 'unavailable' }, { status: 503 }));
    if (failure === 'invalid-output') generate.mock.mockImplementation(async () => Response.json({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'https://example.com' }] } }],
    }));
    if (failure === 'missing-key') env.GEMINI_API_KEY = '';
    if (failure === 'publish') post.mock.mockImplementation(async ({ text }: PostInput) => {
      if (text === generatedText) throw new Error('Post failed');
      return { uri: 'at://intro', cid: 'intro-cid' };
    });
    const result = await registerBot(input, deps);
    assert.equal(result.bot.status, 'active');
    assert.equal(result.firstPost.status, 'posted');
    assert.deepEqual(result.additionalPost, { status: 'failed' });
    assert.equal(post.mock.callCount(), failure === 'publish' ? 2 : 1);
    assert.equal(generate.mock.callCount(), ['pds', 'invalid-profile', 'missing-key'].includes(failure) ? 0 : 1);
    await assert.rejects(registerBot(input, deps), { status: 409 });
  });
}

test('both posting failures still return a successful registration with separate results', async () => {
  const { deps } = setup();
  deps.publishIntroduction = async () => { throw new Error('Greeting failed'); };
  deps.publishAdditionalPost = async () => { throw new Error('Generation failed'); };
  const result = await registerBot(input, deps);
  assert.equal(result.bot.status, 'active');
  assert.deepEqual(result.firstPost, { status: 'failed' });
  assert.deepEqual(result.additionalPost, { status: 'failed' });
});

for (const stage of ['authenticate', 'createProfile', 'saveAccount'] as const) {
  test(`registration failure at ${stage} prevents both posts`, async () => {
    const { deps, post, getRecord, generate } = setup();
    deps[stage] = () => { throw new RegistrationError(502, 'PDS_REQUEST_FAILED', 'Registration failed'); };
    await assert.rejects(registerBot(input, deps), RegistrationError);
    assert.equal(post.mock.callCount(), 0);
    assert.equal(getRecord.mock.callCount(), 0);
    assert.equal(generate.mock.callCount(), 0);
  });
}
