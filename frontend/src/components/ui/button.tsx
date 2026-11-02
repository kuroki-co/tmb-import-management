import type { ButtonHTMLAttributes } from "react";
const variants = {
  primary: "bg-primary text-white shadow-[0_1px_2px_rgba(18,56,91,0.12)] hover:bg-primary-hover active:bg-navy",
  secondary:
    "bg-white border border-border text-foreground shadow-[0_1px_2px_rgba(20,35,50,0.03)] hover:bg-background",
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
      className={`inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
