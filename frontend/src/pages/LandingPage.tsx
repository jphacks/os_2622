import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PrimaryButton } from "../components/PrimaryButton";

export function LandingPage() {
  return (
    <div className="site-shell">
      <AppHeader/>
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
        <Link to="/create" className="button-link">
          <PrimaryButton fullWidth>ペットを作る <span aria-hidden="true">→</span></PrimaryButton>
        </Link>
        <p className="microcopy">約1分で作成できます</p>
      </main>
      <footer className="site-footer">小さな個性に、広い世界を。</footer>
    </div>
  );
}
