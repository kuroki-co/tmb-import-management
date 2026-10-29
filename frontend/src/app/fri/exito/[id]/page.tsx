import { Suspense } from "react";
import { FriDetails } from "@/features/fri/components/fri-details";
async function Receipt({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id } = await params;
  const { email } = await searchParams;
  const emailStatus = ["sent", "failed", "not_provided", "not_configured"].includes(email || "")
    ? email as "sent" | "failed" | "not_provided" | "not_configured"
    : undefined;
  return <FriDetails id={id} receipt emailStatus={emailStatus} />;
}
export default function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <Receipt params={params} searchParams={searchParams} />
    </Suspense>
  );
}
