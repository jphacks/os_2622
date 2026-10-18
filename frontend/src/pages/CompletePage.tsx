import { Link, useLocation, Navigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useDemo } from "../state/demo";
import type { CreateBotResponse } from "../types/bot";

type CompleteLocationState = {
  result?: CreateBotResponse;
};

export function CompletePage() {
  const { account, logout } = useDemo();
  const location = useLocation();
  const state = location.state as CompleteLocationState | null;
  const result = state?.result;

  // A direct visit to /complete has no creation result to display.
  if (!result) return <Navigate to="/" replace />;

  return (
    <div className="site-shell">
      <AppHeader account={account} onLogout={logout} />
      <main className="complete-page">
        <div className="success-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">A NEW PET IS BORN</p>
        <h1>ペットが誕生しました！</h1>
        <p className="complete-copy">
          {result.bot.name}がBlueskyの世界へ旅立つ準備ができました。
        </p>

        <section className="pet-summary" aria-label="作成したペット">
          <div className="pet-avatar" aria-hidden="true">☁️</div>
          <h2>{result.bot.name}</h2>
          <p className="pet-personality">{result.bot.personality}</p>
          <div className="tag-list">
            {result.bot.interests.map((interest) => (
              <span className="interest-tag" key={interest}>{interest}</span>
            ))}
          </div>
          <div className="summary-divider" />
          {result.firstPost?.status === "posted" && (
            <p className="field-hint" role="status">最初のあいさつをBlueskyに投稿しました！</p>
          )}
          {result.firstPost?.status === "failed" && (
            <p className="field-error" role="alert">ペットの登録は完了しましたが、最初のあいさつの投稿に失敗しました。</p>
          )}
          {result.additionalPost?.status === "posted" && (
            <p className="field-hint" role="status">ペットの個性をもとにした日常のひとこともBlueskyに投稿しました！</p>
          )}
          {result.additionalPost?.status === "failed" && (
            <p className="field-error" role="alert">ペットの登録は完了しましたが、日常のひとことの生成・投稿に失敗しました。</p>
          )}
        </section>

        <Link to="/mypage" className="button-link">
          <PrimaryButton fullWidth>マイページへ</PrimaryButton>
        </Link>
        <p className="microcopy">ボットID：{result.bot.id}</p>
      </main>
    </div>
  );
}
