import { Suspense } from "react";
import { FriDetails } from "@/features/fri/components/fri-details";
import { PanelAccess } from "@/features/panel/panel-access";
import { DetailLoadingSkeleton } from "@/components/ui/loading-skeletons";
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
    <Suspense fallback={<DetailLoadingSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}
