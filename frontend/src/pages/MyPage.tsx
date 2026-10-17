import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PetCard } from "../components/PetCard";
import { useDemo } from "../state/demo";

export function MyPage() {
  const { account, pets, logout } = useDemo();
  return <div className="site-shell">
    <AppHeader account={account} onLogout={logout} />
    <main className="mypage">
      <div className="mypage-heading">
        <div className="page-heading">
          <h1>マイページ</h1>
        </div>
      </div>
      <div className="pets-heading">
        <h2>あなたのペット <span className="pet-count">{pets.length}匹</span></h2>
        <Link to="/create" className="primary-button">＋ ペットを作る</Link>
      </div>
      <p className="field-hint demo-note">デモ版：ペットはこのブラウザに保存されます。自動投稿は行いません。</p>
      {pets.length ? <div className="pet-grid">{pets.map((pet) => <PetCard key={pet.id} pet={pet} />)}</div> :
        <section className="empty-pets">
          <div className="pet-avatar" aria-hidden="true">☁️</div>
          <h2>はじめてのペットを迎えよう</h2>
          <p>名前と性格、好きなものを決めて、あなただけのペットを作りましょう。</p>
          <Link to="/create" className="primary-button">ペットを作る →</Link>
        </section>}
    </main>
  </div>;
}
