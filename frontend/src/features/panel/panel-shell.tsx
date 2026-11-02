"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Eye,
  LogOut,
  Menu,
  X,
  Settings2,
  CarFront,
  CalendarDays,
  Mail,
  LayoutDashboard,
} from "lucide-react";
import { currentSeller, logout, type Seller } from "@/features/auth/api";
import { PanelSessionContext } from "./panel-access";
import { PanelBreadcrumbs } from "./panel-breadcrumbs";
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
  const groups = [
    {
      label: "INICIO",
      links: [
        { href: "/panel", label: "Resumen", icon: LayoutDashboard },
      ],
    },
    {
      label: "OPERACIONES",
      links: [
        { href: "/panel/solicitudes", label: "Solicitudes FRI", icon: ClipboardList },
        { href: "/panel/catalogo-vehiculos", label: "Catálogo de vehículos", icon: CarFront },
        { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
      ],
    },
    {
      label: "HERRAMIENTAS",
      links: [
        { href: "/panel/formulario", label: "Vista previa del FRI", icon: Eye },
        { href: "/panel/configuracion/cotizacion", label: "Parámetros de cotización", icon: Settings2 },
        { href: "/panel/configuracion/correo", label: "Correo y notificaciones", icon: Mail },
      ],
    },
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
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#18384b] bg-[#092943] text-white transition-transform motion-reduce:transition-none lg:visible lg:translate-x-0 ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}
        >
          <div className="relative border-b border-white/10 px-4 py-5">
            <div className="flex min-h-12 items-center justify-center px-3 py-1.5 pr-12 lg:pr-3">
              <Image
                src="/brand/tmb-logo.png"
                alt="TMB Importaciones EIRL · Global Mobility & Industrial Solutions"
                width={1765}
                height={891}
                sizes="192px"
                className="h-auto w-44 brightness-0 invert"
                priority
              />
            </div>
            <button
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 shrink-0 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 py-5">
            {groups.map((group, index) => (
              <nav
                key={group.label}
                aria-label={group.label}
                className={index > 0 ? "mt-6 border-t border-white/10 pt-5" : ""}
              >
                <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.14em] text-white/45">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.links.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || (href !== "/panel" && pathname.startsWith(`${href}/`));
                    return (
                      <Link
                        onClick={() => setOpen(false)}
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.07] hover:text-white"}`}
                      >
                        {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-green" />}
                        <Icon size={17} strokeWidth={active ? 2 : 1.8} className={active ? "text-brand-green" : "text-white/55 transition-colors group-hover:text-white"} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            ))}
          </div>
        </aside>
        {open && (
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          />
        )}
        <div className="lg:ml-64 lg:min-h-screen lg:overflow-hidden lg:rounded-l-2xl lg:bg-background">
          <header className="border-t-[3px] border-t-accent border-b border-border bg-white">
            <div className="mx-auto flex min-h-16 w-full max-w-[1500px] items-center justify-between px-5 md:px-8">
              <div className="flex items-center gap-3">
              <button
                aria-label="Abrir menú"
                aria-expanded={open}
                aria-controls="panel-navigation"
                onClick={() => setOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-background lg:hidden"
              >
                <Menu size={21} />
              </button>
                <PanelBreadcrumbs pathname={pathname} />
              </div>
              <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white ring-2 ring-inset ring-brand-green/70">
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-background hover:text-foreground"
              >
                <LogOut size={18} />
              </button>
              </div>
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
          <main className="mx-auto max-w-[1500px] bg-background px-5 pb-4 pt-5 md:px-8 md:pb-5 md:pt-8">
            {children}
          </main>
        </div>
      </div>
    </PanelSessionContext.Provider>
  );
}
