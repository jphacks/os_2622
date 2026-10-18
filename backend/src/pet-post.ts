import { generatePost } from './ai.js';
import type { AuthenticatedPetAccount } from './pet-profile.js';
import { readPetProfile } from './pet-profile-record.js';

/** Generate and publish one everyday post using the settings saved on the PDS. */
export async function publishPetPost(account: Pick<AuthenticatedPetAccount, 'agent' | 'did'>): Promise<{ uri: string; cid: string }> {
  const profile = await readPetProfile(account);
  const text = await generatePost({
    name: profile.name,
    personality: profile.personality,
    topics: profile.interests.join('、'),
    style: '',
  });
  return account.agent.post({ text, createdAt: new Date().toISOString() });
}
