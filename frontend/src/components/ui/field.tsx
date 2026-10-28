import type { ReactNode } from "react";
export const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-white px-3.5 py-3 text-sm text-foreground placeholder:text-muted/60 transition-colors hover:border-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/15";
export function Field({
  label,
  required,
  error,
  children,
  htmlFor,
  hint,
  optional,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <div className="min-w-0" data-field-error={error ? true : undefined}>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
        {optional && (
          <span className="ml-2 text-xs font-normal text-muted">Opcional</span>
        )}
      </label>
      {children}
      {hint && (
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="mt-1.5 text-xs leading-5 text-muted"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1.5 text-xs text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
