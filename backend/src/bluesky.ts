import { BskyAgent } from '@atproto/api';
import type { Account } from './db.js';
import { decrypt } from './crypto.js';
export async function login(identifier:string,password:string) {
  const agent=new BskyAgent({service:'https://bsky.social'});
  const session=await agent.login({identifier,password});
  return {did:session.data.did,handle:session.data.handle};
}
export async function publish(account:Account,text:string) {
  const agent=new BskyAgent({service:'https://bsky.social'});
  await agent.login({identifier:account.did,password:decrypt(account.secret)});
  const result=await agent.post({text,createdAt:new Date().toISOString()});
  return {uri:result.uri,cid:result.cid};
}
