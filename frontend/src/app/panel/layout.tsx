import { PanelShell } from "@/features/panel/panel-shell";
import { Suspense } from "react";
import { PanelLoadingSkeleton } from "@/components/ui/loading-skeletons";
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<PanelLoadingSkeleton />}
    >
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}
