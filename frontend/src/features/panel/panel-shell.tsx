"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Eye,
  LogOut,
  Menu,
  ChevronRight,
  ShieldCheck,
  X,
  Settings2,
  CarFront,
  CalendarDays,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { currentSeller, logout, type Seller } from "@/features/auth/api";
import { PanelSessionContext } from "./panel-access";
export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    const controls = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>("a, button") || [],
      );
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnFocus?.focus();
    };
  }, [open]);
  useEffect(() => {
    let active = true;
    currentSeller()
      .then((user) => {
        if (!active) return;
        if (!user) router.replace("/login");
        else setSeller(user);
      })
      .catch(() => {
        if (active)
          setError(
            "No podemos conectar con el servidor. Inténtalo de nuevo en unos momentos.",
          );
      });
    return () => {
      active = false;
    };
  }, [router]);
  const links = [
    {
      href: "/panel/solicitudes",
      label: "Solicitudes FRI",
      icon: ClipboardList,
    },
    { href: "/panel/formulario", label: "Vista previa del FRI", icon: Eye },
    { href: "/panel/configuracion/cotizacion", label: "Parámetros de cotización", icon: Settings2 },
    { href: "/panel/catalogo-vehiculos", label: "Catálogo de vehículos", icon: CarFront },
    { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
  ];
  return (
    <PanelSessionContext.Provider
      value={{ ready: !!seller, error: seller ? "" : error }}
    >
      <div className="min-h-screen">
        <aside
          id="panel-navigation"
          ref={menuRef}
          aria-label="Menú del panel"
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-white transition-transform motion-reduce:transition-none lg:visible lg:translate-x-0 ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}
        >
          <div className="relative flex items-center justify-center border-b border-border px-4 py-4">
            <Brand />
            <button
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="absolute right-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-background lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
          <div className="px-4 py-7">
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.16em] text-muted">
              GESTIÓN COMERCIAL
            </p>
            <nav className="space-y-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  onClick={() => setOpen(false)}
                  key={href}
                  href={href}
                  aria-current={pathname.startsWith(href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg border-l-3 px-3 py-3 text-sm font-medium transition-colors ${pathname.startsWith(href) ? "border-l-accent bg-accent-soft text-primary" : "border-transparent text-muted hover:bg-background"}`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-5">
            <div className="rounded-xl bg-background p-4">
              <ShieldCheck size={19} className="mb-2 text-primary" />
              <p className="text-xs font-semibold">Espacio de trabajo seguro</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Los datos de tus clientes están disponibles solo para el equipo
                autorizado.
              </p>
            </div>
          </div>
        </aside>
        {open && (
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          />
        )}
        <div className="lg:ml-64">
          <header className="flex min-h-20 items-center justify-between border-b border-border bg-white px-5 md:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Abrir menú"
                aria-expanded={open}
                aria-controls="panel-navigation"
                onClick={() => setOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-background lg:hidden"
              >
                <Menu size={21} />
              </button>
              <span className="hidden text-sm text-muted sm:inline">
                Comercial
              </span>
              <ChevronRight size={14} className="hidden text-muted sm:block" />
              <span className="text-sm font-medium">
                {pathname.startsWith("/panel/formulario")
                  ? "Vista previa del FRI"
                  : pathname.startsWith("/panel/configuracion/cotizacion")
                    ? "Parámetros de cotización"
                    : pathname.startsWith("/panel/catalogo-vehiculos")
                      ? "Catálogo de vehículos"
                    : pathname.startsWith("/panel/agenda")
                      ? "Agenda"
                    : pathname.startsWith("/panel/cotizaciones/")
                      ? "Preparar cotización"
                  : pathname !== "/panel/solicitudes"
                    ? "Detalle de solicitud"
                    : "Solicitudes FRI"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-primary">
                  {seller ? seller.name.slice(0, 2).toUpperCase() : "…"}
                </span>
                <div className="hidden text-xs sm:block">
                  <p className="font-semibold">
                    {seller?.name || "Equipo TMB"}
                  </p>
                  <p className="mt-1 text-muted">Vendedor</p>
                </div>
              </div>
              <button
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                disabled={leaving || !seller}
                onClick={async () => {
                  setLeaving(true);
                  try {
                    await logout();
                    router.replace("/login");
                  } catch {
                    setError("No se pudo cerrar sesión. Inténtalo de nuevo.");
                  } finally {
                    setLeaving(false);
                  }
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>
          {seller && error && (
            <p
              role="alert"
              className="m-5 rounded-lg bg-red-50 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <main className="mx-auto max-w-[1500px] px-5 pb-4 pt-5 md:px-8 md:pb-5 md:pt-8">{children}</main>
        </div>
      </div>
    </PanelSessionContext.Provider>
  );
}
