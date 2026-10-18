import { createContext, useContext } from "react";
import type { CreateBotResponse } from "../types/bot";

export type Pet = CreateBotResponse["bot"];
export type DemoData = { account: string | null; petsByAccount: Record<string, Pet[]> };
export type DemoState = {
  account: string | null;
  pets: Pet[];
  login: (identifier: string) => void;
  logout: () => void;
  addPet: (pet: Pick<Pet, "name" | "personality" | "interests">) => Pet;
};
export const DemoContext = createContext<DemoState | null>(null);
export function useDemo() {
  const state = useContext(DemoContext);
  if (!state) throw new Error("DemoProvider is required");
  return state;
}
