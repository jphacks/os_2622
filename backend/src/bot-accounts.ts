import type { AtpSessionData } from '@atproto/api';
import { decrypt, encrypt } from './crypto.js';
import { db, type BotAccount } from './db.js';
import { z } from 'zod';

// Persist only SDK session fields, never arbitrary account input.
const sessionSchema = z.object({
  accessJwt: z.string().min(1), refreshJwt: z.string().min(1),
  did: z.string().startsWith('did:'), handle: z.string().min(1), active: z.boolean(),
  email: z.string().optional(), emailConfirmed: z.boolean().optional(),
  emailAuthFactor: z.boolean().optional(), status: z.string().optional(),
});

export function findBotAccount(did: string): BotAccount | undefined {
  return db.prepare('SELECT * FROM bot_accounts WHERE did=?').get(did) as BotAccount | undefined;
}

export function saveBotAccount(input: {
  did: string;
  handle: string;
  pdsUrl: string;
  session: AtpSessionData;
  profileUri: string;
  createdAt: string;
}): void {
  db.prepare(`
    INSERT INTO bot_accounts(did, handle, pds_url, encrypted_session, profile_uri, created_at)
    VALUES(?, ?, ?, ?, ?, ?)
  `).run(input.did, input.handle, input.pdsUrl, encrypt(JSON.stringify(sessionSchema.parse(input.session))), input.profileUri, input.createdAt);
}

export function updateBotSession(did: string, session: AtpSessionData, pdsUrl: string): void {
  const result = db.prepare('UPDATE bot_accounts SET encrypted_session=?,handle=?,pds_url=? WHERE did=?')
    .run(encrypt(JSON.stringify(sessionSchema.parse(session))), session.handle, pdsUrl, did);
  if (result.changes !== 1) throw new Error('Bot account session target was not found');
}

export function readBotSession(account: BotAccount): AtpSessionData {
  const session = sessionSchema.parse(JSON.parse(decrypt(account.encrypted_session)));
  if (session.did !== account.did) throw new Error('Stored session DID mismatch');
  return session;
}
