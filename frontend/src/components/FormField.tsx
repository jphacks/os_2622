import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children?: ReactNode;
};

type InputFieldProps = BaseProps & {
  as?: "input";
} & InputHTMLAttributes<HTMLInputElement>;

type TextareaFieldProps = BaseProps & {
  as: "textarea";
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function FormField(props: InputFieldProps | TextareaFieldProps) {
  const { label, id, hint, error, as = "input", children } = props;
  const sharedClassName = `form-control${error ? " form-control--error" : ""}`;

  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>{label}</label>
      {as === "textarea" ? (
        <textarea
          {...(props as TextareaFieldProps)}
          id={id}
          className={sharedClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      ) : (
        <input
          {...(props as InputFieldProps)}
          id={id}
          className={sharedClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      )}
      {children}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
      {!error && hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}
