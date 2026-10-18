// backend/src/post.ts
import { generatePost } from "./ai.js";
import type { Pet } from "./db.js";

// index.ts から渡される3つの引数 (account, pet, text) を受け取れるように定義
export async function submitPost(
  account: any,      // アカウント情報（必要に応じて型を指定）
  pet: Pet,          // ペット情報
  text?: string      // 手動入力のテキスト（空の場合はAIで生成）
): Promise<any> {
  try {
    // 手動入力テキストが無い場合は、AI（generatePost）で自動生成する
    const postContent = text || (await generatePost(pet));

    // TODO: 既存の bluesky 送信処理や DB ログ保存処理を呼び出す
    console.log(`[投稿実行] アカウント: ${account.id || "unknown"}, ペット: ${pet.name}, 内容: ${postContent}`);

    // index.ts のレスポンス用に結果オブジェクト等を返す
    return {
      success: true,
      content: postContent,
      postedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[投稿失敗] ${pet.name}:`, error);
    throw error;
  }
}