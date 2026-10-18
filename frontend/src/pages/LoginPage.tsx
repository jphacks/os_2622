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
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (account) return <Navigate to="/mypage" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    if (!identifier.trim()) { setError("ハンドルを入力してください。"); return; }
    if (!password.trim()) { setError("アプリパスワードを入力してください。"); return; }
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      setPassword("");
      navigate("/mypage", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "ログインに失敗しました。");
    } finally { setIsSubmitting(false); }
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
          <FormField id="appPassword" label="アプリパスワード" type="password" autoComplete="current-password" placeholder="xxxx-xxxx-xxxx-xxxx" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <p className="field-hint">Blueskyで発行したアプリパスワードを入力してください。ペットの設定は現在、このブラウザに仮保存されます。</p>
        </section>
        {error && <p className="alert-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? "ログインしています..." : "ログイン"}</PrimaryButton>
      </form>
    </main>
  </div>;
}
