import { BskyAgent, type AtpSessionData, type AtpSessionEvent } from '@atproto/api';
import { findBotAccount, readBotSession, updateBotSession } from './bot-accounts.js';
import { RegistrationError, type RegistrationAccount } from './bot-registration.js';

export const PET_PROFILE_COLLECTION = 'com.nyuun.peta.profile';
export const PET_PROFILE_RKEY = 'self';

export type AuthenticatedPetAccount = RegistrationAccount & {
  agent: BskyAgent;
  enableSessionPersistence(): void;
};

function sessionAgent(service: string, fetchImplementation: typeof fetch, persist: (session: AtpSessionData, pdsUrl: string) => void) {
  let refreshFailure: 'invalid-session' | 'temporary-failure' | undefined;
  let persistenceFailed = false;
  const agent = new BskyAgent({
    service,
    fetch: async (input, init) => {
      if (persistenceFailed) throw new Error('Session persistence failed');
      const url = input instanceof Request ? input.url : String(input);
      const isRefresh = new URL(url).pathname.endsWith('/com.atproto.server.refreshSession');
      try {
        const response = await fetchImplementation(input, init);
        if (isRefresh) {
          // This SDK version rethrows the original access-token error if refresh
          // fails. Retain the actual refresh failure category for restoration.
          refreshFailure = response.ok ? undefined : response.status === 401 || response.status === 403
            ? 'invalid-session' : 'temporary-failure';
          if (response.status === 400) {
            const body = await response.clone().json().catch(() => null) as {error?: string} | null;
            if (body?.error === 'InvalidToken' || body?.error === 'ExpiredToken') refreshFailure = 'invalid-session';
          }
        }
        return response;
      } catch (error) {
        if (isRefresh) refreshFailure = 'temporary-failure';
        throw error;
      }
    },
    persistSession: (event: AtpSessionEvent, session?: AtpSessionData) => {
      if (session && (event === 'create' || event === 'update')) {
        try { persist(session, agent.dispatchUrl.toString()); }
        catch { persistenceFailed = true; }
      }
    },
  });
  return {agent, get refreshFailure() { return refreshFailure; }, get persistenceFailed() { return persistenceFailed; }};
}

export async function authenticatePetAccount(identifier: string, appPassword: string, fetchImplementation: typeof fetch = globalThis.fetch): Promise<AuthenticatedPetAccount> {
  let persistenceEnabled = false;
  const managed = sessionAgent('https://bsky.social', fetchImplementation, (session, pdsUrl) => {
    if (persistenceEnabled) updateBotSession(session.did, session, pdsUrl);
  });
  const {agent} = managed;
  try {
    await agent.login({identifier, password: appPassword});
  } catch (error) {
    if (isAuthenticationFailure(error)) {
      throw new RegistrationError(401, 'ACCOUNT_AUTH_FAILED', 'Blueskyの認証情報を確認してください。');
    }
    throw new RegistrationError(502, 'PDS_REQUEST_FAILED', 'Blueskyとの通信に失敗しました。時間をおいて再度お試しください。');
  }
  if (!agent.session || !agent.session.active) {
    throw new RegistrationError(401, 'ACCOUNT_AUTH_FAILED', 'このBlueskyアカウントは現在利用できません。');
  }
  return {
    agent,
    get did() { return agent.session!.did; },
    get handle() { return agent.session!.handle; },
    get pdsUrl() { return agent.dispatchUrl.toString(); },
    get session() { return agent.session!; },
    enableSessionPersistence() { persistenceEnabled = true; },
  };
}

export async function createPetProfile(account: Pick<AuthenticatedPetAccount, 'agent' | 'did'>, profile: {name: string; personality: string; interests: string[]}): Promise<string> {
  const params = { repo: account.did, collection: PET_PROFILE_COLLECTION, rkey: PET_PROFILE_RKEY };
  try {
    await account.agent.com.atproto.repo.getRecord(params);
    throw new RegistrationError(409, 'ACCOUNT_ALREADY_REGISTERED', 'このアカウントには既にペット設定があります。');
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    if (!isRecordNotFound(error)) {
      throw new RegistrationError(502, 'PDS_REQUEST_FAILED', 'ペット設定の確認に失敗しました。時間をおいて再度お試しください。');
    }
  }

  try {
    const response = await account.agent.com.atproto.repo.createRecord({
      ...params,
      record: { $type: PET_PROFILE_COLLECTION, ...profile },
    });
    return response.data.uri;
  } catch (error) {
    if (isAlreadyExists(error)) {
      throw new RegistrationError(409, 'ACCOUNT_ALREADY_REGISTERED', 'このアカウントには既にペット設定があります。');
    }
    // A concurrent create must never overwrite self. Some PDSs return a generic
    // error for that conflict; confirm existence once, without retrying writes.
    try {
      await account.agent.com.atproto.repo.getRecord(params);
      throw new RegistrationError(409, 'ACCOUNT_ALREADY_REGISTERED', 'このアカウントには既にペット設定があります。');
    } catch (checkError) {
      if (checkError instanceof RegistrationError) throw checkError;
    }
    throw new RegistrationError(502, 'PDS_REQUEST_FAILED', 'ペット設定をBlueskyへ保存できませんでした。時間をおいて再度お試しください。');
  }
}

export type RestorePetSessionResult =
  | { ok: true; agent: BskyAgent }
  | { ok: false; reason: 'not-found' | 'invalid-session' | 'temporary-failure' | 'local-failure' };

export async function restorePetAgent(did: string, fetchImplementation: typeof fetch = globalThis.fetch): Promise<RestorePetSessionResult> {
  let account;
  let session;
  try {
    account = findBotAccount(did);
    if (!account) return {ok: false, reason: 'not-found'};
    session = readBotSession(account);
  } catch {
    return {ok: false, reason: 'local-failure'};
  }
  let managed;
  try {
    managed = sessionAgent(account.pds_url, fetchImplementation, (updated, pdsUrl) => updateBotSession(did, updated, pdsUrl));
    await managed.agent.resumeSession(session);
    if (managed.persistenceFailed) return {ok: false, reason: 'local-failure'};
    if (!managed.agent.session?.active) return {ok: false, reason: 'invalid-session'};
    return {ok: true, agent: managed.agent};
  } catch (error) {
    if (managed?.persistenceFailed) return {ok: false, reason: 'local-failure'};
    return {ok: false, reason: managed?.refreshFailure ?? (isAuthenticationFailure(error) ? 'invalid-session' : 'temporary-failure')};
  }
}

function errorShape(error: unknown): {status?: number; error?: string; message?: string} {
  return typeof error === 'object' && error !== null ? error as {status?: number; error?: string; message?: string} : {};
}

function isAuthenticationFailure(error: unknown): boolean {
  const value = errorShape(error);
  return value.status === 401 || ['AuthenticationRequired', 'ExpiredToken', 'InvalidToken', 'InvalidDID', 'AuthFactorTokenRequired', 'AccountTakedown'].includes(value.error ?? '');
}

function isRecordNotFound(error: unknown): boolean {
  const value = errorShape(error);
  return value.error === 'RecordNotFound';
}

function isAlreadyExists(error: unknown): boolean {
  const value = errorShape(error);
  return value.error === 'RecordAlreadyExists' || /already exists/i.test(value.message ?? '');
}
