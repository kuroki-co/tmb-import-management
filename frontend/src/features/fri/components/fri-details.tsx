"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, CheckCircle2, FileText, RefreshCw } from "lucide-react";

import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import {
  loadFri,
  downloadFri,
  downloadQuotation,
  quotationReceiptStatus,
  type Fri,
} from "../api";
import { FriSummary } from "./fri-summary";
import { StatusBadge } from "./status-badge";
import { getReceiptToken } from "../receipt-storage";
import { AppointmentBooker } from "@/features/calendar/appointment-booker";
export function FriDetails({
  id,
  receipt = false,
  emailStatus,
}: {
  id: string;
  receipt?: boolean;
  emailStatus?: "sent" | "failed" | "not_provided" | "not_configured";
}) {
  const [fri, setFri] = useState<Fri | null>(null);
  const [pdf, setPdf] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [quoteAvailable, setQuoteAvailable] = useState(false);
  const [quoteChecking, setQuoteChecking] = useState(false);
  const [quoteDownloading, setQuoteDownloading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const friStatus = fri?.status;
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    async function load() {
      try {
        const token = receipt ? getReceiptToken(id) : null;
        if (receipt && !token)
          throw new Error(
            "No encontramos el acceso a esta ficha. Vuelve a la pestaña donde enviaste el formulario. Si ya recibiste la confirmación, no necesitas enviarlo otra vez.",
          );
        const record = await loadFri(id, token || undefined);
        if (active) setFri(record);
        const result = await downloadFri(id, token || undefined);
        objectUrl = URL.createObjectURL(result);
        if (active) {
          setPdf(objectUrl);
          setError("");
        } else URL.revokeObjectURL(objectUrl);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "No se pudo cargar la solicitud",
          );
      }
    }
    queueMicrotask(() => {
      if (!active) return;
      setPdf("");
      setError("");
      setFri((current) => (current?.id === id ? current : null));
      void load();
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, receipt, attempt]);

  useEffect(() => {
    if (!receipt || !friStatus) return;
    let active = true;
    let foundQuotation = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const token = getReceiptToken(id);
    if (!token) return;

    const check = async () => {
      if (active) setQuoteChecking(true);
      try {
        const result = await quotationReceiptStatus(id, token);
        if (!active) return;
        setQuoteAvailable(result.available);
        foundQuotation = result.available;
        setQuoteError("");
      } catch (e) {
        if (!active) return;
        setQuoteError(
          e instanceof Error ? e.message : "No se pudo consultar la cotización.",
        );
      } finally {
        if (active) {
          setQuoteChecking(false);
          if (!foundQuotation) timer = setTimeout(() => void check(), 30_000);
        }
      }
    };
    void check();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, receipt, friStatus, quoteAttempt]);

  const handleQuotationDownload = async () => {
    const token = getReceiptToken(id);
    if (!token) {
      setQuoteError("No encontramos el acceso privado a esta cotización.");
      return;
    }
    setQuoteDownloading(true);
    setQuoteError("");
    try {
      const file = await downloadQuotation(id, token);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PROFORMA-${fri?.code || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (e) {
      setQuoteError(
        e instanceof Error ? e.message : "No se pudo descargar la proforma.",
      );
    } finally {
      setQuoteDownloading(false);
    }
  };
  const body = (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {receipt && fri
              ? "¡Solicitud enviada correctamente!"
              : receipt
                ? "Tu solicitud FRI"
                : fri
                  ? fri.data.name
                  : "Detalle de la solicitud"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {receipt
              ? fri
                ? "Tu requerimiento está registrado. El equipo de TMB revisará la información para investigar las opciones de importación."
                : error
                  ? "No pudimos consultar la ficha. Revisa el mensaje e inténtalo de nuevo."
                  : "Estamos consultando el registro de tu requerimiento."
              : "Requerimiento de importación y datos de contacto del cliente."}
          </p>
          {fri && (
            <p className="mt-3 text-sm font-semibold text-primary">
              Código de solicitud: {fri.code}
            </p>
          )}
        </div>
        {pdf && (
          <a
            href={pdf}
            download={`FRI-${fri?.code || id}.pdf`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Download size={16} />
            Descargar PDF
          </a>
        )}
        {receipt && quoteAvailable && (
          <Button
            onClick={handleQuotationDownload}
            disabled={quoteDownloading}
            className="inline-flex items-center gap-2"
          >
            <Download size={16} />
            {quoteDownloading ? "Preparando proforma…" : "Descargar cotización"}
          </Button>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm text-danger">{error}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => setAttempt((v) => v + 1)}
          >
            Reintentar
          </Button>
        </div>
      )}
      {!fri && !error && (
        <p role="status" className="p-10 text-center text-sm text-muted">
          Cargando solicitud…
        </p>
      )}
      {fri && (
        <>
          {receipt && (
            <div className="mb-6 rounded-xl border border-accent-border bg-accent-soft p-5">
              <h2 className="text-sm font-semibold text-navy">¿Qué sigue?</h2>
              <p className="mt-2 text-sm leading-6 text-navy">
                Tu solicitud empieza en «Pendiente a revisar». Descarga y
                conserva el PDF como constancia mientras TMB prepara y revisa
                la cotización de tu requerimiento.
              </p>
              <p className="mt-2 text-xs leading-5 text-navy">
                Cuando la cotización esté lista podrás descargar la proforma
                desde esta misma página.
              </p>
              {emailStatus === "sent" && (
                <p role="status" className="mt-3 text-sm font-medium text-navy">
                  Enviamos una confirmación de tu solicitud al correo que indicaste.
                </p>
              )}
              {(emailStatus === "failed" || emailStatus === "not_configured") && (
                <p role="status" className="mt-3 text-sm font-medium text-red-700">
                  Tu solicitud quedó registrada, pero no pudimos enviar el correo de confirmación. Conserva el PDF descargado como constancia.
                </p>
              )}
              {emailStatus === "not_provided" && (
                <p role="status" className="mt-3 text-sm text-navy">
                  Puedes descargar el PDF como constancia de tu solicitud.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {quoteAvailable ? (
                  <span role="status" className="text-sm font-medium text-navy">
                    La cotización está lista para descargar.
                  </span>
                ) : (
                  <span role="status" className="text-sm text-navy">
                    {quoteChecking
                      ? "Consultando si la cotización está lista…"
                      : "La cotización todavía no está disponible."}
                  </span>
                )}
                <Button
                  variant="secondary"
                  disabled={quoteChecking}
                  onClick={() => setQuoteAttempt((value) => value + 1)}
                  className="inline-flex items-center gap-2"
                >
                  <RefreshCw size={14} className={quoteChecking ? "animate-spin" : ""} />
                  Actualizar
                </Button>
              </div>
              {quoteError && (
                <p role="alert" className="mt-2 text-sm text-danger">{quoteError}</p>
              )}
            </div>
          )}
          {!receipt && fri && (
            <Link
              href={`/panel/cotizaciones/${fri.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              <FileText size={16} />
              {fri.status === "Cotizado" ? "Ver cotización" : "Preparar cotización"}
            </Link>
          )}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Cliente", fri.data.name],
              [
                "Vehículo",
                `${fri.data.brand} ${fri.data.model} · ${fri.data.year}`,
              ],
              ["Presupuesto", `USD ${fri.data.budget.toLocaleString("es-PE")}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-white p-4"
              >
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <StatusBadge status={fri.status} />
            {!receipt && (
              <span className="text-xs text-muted">
                Código comercial: {fri.code}
              </span>
            )}
          </div>
          <div className="mb-6">
            <FriSummary data={fri.data} compact={receipt} />
          </div>
          {receipt && (
            <>
              <AppointmentBooker requestId={id} />
              <p className="mt-6 text-sm text-muted">
                ¿Necesitas registrar otro requerimiento?{" "}
                <Link
                  href="/fri"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Crear una nueva solicitud
                </Link>
              </p>
            </>
          )}
        </>
      )}
    </>
  );
  if (!receipt)
    return (
      <>
        <Link
          href="/panel/solicitudes"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted"
        >
          <ArrowLeft size={15} />
          Volver a solicitudes
        </Link>
        {body}
      </>
    );
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-10">
        <Brand />
      </header>
      {fri && (
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 size={28} />
        </div>
      )}
      {body}
    </main>
  );
}
