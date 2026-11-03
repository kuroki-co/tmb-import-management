import { Suspense } from "react";
import { FriDetails } from "@/features/fri/components/fri-details";
import { ReceiptLoadingSkeleton } from "@/components/ui/loading-skeletons";
async function Receipt({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string; quote?: string }>;
}) {
  const { id } = await params;
  const { email, quote } = await searchParams;
  const emailStatus = ["sent", "failed", "not_provided", "not_configured"].includes(email || "")
    ? email as "sent" | "failed" | "not_provided" | "not_configured"
    : undefined;
  const automaticQuoteStatus = [
    "sent",
    "failed",
    "not_provided",
    "not_configured",
    "manual",
    "already_processed",
    "sending",
  ].includes(quote || "")
    ? quote as "sent" | "failed" | "not_provided" | "not_configured" | "manual" | "already_processed" | "sending"
    : undefined;
  return (
    <FriDetails
      id={id}
      receipt
      emailStatus={emailStatus}
      automaticQuoteStatus={automaticQuoteStatus}
    />
  );
}
export default function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string; quote?: string }>;
}) {
  return (
    <Suspense fallback={<ReceiptLoadingSkeleton />}>
      <Receipt params={params} searchParams={searchParams} />
    </Suspense>
  );
}
