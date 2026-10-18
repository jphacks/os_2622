export type Account = { id: string; did: string; handle: string };
export type AuthSession = { token: string; account: Account };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = response.status === 401
      ? "ログイン情報を確認してください。"
      : response.status === 429
        ? "試行回数が多すぎます。時間をおいて再度お試しください。"
        : "ログインできませんでした。認証情報とサーバーの接続状況を確認してください。";
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function connectAccount(identifier: string, password: string): Promise<AuthSession> {
  return readResponse<AuthSession>(await fetch(`${API_BASE_URL}/api/auth/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  }));
}

export async function getAccount(token: string): Promise<Account> {
  return readResponse<Account>(await fetch(`${API_BASE_URL}/api/account`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}
