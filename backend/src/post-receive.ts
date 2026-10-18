import type { BskyAgent } from '@atproto/api';
import { restorePetAgent, type RestorePetSessionResult } from './pet-profile.js';

export class PostReceiveError extends Error {
  constructor(readonly status: 400 | 401 | 404 | 502, message: string) {
    super(message);
  }
}

type RestoreAgent = (did: string) => Promise<RestorePetSessionResult>;

export type ReceivedPost = {
  did: string;
  text: string;
};

export type PublishedPost = {
  uri: string;
  cid: string;
  text: string;
};

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') throw new PostReceiveError(400, 'text must be a string');
  const text = value.trim();
  const length = Array.from(text).length;
  if (length === 0 || length > 300) {
    throw new PostReceiveError(400, 'text must contain 1-300 Unicode characters');
  }
  return text;
}

/**
 * Receives already-decided post content and publishes it as a registered pet.
 * Content generation deliberately remains outside this module.
 */
export async function receivePost(
  input: ReceivedPost,
  dependencies: { restoreAgent?: RestoreAgent } = {},
): Promise<PublishedPost> {
  const text = normalizeText(input.text);
  const restoreAgent = dependencies.restoreAgent ?? restorePetAgent;
  const restored = await restoreAgent(input.did);

  if (!restored.ok) {
    if (restored.reason === 'not-found') throw new PostReceiveError(404, 'Pet account not found');
    if (restored.reason === 'invalid-session') throw new PostReceiveError(401, 'Pet account session has expired');
    throw new PostReceiveError(502, 'Pet account session could not be restored');
  }

  try {
    const result = await post(restored.agent, text);
    return { text, uri: result.uri, cid: result.cid };
  } catch {
    throw new PostReceiveError(502, 'Bluesky post could not be created');
  }
}

function post(agent: BskyAgent, text: string) {
  return agent.post({ text, createdAt: new Date().toISOString() });
}
