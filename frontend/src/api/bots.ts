import type { ApiErrorResponse, CreateBotRequest, CreateBotResponse } from "../types/bot";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function createBot(
  token: string,
  payload: CreateBotRequest,
): Promise<CreateBotResponse> {
  const response = await fetch(`${API_BASE_URL}/api/bots`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const message = body?.error?.message ?? "ボットを作成できませんでした。入力内容を確認してください。";
    const error = new Error(message) as Error & {
      status?: number;
      code?: string;
      fields?: Record<string, string>;
    };
    error.status = response.status;
    error.code = body?.error?.code;
    error.fields = body?.error?.fields;
    throw error;
  }

  return (await response.json()) as CreateBotResponse;
}

export async function getMyBot(token: string): Promise<CreateBotResponse["bot"] | null> {
  const response = await fetch(`${API_BASE_URL}/api/bots/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("ペット情報を取得できませんでした。時間をおいて再度ログインしてください。");
  const result = await response.json() as { bot: CreateBotResponse["bot"] | null };
  return result.bot;
}
