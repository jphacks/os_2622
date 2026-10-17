import { Link, useLocation, Navigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import type { CreateBotResponse } from "../types/bot";

type CompleteLocationState = {
  result?: CreateBotResponse;
};

export function CompletePage() {
  const location = useLocation();
  const state = location.state as CompleteLocationState | null;
  const result = state?.result;

  // A direct visit to /complete has no creation result to display.
  if (!result) return <Navigate to="/" replace />;

  return (
    <div className="site-shell">
      <AppHeader />
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
        </section>

        <Link to="/" className="button-link">
          <PrimaryButton fullWidth>トップに戻る</PrimaryButton>
        </Link>
        <p className="microcopy">ボットID：{result.bot.id}</p>
      </main>
    </div>
  );
}
