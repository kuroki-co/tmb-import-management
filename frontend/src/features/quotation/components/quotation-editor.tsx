"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Download, FileText, Mail, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { QuotationLoadingSkeleton } from "@/components/ui/loading-skeletons";
import { downloadQuotation, loadFri, type Fri } from "@/features/fri/api";
import { calculateQuotation } from "../calculations";
import { loadQuotation, loadQuotationSettings, saveQuotation, sendQuotationEmail, type Quotation } from "../api";
import {
  localCostKeys,
  localCostLabels,
  type QuotationAdjustments,
  type QuotationInput,
  type QuotationSettings,
} from "../types";

const fmt = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (n: number) => `USD ${fmt.format(n)}`;
const pen = (n: number) => `S/ ${fmt.format(n)}`;
type PercentKey = "advRate" | "ipmRate" | "importIgvRate" | "perceptionRate" | "localIgvRate";

function amountText(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

export function QuotationEditor({ requestId }: { requestId: string }) {
  const [fri, setFri] = useState<Fri | null>(null);
  const [settings, setSettings] = useState<QuotationSettings | null>(null);
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [input, setInput] = useState<QuotationInput>({ fobUsd: 0, freightUsd: 0, adjustments: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadFri(requestId), loadQuotationSettings(), loadQuotation(requestId)])
      .then(([request, base, existing]) => {
        if (!active) return;
        setFri(request);
        setSettings(existing?.settings ?? base);
        setQuote(existing);
        setSaved(Boolean(existing));
        const reference = request.data.catalogReference;
        const catalogFob = reference?.currency.toUpperCase() === "USD"
          ? reference.price ?? 0
          : 0;
        const referenceFreight = request.data.vehicleType === "Camión"
          ? 9_000
          : request.data.vehicleType === "Automóvil"
          ? 3_000
          : 0;
        setInput(existing?.input
          ? {
            ...existing.input,
            fobUsd: existing.input.fobUsd || catalogFob,
            freightUsd: existing.input.freightUsd || referenceFreight,
          }
          : {
            fobUsd: catalogFob,
            freightUsd: referenceFreight,
            adjustments: {},
          });
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "No se pudo cargar la cotización"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [requestId]);

  const preview = useMemo(() => settings ? calculateQuotation(input, settings) : null, [input, settings]);
  const hasRequiredAmounts = input.fobUsd > 0 && input.freightUsd > 0;

  function setAmount(key: "fobUsd" | "freightUsd", text: string) {
    setInput((current) => ({ ...current, [key]: text === "" ? 0 : Number(text) }));
    setSaved(false);
    setEmailNotice("");
  }
  function setAdjustment(key: Exclude<keyof QuotationAdjustments, "localCosts">, text: string, asPercent = false) {
    setInput((current) => {
      const adjustments = { ...current.adjustments };
      if (!text) delete adjustments[key];
      else (adjustments as Record<string, unknown>)[key] = Number(text) / (asPercent ? 100 : 1);
      return { ...current, adjustments };
    });
    setSaved(false);
    setEmailNotice("");
  }
  function setLocalAdjustment(key: (typeof localCostKeys)[number], text: string) {
    setInput((current) => {
      const localCosts = { ...current.adjustments.localCosts };
      if (!text) delete localCosts[key];
      else localCosts[key] = Number(text);
      const other = { ...current.adjustments };
      Reflect.deleteProperty(other, "localCosts");
      const adjustments = Object.keys(localCosts).length
        ? { ...other, localCosts }
        : other;
      return { ...current, adjustments };
    });
    setSaved(false);
    setEmailNotice("");
  }
  function resetAdjustments() {
    setInput((current) => ({ ...current, adjustments: {} }));
    setSaved(false);
    setEmailNotice("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fri || !settings) return;
    if (input.fobUsd <= 0 || input.freightUsd <= 0) {
      setError("Ingresa el FOB y el flete internacional para calcular la cotización.");
      return;
    }
    setSaving(true);
    setError("");
    setEmailNotice("");
    setSaved(false);
    try {
      const result = await saveQuotation(requestId, input);
      setQuote(result);
      setSettings(result.settings);
      setInput(result.input);
      setSaved(true);
      if (fri.data.email) {
        setSendingEmail(true);
        try {
          const email = await sendQuotationEmail(requestId);
          setEmailNotice(`Cotización guardada y proforma enviada a ${email.recipient}.`);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? `La cotización se guardó, pero no se pudo enviar la proforma: ${cause.message}`
              : "La cotización se guardó, pero no se pudo enviar la proforma.",
          );
        } finally {
          setSendingEmail(false);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la cotización");
    } finally {
      setSaving(false);
    }
  }

  async function downloadProforma() {
    if (!fri || !quote || !saved || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const file = await downloadQuotation(requestId);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PROFORMA-${fri.code}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar la proforma.");
    } finally {
      setDownloading(false);
    }
  }

  async function sendByEmail() {
    if (!fri || !quote || !saved || !fri.data.email) return;
    setSendingEmail(true);
    setError("");
    setEmailNotice("");
    try {
      const result = await sendQuotationEmail(requestId);
      setEmailNotice(`Proforma enviada a ${result.recipient}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la proforma por correo.");
    } finally {
      setSendingEmail(false);
    }
  }

  const rateField = (key: PercentKey, label: string, baseValue: number) => (
    <Field key={key} label={`${label} (%)`} optional hint={`Base: ${fmt.format(baseValue * 100)}%`}>
      <input className={inputClass} type="number" min="0" max="100" step="0.01" value={amountText(input.adjustments[key] === undefined ? undefined : input.adjustments[key]! * 100)} placeholder={fmt.format(baseValue * 100)} onChange={(e) => setAdjustment(key, e.target.value, true)} />
    </Field>
  );

  return (
    <>
      {loading ? <QuotationLoadingSkeleton /> : !fri || !settings ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">{error || "No encontramos la solicitud o la configuración de cotización."}</div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 tmb-eyebrow">Cotización comercial <span className="px-1 text-muted">/</span> {fri.code}</p>
              <h1 className="tmb-page-title">{quote ? "Editar cotización" : "Preparar cotización"}</h1>
              <p className="mt-2 text-sm text-muted">Completa los costos confirmados con la proveedora. El sistema calcula los demás conceptos con los parámetros vigentes.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-background px-3 py-2 font-medium text-foreground">{fri.data.name}</span>
                <span className="rounded-lg bg-background px-3 py-2 font-medium text-foreground">{fri.data.brand} {fri.data.model} · {fri.data.year}</span>
                <span className="rounded-lg bg-background px-3 py-2 font-medium text-foreground">{fri.data.quantity} unidad(es)</span>
              </div>
            </div>
            <Link href={`/panel/solicitudes/${fri.id}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 tmb-card px-4 text-sm font-semibold hover:bg-background"><FileText size={16} />Ver solicitud FRI</Link>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}

          <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-5">
              <section className="tmb-card p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Costos de importación</h2>
                    <p className="mt-1 text-sm text-muted">Importación marítima FCL</p>
                  </div>
                  <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-primary">2 datos requeridos</span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="FOB · precio en China (USD)" required hint={fri.data.catalogReference?.currency.toUpperCase() === "USD" && fri.data.catalogReference.price !== null ? `Referencia del catálogo: ${usd(fri.data.catalogReference.price)}. Confirma el precio con la proveedora.` : "No hay precio de catálogo para este vehículo. Ingresa el precio confirmado por la proveedora."}><input className={inputClass} type="number" min="0.01" step="0.01" value={amountText(input.fobUsd || undefined)} onChange={(e) => setAmount("fobUsd", e.target.value)} placeholder="0.00" required /></Field>
                  <Field label="Flete internacional (USD)" required hint={fri.data.vehicleType === "Automóvil" ? "Referencia precargada para automóvil: USD 3,000. Confirma el costo real." : fri.data.vehicleType === "Camión" ? "Referencia precargada para camión: USD 9,000. Confirma el costo real." : "Ingresa el flete internacional confirmado por la proveedora."}><input className={inputClass} type="number" min="0.01" step="0.01" value={amountText(input.freightUsd || undefined)} onChange={(e) => setAmount("freightUsd", e.target.value)} placeholder="0.00" required /></Field>
                </div>
              </section>

              <details className="group tmb-card">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden">
                  <span><span className="text-sm font-semibold">Ajustes excepcionales</span><span className="ml-2 text-xs font-medium text-muted">Opcional · solo esta cotización</span></span>
                  <ChevronDown size={17} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border px-5 py-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-xl text-sm leading-5 text-muted">Ajusta un parámetro solo si esta operación lo requiere. Si lo dejas vacío, se aplicará el valor base; estos cambios no alteran la configuración general.</p>
                    <button type="button" onClick={resetAdjustments} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-background"><RotateCcw size={14} />Restablecer valores base</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Seguro calculado (USD)" optional hint={`Automático: ${fmt.format(settings.insuranceRate * 100)}% de FOB + flete`}><input className={inputClass} type="number" min="0" step="0.01" value={amountText(input.adjustments.insuranceUsd)} placeholder={preview ? fmt.format(preview.insuranceUsd) : "—"} onChange={(e) => setAdjustment("insuranceUsd", e.target.value)} /></Field>
                    <Field label="Tipo de cambio" optional hint={`Base: ${settings.exchangeRate}`}><input className={inputClass} type="number" min="0.0001" step="0.0001" value={amountText(input.adjustments.exchangeRate)} placeholder={String(settings.exchangeRate)} onChange={(e) => setAdjustment("exchangeRate", e.target.value)} /></Field>
                    {rateField("advRate", "ADV", settings.advRate)}
                    {rateField("ipmRate", "IPM", settings.ipmRate)}
                    {rateField("importIgvRate", "IGV de importación", settings.importIgvRate)}
                    {rateField("perceptionRate", "Percepción", settings.perceptionRate)}
                    {rateField("localIgvRate", "IGV de gastos locales", settings.localIgvRate)}
                    <Field label="Tasa de despacho (USD)" optional hint={`Base: ${usd(settings.dispatchTaxUsd)}`}><input className={inputClass} type="number" min="0" step="0.01" value={amountText(input.adjustments.dispatchTaxUsd)} placeholder={String(settings.dispatchTaxUsd)} onChange={(e) => setAdjustment("dispatchTaxUsd", e.target.value)} /></Field>
                    {localCostKeys.map((key) => <Field key={key} label={`${localCostLabels[key]} (USD)`} optional hint={`Base: ${settings.localCosts[key] ? usd(settings.localCosts[key]) : "—"}`}><input className={inputClass} type="number" min="0" step="0.01" value={amountText(input.adjustments.localCosts?.[key])} placeholder={settings.localCosts[key] ? fmt.format(settings.localCosts[key]) : "—"} onChange={(e) => setLocalAdjustment(key, e.target.value)} /></Field>)}
                  </div>
                </div>
              </details>
            </div>

            <aside className="tmb-card p-5 xl:sticky xl:top-24 xl:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Resumen de cotización</h2>
                  <p className="mt-1 text-sm text-muted">Importes clave de la proforma</p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">USD</span>
              </div>
              {preview && hasRequiredAmounts ? <div className="mt-5">
                <div className="rounded-lg bg-primary px-5 py-5 text-white">
                  <p className="text-xs font-medium text-white/75">TOTAL REFERENCIAL</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{usd(preview.totalUsd)}</p>
                  <p className="mt-2 text-xs leading-5 text-white/75">Sujeto a confirmación de precios, impuestos y gastos.</p>
                </div>
                <div className="mt-4 divide-y divide-border rounded-lg border border-border px-3.5">
                  {[
                    { label: "FOB", amount: preview.fobUsd },
                    { label: "Flete internacional", amount: preview.freightUsd },
                    {
                      label: "Otros costos e impuestos",
                      amount: preview.totalUsd - preview.fobUsd - preview.freightUsd,
                    },
                  ].map(({ label, amount }) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <p className="font-medium text-foreground">{label}</p>
                      <span className="shrink-0 tabular-nums text-foreground">{amount ? usd(amount) : "—"}</span>
                    </div>
                  ))}
                </div>
                <details className="group mt-3 rounded-lg border border-border px-3.5 py-3">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium marker:hidden">
                    <span>Ver desglose completo</span>
                    <ChevronDown size={15} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <BreakdownGroup title="Importación marítima" total={preview.cifUsd}>
                      <Row label="FOB · precio en China" value={preview.fobUsd} />
                      <Row label="Flete internacional" value={preview.freightUsd} />
                      <Row label="Seguro" value={preview.insuranceUsd} dashOnZero={false} />
                      <Row label="CIF" value={preview.cifUsd} strong />
                    </BreakdownGroup>
                    <BreakdownGroup title="Tributos de importación" total={preview.contentSubtotalUsd + preview.perceptionUsd}>
                      <Row label="ADV" value={preview.advUsd} />
                      <Row label="IPM" value={preview.ipmUsd} />
                      <Row label="IGV de importación" value={preview.importIgvUsd} />
                      <Row label="Tasa de despacho" value={preview.dispatchTaxUsd} />
                      <Row label="Subtotal" value={preview.contentSubtotalUsd} strong />
                      <Row label={`Percepción ${fmt.format((input.adjustments.perceptionRate ?? settings.perceptionRate) * 100)}%`} value={preview.perceptionUsd} />
                    </BreakdownGroup>
                    <BreakdownGroup title="Gastos locales" total={preview.localSubtotalUsd}>
                      {localCostKeys.map((key) => <Row key={key} label={localCostLabels[key]} value={preview.localCosts[key]} />)}
                      <Row label="IGV de gastos" value={preview.localIgvUsd} />
                      <Row label="Subtotal gastos" value={preview.localSubtotalUsd} strong />
                    </BreakdownGroup>
                    <section className="rounded-lg border border-border px-3.5 py-3">
                      <h3 className="text-sm font-medium">Referencia en soles</h3>
                      <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                        <Row label="Derechos de aduana" customValue={pen(preview.customsDutiesPen)} />
                        <Row label="Percepción" customValue={pen(preview.perceptionPen)} />
                        <p className="pt-1 text-xs text-muted">Tipo de cambio: {fmt.format(preview.exchangeRate)} S/ por USD</p>
                      </div>
                    </section>
                  </div>
                </details>
              </div> : (
                <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-5 text-center">
                  <p className="text-sm font-semibold">Aún no hay un total para mostrar</p>
                  <p className="mt-2 text-sm leading-5 text-muted">Ingresa el FOB y el flete internacional para calcular la cotización.</p>
                </div>
              )}
              <div className="mt-5 border-t border-border pt-4">
                {quote && <p className="mb-3 flex items-center gap-2 text-xs text-success"><Check size={15} />Cotización guardada el {new Date(quote.updatedAt).toLocaleDateString("es-PE")}</p>}
                {saved && <p role="status" className="mb-3 flex items-center gap-2 text-xs text-success"><Check size={15} />Guardada. La solicitud pasó a Cotizado.</p>}
                {emailNotice && <p role="status" className="mb-3 rounded-lg bg-green-50 p-3 text-xs text-green-900">{emailNotice}</p>}
                {quote && !saved && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Tienes cambios sin guardar. Guarda la cotización para conservarlos y habilitar el envío.</p>}
                <Button className="w-full" type="submit" disabled={saving || sendingEmail || !hasRequiredAmounts || Boolean(quote && saved)}><Save size={16} />{saving ? sendingEmail ? "Guardando y enviando…" : "Guardando cotización…" : quote ? fri.data.email ? "Guardar cambios y enviar" : "Guardar cambios" : fri.data.email ? "Guardar y enviar proforma" : "Guardar cotización"}</Button>
                <Button className="mt-2 w-full" type="button" variant="secondary" onClick={() => void downloadProforma()} disabled={!quote || !saved || saving || downloading}>
                  <Download size={16} />{downloading ? "Preparando proforma…" : "Descargar proforma"}
                </Button>
                {!saved && <p className="mt-2 text-center text-[11px] leading-5 text-muted">Guarda la cotización para descargar la proforma con los últimos cambios.</p>}
                <Button className="mt-2 w-full" type="button" variant="secondary" onClick={() => void sendByEmail()} disabled={!quote || !saved || !fri.data.email || saving || sendingEmail}>
                  <Mail size={16} />{sendingEmail ? "Enviando proforma…" : emailNotice ? "Reenviar proforma PDF" : "Enviar proforma PDF"}
                </Button>
                {fri.data.email ? <p className="mt-3 text-center text-xs leading-5 text-muted">Se enviará al cliente a <span className="font-medium text-foreground">{fri.data.email}</span>.</p> : <p className="mt-3 text-center text-xs leading-5 text-muted">El FRI no tiene correo registrado; no se puede enviar la proforma.</p>}
                <p className="mt-3 text-center text-xs leading-5 text-muted">Los ajustes de esta cotización no cambian las tarifas base.</p>
              </div>
            </aside>
          </form>
        </>
      )}
    </>
  );
}

function BreakdownGroup({ title, total, children }: { title: string; total: number; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border px-3.5 py-3">
      <div className="flex items-center justify-between gap-3 text-sm font-medium">
        <h3>{title}</h3>
        <span className="shrink-0 tabular-nums text-muted">{usd(total)}</span>
      </div>
      <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">{children}</div>
    </section>
  );
}
function Row({ label, value, strong, dashOnZero = true, customValue }: { label: string; value?: number; strong?: boolean; dashOnZero?: boolean; customValue?: string }) {
  const display = customValue ?? (value === undefined || (dashOnZero && !value) ? "—" : usd(value));
  return <div className={`flex items-start justify-between gap-3 ${strong ? "border-t border-border pt-2 font-semibold text-foreground" : "text-muted"}`}><span>{label}</span><span className="shrink-0 text-right tabular-nums">{display}</span></div>;
}
