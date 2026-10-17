import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createBot } from "../api/bots";
import { AppHeader } from "../components/AppHeader";
import { FormField } from "../components/FormField";
import { InterestTagInput } from "../components/InterestTagInput";
import { PrimaryButton } from "../components/PrimaryButton";
import type { CreateBotRequest } from "../types/bot";

type FormErrors = Record<string, string>;

export function CreateBotPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next: FormErrors = {};
    if (!identifier.trim()) next.identifier = "identifierを入力してください。";
    if (!appPassword.trim()) next.appPassword = "アプリパスワードを入力してください。";
    if (!name.trim()) next.name = "ペットの名前を入力してください。";
    else if (name.trim().length > 30) next.name = "名前は30文字以内で入力してください。";
    if (!personality.trim()) next.personality = "性格を入力してください。";
    else if (personality.trim().length > 500) next.personality = "性格は500文字以内で入力してください。";
    if (interests.length < 1) next.interests = "興味・関心を1件以上追加してください。";
    if (interests.length > 10) next.interests = "興味・関心は10件までです。";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (!validate() || isSubmitting) return;

    const payload: CreateBotRequest = {
      account: { identifier: identifier.trim(), appPassword },
      bot: { name: name.trim(), personality: personality.trim(), interests },
    };

    setIsSubmitting(true);
    try {
      const result = await createBot(payload);
      // Password is intentionally not persisted in browser storage.
      setAppPassword("");
      navigate("/complete", { state: { result } });
    } catch (error) {
      const apiError = error as Error & { status?: number; fields?: Record<string, string> };
      if (apiError.fields) setErrors((current) => ({ ...current, ...apiError.fields }));
      setSubmitError(
        apiError.status === 401
          ? "Blueskyの認証に失敗しました。identifierとアプリパスワードを確認してください。"
          : apiError.message || "作成に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <AppHeader />
      <main className="form-page">
        <div className="page-heading">
          <Link className="back-link" to="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            ← トップへ戻る
          </Link>
          <p className="eyebrow">CREATE YOUR PET</p>
          <h1>ペットを作ろう</h1>
          <p className="page-description">アカウントとペットの個性を設定してください。</p>
          <div className="progress-track"><span /></div>
        </div>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
          <section className="form-section">
            <div className="section-heading">
              <span className="section-icon">↗</span>
              <div>
                <h2>Blueskyアカウント</h2>
                <p>ペットが活動するアカウントを設定します。</p>
              </div>
            </div>
            <FormField
              id="identifier"
              label="ハンドル / identifier"
              placeholder="example.bsky.social"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={errors.identifier}
              required
            />
            <FormField
              id="appPassword"
              label="アプリパスワード"
              type="password"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              autoComplete="new-password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              error={errors.appPassword}
              hint="通常のアカウントパスワードではなく、Blueskyで発行したアプリパスワードを使用してください。"
              required
            />
            <div className="security-note">
              <span aria-hidden="true">♢</span>
              <p>アプリパスワードは認証にのみ使用します。フォーム送信後、ブラウザの永続ストレージには保存しません。</p>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-icon">♡</span>
              <div>
                <h2>ペットの設定</h2>
                <p>どんな子なのか、自由に決めてみましょう。</p>
              </div>
            </div>
            <FormField
              id="name"
              label="ペットの名前"
              placeholder="例：もち"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              maxLength={30}
              required
            />
            <FormField
              as="textarea"
              id="personality"
              label="性格"
              placeholder="例：好奇心旺盛で、少しマイペース。新しいものを見つけると、つい誰かに教えたくなる。"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              error={errors.personality}
              hint={`${personality.length}/500文字`}
              rows={4}
              maxLength={500}
              required
            />
            <InterestTagInput
              value={interests}
              onChange={setInterests}
              error={errors.interests}
            />
          </section>

          {submitError && <div className="alert-error" role="alert">{submitError}</div>}

          <div className="form-submit">
            <PrimaryButton type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? <><span className="spinner" /> 作成しています...</> : <>ペットを作成して送り出す <span aria-hidden="true">→</span></>}
            </PrimaryButton>
            <p>作成すると、自動投稿が開始されます。</p>
          </div>
        </form>
      </main>
    </div>
  );
}

// Import Link locally for the back link above.
import { Link } from "react-router-dom";
