import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { LoginForm } from "@/features/auth/components/login-form";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-[440px]">
        <section className="rounded-lg border border-border bg-surface p-7 shadow-[0_2px_4px_-2px_rgba(20,35,50,0.06),0_16px_48px_-24px_rgba(20,35,50,0.16)] sm:p-9">
          <div className="mb-8 flex justify-center"><Brand /></div>
          <p className="mb-2 text-[10px] font-semibold tracking-[.18em] text-accent">GESTIÓN DE IMPORTACIONES</p>
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
          <p className="mb-7 mt-2 text-sm leading-6 text-muted">Ingresa tus credenciales para continuar.</p>
          <LoginForm />
        </section>
        <Link href="/fri" className="mt-6 flex items-center justify-center text-xs text-muted transition-colors hover:text-primary">
          ¿Eres cliente? Completa tu solicitud FRI
        </Link>
        <p className="mt-9 flex items-center justify-center gap-1.5 text-[11px] text-muted"><ShieldCheck size={13} />Acceso seguro · TMB Importaciones</p>
      </div>
    </main>
  );
}
