// backend/src/scheduler.ts
import cron from "node-cron";
import { submitPost } from "./post.js";

export async function runDuePosts(): Promise<void> {
  console.log("⏰ 投稿実行タスクをチェック・処理します");
  // 必要な投稿実行ロジックをここに記述
}

export function initScheduler(): void {
  // 1時間ごとに runDuePosts を実行する設定例
  cron.schedule("0 * * * *", async () => {
    await runDuePosts();
  });
}