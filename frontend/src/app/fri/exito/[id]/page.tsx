import { Suspense } from "react";
import { FriDetails } from "@/features/fri/components/fri-details";
async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FriDetails id={id} receipt />;
}
export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <Receipt params={params} />
    </Suspense>
  );
}
