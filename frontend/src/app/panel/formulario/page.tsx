import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FriForm } from "@/features/fri/components/fri-form";
import { PanelAccess } from "@/features/panel/panel-access";
export default function PreviewPage() {
  return (
    <PanelAccess>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-primary">
            SOLICITUDES FRI
          </p>
          <h1 className="text-2xl font-semibold">Preview del formulario</h1>
          <p className="mt-2 text-sm text-muted">
            Así verá el cliente su ficha. Puedes recorrer los pasos sin
            registrar una solicitud.
          </p>
        </div>
        <Link
          href="/fri"
          target="_blank"
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium"
        >
          <ExternalLink size={16} />
          Abrir formulario público
        </Link>
      </div>
      <FriForm preview />
    </PanelAccess>
  );
}
