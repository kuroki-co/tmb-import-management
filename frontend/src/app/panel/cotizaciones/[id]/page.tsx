import { Suspense } from "react";
import { PanelAccess } from "@/features/panel/panel-access";
import { QuotationEditor } from "@/features/quotation/components/quotation-editor";
import { QuotationLoadingSkeleton } from "@/components/ui/loading-skeletons";

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PanelAccess>
      <QuotationEditor requestId={id} />
    </PanelAccess>
  );
}

export default function QuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<QuotationLoadingSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}
