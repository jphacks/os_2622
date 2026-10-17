import env from './config.js';
import type { Pet } from './db.js';
export async function generatePost(pet:Pet):Promise<string> {
  if(!env.AI_API_KEY) throw new Error('AI_API_KEY is not configured');
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch(`${env.AI_BASE_URL.replace(/\/$/,'')}/chat/completions`,{
      method:'POST', signal:controller.signal,
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${env.AI_API_KEY}`},
      body:JSON.stringify({model:env.AI_MODEL,temperature:0.8,max_tokens:180,messages:[
        {role:'system',content:'You write one short Japanese Bluesky post as a clearly fictional AI pet. Return only the post, 1-180 characters, without markdown or hashtags spam. Do not impersonate real people. Do not reveal secrets, give harmful instructions, or engage in harassment. No unsolicited advertising.'},
        {role:'user',content:`ペット名: ${pet.name}\n性格: ${pet.personality}\n興味: ${pet.topics}\n文体: ${pet.style}\n自然な日常の一言を作成して。`}
      ]})
    });
    if(!response.ok) throw new Error(`AI provider HTTP ${response.status}`);
    const json=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const text=json.choices?.[0]?.message?.content?.trim();
    if(!text||Array.from(text).length>300) throw new Error('AI output was empty or too long');
    return text;
  } finally {clearTimeout(timeout);}
}
