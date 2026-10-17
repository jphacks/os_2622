import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import env from './config.js';
const key=Buffer.from(env.ENCRYPTION_KEY,'hex');
export function encrypt(value:string):string {
  const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',key,iv);
  const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64url')).join('.');
}
export function decrypt(encoded:string):string {
  const parts=encoded.split('.'); if(parts.length!==3) throw new Error('Invalid encrypted value');
  const [iv,tag,data]=parts.map(v=>Buffer.from(v!,'base64url'));
  const decipher=createDecipheriv('aes-256-gcm',key,iv!); decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!),decipher.final()]).toString('utf8');
}
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');
