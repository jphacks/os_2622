import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { FormField } from "../components/FormField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useDemo } from "../state/demo";

export function LoginPage() {
  const { account, login, logout } = useDemo();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  if (account) return <Navigate to="/mypage" replace />;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier.trim()) { setError("ハンドルを入力してください。"); return; }
    try {
      login(identifier);
      navigate("/mypage", { replace: true });
    } catch { setError("ログイン状態を保存できませんでした。ブラウザの保存設定を確認してください。"); }
  }
  return <div className="site-shell">
    <AppHeader account={account} onLogout={logout} />
    <main className="form-page">
      <div className="page-heading">
        <Link to="/" className="back-link">← トップへ戻る</Link>
        <p className="eyebrow">WELCOME TO PETA</p>
        <h1>ログイン</h1>
        <p className="page-description">あなたのペットに会いにいきましょう。</p>
      </div>
      <form className="create-form" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <FormField id="identifier" label="Blueskyのハンドル" placeholder="example.bsky.social" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          <p className="field-hint">現在はデモ版です。任意のハンドルだけで試せます。Blueskyへの接続や投稿は行いません。</p>
        </section>
        {error && <p className="alert-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" fullWidth>ログイン</PrimaryButton>
      </form>
    </main>
  </div>;
}
