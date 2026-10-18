// backend/src/post.ts
import { generatePost } from "./ai.js";
import type { Pet, Account } from "./db.js";
import { publish } from "./bluesky.js"; // bluesky.ts の publish をインポート

export async function submitPost(
  account: Account,
  pet: Pet,
  text?: string
): Promise<any> {
  try {
    // 1. 手動テキストがない場合は AI（generatePost）で投稿文を生成
    const postContent = text || (await generatePost(pet));

    // 2. bluesky.ts の publish 関数を使って Bluesky へ投稿
    const result = await publish(account, postContent);

    console.log(`[投稿成功] ペット: ${pet.name}, URI: ${result.uri}`);

    return {
      success: true,
      content: postContent,
      uri: result.uri,
      cid: result.cid,
      postedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[投稿失敗] ${pet.name}:`, error);
    throw error;
  }
}