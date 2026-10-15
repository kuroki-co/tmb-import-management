import { PanelShell } from "@/features/panel/panel-shell";
import { Suspense } from "react";
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<p className="p-8 text-sm text-muted">Cargando panel…</p>}
    >
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}
