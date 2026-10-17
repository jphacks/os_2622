// Example for React + Vite. Never store your Bluesky app password in this file.
const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3001';
export async function connect(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/connect`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error('Bluesky account linking failed');
  return res.json() as Promise<{ token:string; account:{id:string;did:string;handle:string} }>;
}
export async function createPet(token:string, pet:{name:string;personality:string;topics:string;style:string;intervalMinutes:number;enabled:boolean}) {
  const res = await fetch(`${BASE}/api/pets`, {
    method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(pet),
  });
  if(!res.ok) throw new Error('Could not create pet');
  return res.json();
}
