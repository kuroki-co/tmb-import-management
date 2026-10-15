import { Clock3, Search, FileText, CheckCircle2 } from "lucide-react";
import type { Fri } from "../api";
const states = {
  "Pendiente a revisar": { icon: Clock3, style: "bg-amber-50 text-amber-800" },
  "En revisión": { icon: Search, style: "bg-blue-50 text-blue-800" },
  Cotizado: { icon: FileText, style: "bg-violet-50 text-violet-800" },
  "Confirmado a compra": {
    icon: CheckCircle2,
    style: "bg-emerald-50 text-emerald-800",
  },
} satisfies Record<Fri["status"], { icon: typeof Clock3; style: string }>;
export function StatusBadge({ status }: { status: Fri["status"] }) {
  const { icon: Icon, style } = states[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ${style}`}
    >
      <Icon aria-hidden size={14} />
      {status}
    </span>
  );
}
