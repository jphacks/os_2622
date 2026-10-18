import { useEffect, useRef, useState, type ReactNode } from "react";
import { connectAccount, getAccount, type AuthSession } from "../api/auth";
import { createBot, getMyBot } from "../api/bots";
import { DemoContext, type Pet } from "./demo";
import type { CreateBotResponse } from "../types/bot";

const SESSION_KEY = "peta-session-v1";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const currentSession = useRef<AuthSession | null>(null);
  const creating = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as AuthSession | null;
        if (saved?.token) {
          const account = await getAccount(saved.token);
          const registeredPet = await getMyBot(saved.token);
          if (!cancelled) {
            currentSession.current = { token: saved.token, account };
            setSession(currentSession.current);
            setPet(registeredPet);
          }
        }
      } catch {
        if (!cancelled) sessionStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  async function login(identifier: string, password: string) {
    const next = await connectAccount(identifier, password);
    const registeredPet = await getMyBot(next.token);
    // Store only the app token and public account fields, never the password.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    currentSession.current = next;
    setSession(next);
    setPet(registeredPet);
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    currentSession.current = null;
    setSession(null);
    setPet(null);
  }
  async function addPet(input: Pick<Pet, "name" | "personality" | "interests">): Promise<CreateBotResponse> {
    const activeSession = currentSession.current;
    if (!activeSession) throw new Error("ログインしてください。");
    if (pet || creating.current) throw new Error("このアカウントには既にペットが設定されているか、作成中です。");
    creating.current = true;
    try {
      const result = await createBot(activeSession.token, { bot: input });
      if (currentSession.current !== activeSession) throw new Error("ログイン状態が変更されました。再度ログインしてください。");
      setPet(result.bot);
      return result;
    } catch (error) {
      // Recover the authoritative profile after duplicate registration or a lost response.
      try {
        const registeredPet = await getMyBot(activeSession.token);
        if (currentSession.current === activeSession) setPet(registeredPet);
      } catch { /* Preserve the original registration error. */ }
      throw error;
    } finally {
      creating.current = false;
    }
  }

  if (isRestoring) return <p className="field-hint" role="status">ログイン状態を確認しています...</p>;
  return <DemoContext.Provider value={{
    account: session?.account.handle ?? null,
    session, pet, login, logout, addPet,
  }}>{children}</DemoContext.Provider>;
}
