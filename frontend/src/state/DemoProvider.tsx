import { useEffect, useRef, useState, type ReactNode } from "react";
import { connectAccount, getAccount, type AuthSession } from "../api/auth";
import { DemoContext, type DemoData, type Pet } from "./demo";

const STORAGE_KEY = "peta-pet-v2";
const SESSION_KEY = "peta-session-v1";
function loadData(): DemoData {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as DemoData | null;
    if (saved?.petsByDid && typeof saved.petsByDid === "object") return saved;
  } catch { /* Ignore unreadable mock data. */ }
  return { petsByDid: {} };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(loadData);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const dataRef = useRef(data);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as AuthSession | null;
        if (saved?.token) {
          const account = await getAccount(saved.token);
          if (!cancelled) setSession({ token: saved.token, account });
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  async function login(identifier: string, password: string) {
    const next = await connectAccount(identifier, password);
    // Store only the app token and public account fields, never the password.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }
  function addPet(input: Pick<Pet, "name" | "personality" | "interests">): Pet {
    if (!session) throw new Error("Login required");
    const did = session.account.did;
    if (dataRef.current.petsByDid[did]) throw new Error("このアカウントには既にペットが設定されています。");
    // The Bluesky account itself identifies the pet, matching /api/bots.
    const pet: Pet = { ...input, id: did, status: "active", createdAt: new Date().toISOString() };
    const next = { petsByDid: { ...dataRef.current.petsByDid, [did]: pet } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
    return pet;
  }

  if (isRestoring) return <p className="field-hint" role="status">ログイン状態を確認しています...</p>;
  return <DemoContext.Provider value={{
    account: session?.account.handle ?? null,
    session,
    pet: session ? data.petsByDid[session.account.did] ?? null : null,
    login, logout, addPet,
  }}>{children}</DemoContext.Provider>;
}
