import { useState, type ReactNode } from "react";
import { DemoContext, type DemoData, type Pet } from "./demo";

const STORAGE_KEY = "peta-demo-v1";
function loadData(): DemoData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as DemoData;
      if ((data.account === null || typeof data.account === "string") && data.petsByAccount && typeof data.petsByAccount === "object") return data;
    }
  } catch { /* Start with an empty demo if saved data cannot be read. */ }
  return { account: null, petsByAccount: {} };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(loadData);
  function save(next: DemoData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setData(next);
  }
  function addPet(input: Pick<Pet, "name" | "personality" | "interests">): Pet {
    if (!data.account) throw new Error("Login required");
    const pet: Pet = { ...input, id: crypto.randomUUID(), status: "active", createdAt: new Date().toISOString() };
    save({ ...data, petsByAccount: { ...data.petsByAccount, [data.account]: [pet, ...(data.petsByAccount[data.account] ?? [])] } });
    return pet;
  }
  return <DemoContext.Provider value={{
    account: data.account,
    pets: data.account ? data.petsByAccount[data.account] ?? [] : [],
    login: (identifier) => save({ ...data, account: identifier.trim().toLowerCase() }),
    logout: () => save({ ...data, account: null }),
    addPet,
  }}>{children}</DemoContext.Provider>;
}
