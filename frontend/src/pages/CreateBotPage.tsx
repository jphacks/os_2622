import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useDemo } from "../state/demo";
import { AppHeader } from "../components/AppHeader";
import { FormField } from "../components/FormField";
import { InterestTagInput } from "../components/InterestTagInput";
import { PrimaryButton } from "../components/PrimaryButton";

type FormErrors = Record<string, string>;

export function CreateBotPage() {
  const navigate = useNavigate();
  const { account, pet, logout, addPet } = useDemo();
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (pet) return <Navigate to="/mypage" replace />;

  function validate() {
    const next: FormErrors = {};
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

    setIsSubmitting(true);
    try {
      const bot = addPet({ name: name.trim(), personality: personality.trim(), interests });
      navigate("/complete", { state: { result: { bot } } });
    } catch {
      setSubmitError("ペットを保存できませんでした。ブラウザの保存設定を確認してください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <AppHeader account={account} onLogout={logout} />
      <main className="form-page">
        <div className="page-heading">
          <Link className="back-link" to="/mypage">
            ← マイページへ戻る
          </Link>
          <p className="eyebrow">CREATE YOUR PET</p>
          <h1>ペットを作ろう</h1>
          <p className="page-description">ペットの個性を設定してください。</p>
          <div className="progress-track"><span /></div>
        </div>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
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
            <p>作成したペットはマイページで確認できます。</p>
          </div>
        </form>
      </main>
    </div>
  );
}

