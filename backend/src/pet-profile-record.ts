import type { BskyAgent } from '@atproto/api';
import { validateCreateBotInput, type ValidatedCreateBotInput } from './bot-registration.js';

export const PET_PROFILE_COLLECTION = 'com.nyuun.peta.profile';
export const PET_PROFILE_RKEY = 'self';

/** Read the authoritative settings from the pet's PDS, rather than form input. */
export async function readPetProfile(account: { agent: BskyAgent; did: string }): Promise<ValidatedCreateBotInput['bot']> {
  const response = await account.agent.com.atproto.repo.getRecord({
    repo: account.did, collection: PET_PROFILE_COLLECTION, rkey: PET_PROFILE_RKEY,
  });
  const { bot } = validateCreateBotInput({
    account: { identifier: account.did, appPassword: 'profile-validation-only' },
    bot: response.data.value,
  });
  return bot;
}
