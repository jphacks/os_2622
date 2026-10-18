import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PetCard } from "../components/PetCard";
import { useDemo } from "../state/demo";

export function MyPage() {
  const { account, pet, logout } = useDemo();
  return <div className="site-shell">
    <AppHeader account={account} onLogout={logout} />
    <main className="mypage">
      <div className="mypage-heading">
        <div className="page-heading">
          <h1>マイページ</h1>
        </div>
      </div>
      <div className="pets-heading">
        <h2>あなたのペット <span className="pet-count">{pet ? 1 : 0}匹</span></h2>
        {!pet && <Link to="/create" className="primary-button">＋ ペットを作る</Link>}
      </div>
      <p className="field-hint demo-note">1アカウントにつき1匹のペットを設定できます。現在はブラウザ内への仮保存で、自動投稿は行いません。</p>
      {pet ? <div className="pet-grid"><PetCard pet={pet} /></div> :
        <section className="empty-pets">
          <div className="pet-avatar" aria-hidden="true">☁️</div>
          <h2>はじめてのペットを迎えよう</h2>
          <p>名前と性格、好きなものを決めて、あなただけのペットを作りましょう。</p>
          <Link to="/create" className="primary-button">ペットを作る →</Link>
        </section>}
    </main>
  </div>;
}
