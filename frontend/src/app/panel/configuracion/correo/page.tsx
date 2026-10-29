"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Mail, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelAccess } from "@/features/panel/panel-access";
import { getEmailStatus, sendTestEmail, type EmailStatus } from "@/features/email/api";

export default function EmailSettingsPage() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setStatus(await getEmailStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar la configuración de correo.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function testEmail() {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const result = await sendTestEmail();
      setNotice(`Correo de prueba enviado a ${result.recipient}. Revisa también la carpeta de spam.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el correo de prueba.");
    } finally {
      setSending(false);
    }
  }

  return <PanelAccess>
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Configuración</p>
          <h1 className="mt-2 text-2xl font-semibold text-navy">Correo y notificaciones</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Consulta el estado de Resend y envía un mensaje de prueba a tu cuenta de vendedor. La API key permanece en el servidor.</p>
        </div>
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />Actualizar estado
        </Button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

      <section className="rounded-xl border border-border bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary"><Mail size={20} aria-hidden /></span>
            <div>
              <h2 className="font-semibold text-navy">Conexión con Resend</h2>
              <p className="mt-1 text-sm text-muted">{loading ? "Consultando los secretos de Supabase…" : status?.configured ? "Las credenciales y el remitente están configurados." : "Falta configurar la API key y el remitente en Supabase."}</p>
              {status?.sender && <p className="mt-2 text-sm"><span className="text-muted">Remitente:</span> <span className="font-medium text-navy">{status.sender}</span></p>}
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status?.configured ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
            {loading ? "Consultando" : status?.configured ? "Configurado" : "Pendiente"}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted">Se enviará al correo de tu cuenta de vendedor: {status?.testRecipient || "no disponible"}.</p>
          <Button onClick={() => void testEmail()} disabled={!status?.configured || sending || loading}>
            <Send size={15} aria-hidden />{sending ? "Enviando…" : "Enviar correo de prueba"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-5 md:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-semibold text-navy">Configuración actual</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted marker:font-semibold marker:text-primary">
              <li>El dominio <code className="rounded bg-background px-1.5 py-0.5 text-xs text-navy">tmbimporta.com</code> está verificado en Resend.</li>
              <li>Supabase usa <code className="rounded bg-background px-1.5 py-0.5 text-xs text-navy">TMB Importaciones &lt;notificaciones@tmbimporta.com&gt;</code> como remitente.</li>
              <li>Usa el botón de arriba para probar el envío al correo de tu cuenta de vendedor. El formulario FRI también envía una confirmación cuando el cliente indica un correo.</li>
            </ol>
            <p className="mt-4 rounded-lg bg-background p-3 text-xs leading-5 text-muted">Los recordatorios automáticos aún no están activados. Si el correo de confirmación falla, la solicitud FRI igual queda registrada.</p>
          </div>
        </div>
      </section>
    </div>
  </PanelAccess>;
}
