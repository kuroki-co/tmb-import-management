import { RequestsList } from "@/features/fri/components/requests-list";
import { PanelAccess } from "@/features/panel/panel-access";
export default function RequestsPage() {
  return (
    <PanelAccess>
      <RequestsList />
    </PanelAccess>
  );
}
