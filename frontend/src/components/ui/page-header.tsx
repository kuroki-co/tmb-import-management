import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow, actions }: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        {eyebrow && <p className="tmb-eyebrow mb-2 uppercase">{eyebrow}</p>}
        <h1 className="tmb-page-title">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {actions && <div className={`flex flex-wrap items-center gap-2 ${eyebrow ? "sm:pt-5" : ""}`}>{actions}</div>}
    </header>
  );
}
