import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { LoginForm } from "@/features/auth/components/login-form";
import { FileText, Globe2, ShieldCheck } from "lucide-react";
export default function LoginPage() {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[.95fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden border-b-4 border-brand-green bg-navy lg:border-b-0 lg:border-r-4 px-6 py-5 text-white lg:min-h-screen lg:p-14">
        <Brand light />
        <div className="relative hidden max-w-md lg:block">
          <span className="mb-6 inline-block rounded-full border border-white/25 px-3 py-1.5 text-[10px] font-semibold tracking-[.18em] text-on-dark-muted">
            GESTIÓN DE IMPORTACIONES
          </span>
          <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
            Cada solicitud,
            <br />
            un nuevo destino.
          </h1>
          <p className="mt-5 text-sm leading-7 text-on-dark-muted">
            Un espacio para acompañar a tus clientes desde su primer
            requerimiento hasta la investigación de su importación.
          </p>
          <div className="mt-9 space-y-4">
            {[
              [FileText, "Solicitudes FRI en un solo lugar"],
              [Globe2, "Información lista para investigar"],
              [ShieldCheck, "Acceso seguro para tu equipo"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof FileText;
              return (
                <div
                  key={String(text)}
                  className="flex items-center gap-3 text-sm text-on-dark-muted"
                >
                  <I size={18} className="text-brand-green" />
                  {String(text)}
                </div>
              );
            })}
          </div>
        </div>
        <p className="hidden text-xs text-on-dark-muted lg:block">
          TMB Importaciones e Inversiones Generales E.I.R.L.
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full border border-white/5"
        />
      </section>
      <section className="flex items-center justify-center px-5 py-8 lg:p-14">
        <div className="w-full max-w-md">
          <p className="mb-3 text-xs font-semibold tracking-[.16em] text-primary">
            PANEL DEL VENDEDOR
          </p>
          <h2 className="text-3xl font-semibold">Bienvenido de nuevo</h2>
          <p className="mb-8 mt-3 text-sm text-muted">
            Ingresa para gestionar las solicitudes de tus clientes.
          </p>
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
            <LoginForm />
          </div>
          <Link
            href="/fri"
            className="mt-7 block text-center text-sm text-muted hover:text-primary"
          >
            ¿Eres cliente? Completa tu solicitud FRI →
          </Link>
        </div>
      </section>
    </main>
  );
}
