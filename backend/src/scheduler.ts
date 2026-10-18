// backend/src/scheduler.ts
import cron from "node-cron";
import { submitPost } from "./post.js";
import * as db from "./db.js"; 

export async function runDuePosts(): Promise<void> {
  console.log("⏰ 投稿実行タスクをチェック・処理します");
  try {
    // db.ts にあるアクティブペット取得関数を呼び出す（例: getActivePets や getPets 等）
    // db.ts 側の関数名に合わせて変更するか、存在チェックを行って呼び出します
    const activePets: any[] = typeof (db as any).getActivePets === 'function' 
      ? await (db as any).getActivePets() 
      : [];

    for (const pet of activePets) {
      // ペットデータに紐付くアカウント情報 (pet.account) を渡して投稿実行
      if (pet.account) {
        await submitPost(pet.account, pet);
      }
    }
  } catch (error) {
    console.error("スケジューラー実行エラー:", error);
  }
}

export function initScheduler(): void {
  // 1時間ごとに自動投稿タスクを実行
  cron.schedule("0 * * * *", async () => {
    await runDuePosts();
  });
}