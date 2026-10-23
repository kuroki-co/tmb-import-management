import { PanelAccess } from "@/features/panel/panel-access";
import { QuotationSettingsForm } from "@/features/quotation/components/quotation-settings-form";

export default function QuotationSettingsPage() {
  return (
    <PanelAccess>
      <QuotationSettingsForm />
    </PanelAccess>
  );
}
