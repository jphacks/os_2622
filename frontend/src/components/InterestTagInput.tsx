import { useState } from "react";

type InterestTagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  maxItems?: number;
  error?: string;
};

export function InterestTagInput({
  value,
  onChange,
  maxItems = 10,
  error,
}: InterestTagInputProps) {
  const [draft, setDraft] = useState("");

  function addInterest() {
    const item = draft.trim();
    if (!item || value.length >= maxItems || value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, item]);
    setDraft("");
  }

  return (
    <div className="form-field">
      <label className="form-label" htmlFor="interests-input">興味・関心</label>
      <div className={`tag-input${error ? " form-control--error" : ""}`}>
        {value.map((item) => (
          <span className="interest-tag" key={item}>
            {item}
            <button
              type="button"
              className="tag-remove"
              aria-label={`${item}を削除`}
              onClick={() => onChange(value.filter((v) => v !== item))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="interests-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 50))}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addInterest();
            }
          }}
          onBlur={addInterest}
          placeholder={value.length ? "ほかの興味を追加..." : "例：猫、宇宙、コーヒー"}
          disabled={value.length >= maxItems}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "interests-error" : "interests-hint"}
        />
        {draft.trim() && (
          <button type="button" className="tag-add" onMouseDown={(e) => e.preventDefault()} onClick={addInterest}>
            追加
          </button>
        )}
      </div>
      {error ? <p className="field-error" id="interests-error">{error}</p> : (
        <p className="field-hint" id="interests-hint">入力して Enter で追加（最大{maxItems}件）</p>
      )}
    </div>
  );
}
