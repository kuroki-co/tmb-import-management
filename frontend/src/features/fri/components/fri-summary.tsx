import { Pencil } from "lucide-react";
import type { FriFormValues } from "../schema";

type SummaryData = Omit<Partial<FriFormValues>, "alternatives"> & {
  alternatives?: boolean | "Sí" | "No";
};
type Row = [string, string | number | undefined];
export function FriSummary({
  data: d,
  compact = false,
  onEdit,
}: {
  data: SummaryData;
  compact?: boolean;
  onEdit?: (step: number) => void;
}) {
  const corporate =
    d.documentType === "RUC" && d.documentNumber?.startsWith("20");
  const date = d.purchaseDate
    ? new Date(`${d.purchaseDate}T00:00:00`).toLocaleDateString("es-PE")
    : undefined;
  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Datos del cliente",
      rows: [
        [corporate ? "Razón social" : "Nombres y apellidos", d.name],
        [
          "Documento",
          `${d.documentType || ""} ${d.documentNumber || ""}`.trim(),
        ],
        ...(d.documentType === "Pasaporte"
          ? [["País emisor", d.issuingCountry] as Row]
          : []),
        ...(corporate
          ? [["Representante legal", d.representative] as Row]
          : []),
        ...(!compact
          ? ([
              ["Empresa", d.company],
              ["Cargo", d.position],
            ] as Row[])
          : []),
        ["Departamento", d.department],
        ["Celular", d.mobile],
        ["Correo", d.email],
      ],
    },
    {
      title: "Vehículo solicitado",
      rows: [
        ["Marca y modelo", `${d.brand || ""} ${d.model || ""}`.trim()],
        ["Año", d.year],
        ["Cantidad", d.quantity],
        ["Combustible", d.fuel],
        ["Transmisión", d.transmission],
        ...(!compact
          ? ([
              ["Versión", d.version],
              ["Color", d.color],
              ["Potencia", d.power],
              ...(d.fuel === "Eléctrico"
                ? [["Autonomía EV (km)", d.autonomy]]
                : []),
              ["Equipamiento", d.equipment],
            ] as Row[])
          : []),
      ],
    },
    {
      title: "Condiciones comerciales",
      rows: [
        [
          "Presupuesto",
          d.budget !== undefined
            ? `USD ${d.budget.toLocaleString("es-PE")}`
            : undefined,
        ],
        ["Fecha estimada de compra", date],
        ["Forma de pago", d.payment],
        [
          "Alternativas equivalentes",
          typeof d.alternatives === "boolean"
            ? d.alternatives
              ? "Sí"
              : "No"
            : d.alternatives,
        ],
        ["Puerto de destino", "Callao, Perú"],
      ],
    },
    {
      title: "Información para la investigación",
      rows: [
        ["Uso del vehículo", d.usage],
        ["País de origen preferido", d.originCountry],
        ...(!compact
          ? ([
              ["Proveedor de preferencia", d.supplier],
              ["Observaciones", d.observations],
            ] as Row[])
          : []),
      ],
    },
  ];
  return (
    <div className="grid gap-4">
      {sections.map(({ title, rows }, index) => (
        <section
          key={title}
          className="rounded-xl border border-border bg-white p-4 md:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {index + 1}. {title}
            </h3>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(index)}
                aria-label={`Editar ${title.toLowerCase()}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-blue-50"
              >
                <Pencil aria-hidden size={14} />
                Editar
              </button>
            )}
          </div>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows
              .filter(
                ([, value]) => onEdit || (value !== undefined && value !== ""),
              )
              .map(([label, value]) => (
                <div
                  key={label}
                  className={`min-w-0 ${["Equipamiento", "Observaciones"].includes(label) ? "sm:col-span-2" : ""}`}
                >
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 break-words whitespace-pre-wrap text-sm font-medium">
                    {value === undefined || value === ""
                      ? "Sin especificar"
                      : value}
                  </dd>
                </div>
              ))}
          </dl>
          {!onEdit &&
            rows.some(([, value]) => value === undefined || value === "") && (
              <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted">
                Datos opcionales no indicados:{" "}
                {rows
                  .filter(([, value]) => value === undefined || value === "")
                  .map(([label]) => label.toLowerCase())
                  .join(", ")}
                .
              </p>
            )}
        </section>
      ))}
    </div>
  );
}
