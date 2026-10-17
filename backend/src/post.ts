import { randomUUID } from 'node:crypto';
import { db, type Account, type Pet } from './db.js';
import { publish } from './bluesky.js';
import { generatePost } from './ai.js';

type SubmitOptions = {
  /** Recheck the owner's stop switch after generation, before publishing. */
  autonomous?: boolean;
};

export async function submitPost(
  account: Account,
  pet: Pet,
  providedText?: string,
  options: SubmitOptions = {},
) {
 const text=providedText ?? await generatePost(pet);
 if(!text.trim()||Array.from(text).length>300) throw new Error('Post must contain 1-300 Unicode characters');
 if (options.autonomous) {
   const current = db.prepare('SELECT enabled FROM pets WHERE id=?').get(pet.id) as { enabled: number } | undefined;
   if (!current?.enabled) throw new Error('Autonomous posting was stopped by the owner');
 }
 const id=randomUUID();
 try {
   const result=await publish(account,text);
   db.prepare('INSERT INTO posts(id,pet_id,text,uri,cid,status) VALUES(?,?,?,?,?,?)').run(id,pet.id,text,result.uri,result.cid,'published');
   db.prepare('UPDATE pets SET last_post_at=?,last_error=NULL WHERE id=?').run(new Date().toISOString(),pet.id);
   return {id,text,...result,status:'published'};
 } catch(e) {
   const message=e instanceof Error?e.message:'Unknown publish error';
   db.prepare('INSERT INTO posts(id,pet_id,text,status,error) VALUES(?,?,?,?,?)').run(id,pet.id,text,'failed',message);
   db.prepare('UPDATE pets SET last_error=? WHERE id=?').run(message,pet.id);
   throw e;
 }
}
