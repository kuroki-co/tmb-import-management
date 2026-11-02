"use client";

import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode, type InputHTMLAttributes } from "react";
export const inputClass =
  "w-full min-w-0 min-h-11 rounded-lg border border-border bg-surface shadow-[0_1px_2px_rgba(20,35,50,0.03)] px-3 py-2.5 text-base sm:min-h-10 sm:py-2 sm:text-sm text-foreground placeholder:text-muted/75 transition-colors hover:border-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/20";
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
  const generatedId = useId();
  const controls = Children.toArray(children);
  const directControl = controls.find((child) => isValidElement(child) && ["input", "select", "textarea"].includes(String(child.type))) as ReactElement<InputHTMLAttributes<HTMLInputElement>> | undefined;
  const controlId = htmlFor || directControl?.props.id || generatedId;
  const describedBy = [hint && `${controlId}-hint`, error && `${controlId}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0" data-field-error={error ? true : undefined}>
      <label htmlFor={controlId} className="mb-2 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
        {optional && (
          <span className="ml-2 text-xs font-normal text-muted">Opcional</span>
        )}
      </label>
      {Children.map(children, (child) => {
        if (!isValidElement(child) || !["input", "select", "textarea"].includes(String(child.type))) return child;
        const control = child as ReactElement<InputHTMLAttributes<HTMLInputElement>>;
        return cloneElement(control, {
          id: controlId,
          "aria-invalid": control.props["aria-invalid"] ?? (error ? true : undefined),
          "aria-describedby": control.props["aria-describedby"] || describedBy,
        });
      })}
      {hint && (
        <p
          id={`${controlId}-hint`}
          className="mt-1.5 text-xs leading-5 text-muted"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${controlId}-error`}
          role="alert"
          className="mt-1.5 text-xs text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
