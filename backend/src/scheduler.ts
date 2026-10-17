import { db, type Account, type Pet } from './db.js';
import { submitPost } from './post.js';
let busy=false;
export async function runDuePosts() {
 if(busy)return; busy=true;
 try {
  const now=new Date().toISOString();
  const due=db.prepare('SELECT * FROM pets WHERE enabled=1 AND next_run_at IS NOT NULL AND next_run_at<=? LIMIT 10').all(now) as Pet[];
  for(const pet of due){
    // Claim before network call to avoid immediate repeated posts after failure.
    const next=new Date(Date.now()+pet.interval_minutes*60000).toISOString();
    const claim=db.prepare('UPDATE pets SET next_run_at=? WHERE id=? AND enabled=1 AND next_run_at=?').run(next,pet.id,pet.next_run_at);
    if(!claim.changes)continue;
    const account=db.prepare('SELECT * FROM accounts WHERE id=?').get(pet.account_id) as Account|undefined;
    if(!account)continue;
    try {
      // A user may have disabled the pet while its turn was waiting in this
      // scheduler batch. Recheck immediately before the AI/network work.
      const stillEnabled = db.prepare('SELECT enabled FROM pets WHERE id=?').get(pet.id) as { enabled: number } | undefined;
      if (!stillEnabled?.enabled) continue;
      await submitPost(account, pet, undefined, { autonomous: true });
    } catch(error){console.error('Scheduled publish failed for',pet.id,error);}
  }
 }finally{busy=false;}
}
