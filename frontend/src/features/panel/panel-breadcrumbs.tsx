import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Breadcrumb = { label: string; href?: string };

function getItems(pathname: string): Breadcrumb[] {
  const home: Breadcrumb = { label: "Resumen", href: "/panel" };

  if (pathname === "/panel") return [{ label: "Resumen" }];

  if (pathname.startsWith("/panel/cotizaciones/")) {
    return [
      home,
      { label: "Solicitudes FRI", href: "/panel/solicitudes" },
      { label: "Preparar cotización" },
    ];
  }

  if (pathname.startsWith("/panel/solicitudes/")) {
    return [
      home,
      { label: "Solicitudes FRI", href: "/panel/solicitudes" },
      { label: "Detalle de solicitud" },
    ];
  }

  if (pathname.startsWith("/panel/configuracion/cotizacion")) {
    return [home, { label: "Configuración" }, { label: "Parámetros de cotización" }];
  }

  if (pathname.startsWith("/panel/configuracion/correo")) {
    return [home, { label: "Configuración" }, { label: "Correo y notificaciones" }];
  }

  if (pathname.startsWith("/panel/catalogo-vehiculos")) {
    return [home, { label: "Catálogo de vehículos" }];
  }

  if (pathname.startsWith("/panel/agenda")) {
    return [home, { label: "Agenda" }];
  }

  if (pathname.startsWith("/panel/formulario")) {
    return [home, { label: "Vista previa del FRI" }];
  }

  return [home, { label: "Solicitudes FRI" }];
}

export function PanelBreadcrumbs({ pathname }: { pathname: string }) {
  const items = getItems(pathname);

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          const compactParent = !current && index < items.length - 2;

          return (
            <li
              key={`${item.label}-${index}`}
              className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${compactParent ? "hidden sm:flex" : ""}`}
            >
              {index > 0 && (
                <ChevronRight size={14} aria-hidden className="shrink-0 text-muted/60" />
              )}
              {item.href && !current ? (
                <Link
                  href={item.href}
                  className="truncate text-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={`truncate ${current ? "font-semibold text-navy" : "text-muted"}`}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
