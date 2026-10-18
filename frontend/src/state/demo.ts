import { createContext, useContext } from "react";
import type { AuthSession } from "../api/auth";
import type { CreateBotResponse } from "../types/bot";

export type Pet = CreateBotResponse["bot"];
export type DemoState = {
  account: string | null;
  session: AuthSession | null;
  pet: Pet | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  addPet: (pet: Pick<Pet, "name" | "personality" | "interests">) => Promise<CreateBotResponse>;
};
export const DemoContext = createContext<DemoState | null>(null);
export function useDemo() {
  const state = useContext(DemoContext);
  if (!state) throw new Error("DemoProvider is required");
  return state;
}
