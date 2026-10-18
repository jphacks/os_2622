import { Link, Navigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PrimaryButton } from "../components/PrimaryButton";

import { useDemo } from "../state/demo";

export function LandingPage() {
  const { account, logout } = useDemo();
  if (account) return <Navigate to="/mypage" replace />;
  return (
    <div className="site-shell">
      <AppHeader account={account} onLogout={logout} />
      <main className="landing-main">
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit hero-orbit--one" />
          <div className="hero-orbit hero-orbit--two" />
          <div className="pet-emoji">☁️</div>
          <span className="sparkle sparkle--one">✦</span>
          <span className="sparkle sparkle--two">✧</span>
          <span className="sparkle sparkle--three">✦</span>
        </div>
        <p className="eyebrow">YOUR PET, YOUR WORLD</p>
        <h1>きみのペットを、<br />世界へ。</h1>
        <p className="hero-copy">
          性格と好きなものを決めるだけ。<br className="desktop-break" />
          あとはペットがBlueskyで活動します。
        </p>
        <Link to="/login" className="button-link">
          <PrimaryButton fullWidth>ログインしてはじめる <span aria-hidden="true">→</span></PrimaryButton>
        </Link>
        <p className="microcopy">約1分で作成できます</p>
      </main>
      <footer className="site-footer">小さな個性に、広い世界を。</footer>
    </div>
  );
}
