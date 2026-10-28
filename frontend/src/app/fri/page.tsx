import { Brand } from "@/components/ui/brand";
import { FriForm } from "@/features/fri/components/fri-form";
export default function FriPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6">
      <header className="mb-6 flex min-w-0 items-center justify-between gap-6 border-b border-border pb-3 md:mb-7">
        <Brand />
        <span className="hidden text-xs text-muted sm:block">
          FICHA DE REQUERIMIENTO DE IMPORTACIÓN
        </span>
      </header>
      <div className="mb-7">
        <p className="mb-2 text-xs font-semibold tracking-wide text-primary">
          TU REQUERIMIENTO DE IMPORTACIÓN
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Cuéntanos qué deseas importar
        </h1>
        <p className="mt-2 text-sm text-muted">
          Completa los cuatro pasos. Al finalizar podrás descargar tu ficha FRI y
          el equipo de TMB revisará tu requerimiento.
        </p>
      </div>
      <FriForm />
      <footer className="py-8 text-center text-xs text-muted">
        TMB Importaciones e Inversiones Generales E.I.R.L.
      </footer>
    </main>
  );
}
