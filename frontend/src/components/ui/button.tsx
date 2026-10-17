import type { ButtonHTMLAttributes } from "react";
const variants = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-hover active:bg-navy",
  secondary:
    "bg-white border border-border text-foreground hover:bg-background",
  danger: "bg-red-50 text-danger hover:bg-red-100",
};
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
