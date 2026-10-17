import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
};

export function PrimaryButton({
  children,
  fullWidth = false,
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`primary-button${fullWidth ? " primary-button--full" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
