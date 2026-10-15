import { Suspense } from "react";
import { FriDetails } from "@/features/fri/components/fri-details";
import { PanelAccess } from "@/features/panel/panel-access";
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PanelAccess>
      <FriDetails id={id} />
    </PanelAccess>
  );
}
export default function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
