"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, FileText, Mail, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { loadFri, type Fri } from "@/features/fri/api";
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
    setSaved(false);
    try {
      const result = await saveQuotation(requestId, input);
      setQuote(result);
      setSettings(result.settings);
      setInput(result.input);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la cotización");
    } finally {
      setSaving(false);
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
      <Link href="/panel/solicitudes" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} />Volver a solicitudes
      </Link>
      {loading ? <p role="status" className="rounded-xl border border-border bg-white p-8 text-sm text-muted">Cargando datos de la solicitud…</p> : !fri || !settings ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">{error || "No encontramos la solicitud o la configuración de cotización."}</div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-primary">COTIZACIÓN COMERCIAL · {fri.code}</p>
              <h1 className="text-2xl font-semibold">{quote ? "Editar cotización" : "Preparar cotización"}</h1>
              <p className="mt-2 text-sm text-muted">{fri.data.name} · {fri.data.brand} {fri.data.model} · {fri.data.quantity} unidad(es)</p>
            </div>
            <Link href={`/panel/solicitudes/${fri.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-background"><FileText size={16} />Ver solicitud FRI</Link>
          </div>

          <div className="mb-5 rounded-xl border border-accent-border bg-accent-soft px-4 py-3 text-sm leading-6 text-navy">
            Ingresa FOB y flete. Los cálculos usan los parámetros base guardados; cualquier ajuste hecho aquí queda solo en esta cotización.
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}

          <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-5">
              <section className="rounded-xl border border-border bg-white p-5 md:p-6">
                <h2 className="font-semibold">Importación marítima FCL</h2>
                <p className="mt-1 text-xs text-muted">Precios proporcionados por la proveedora.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="FOB (USD)" required hint={fri.data.catalogReference?.currency.toUpperCase() === "USD" && fri.data.catalogReference.price !== null ? `Precio referencial del ${fri.data.catalogReference.sourceType === "supplier_excel" ? "Excel de proveedora" : "catálogo web"}: USD ${fmt.format(fri.data.catalogReference.price)}. Confirma o ajusta con la proveedora.` : "Este FRI no tiene un FOB referencial de catálogo. Ingresa el precio confirmado por la proveedora."}><input className={inputClass} type="number" min="0.01" step="0.01" value={amountText(input.fobUsd || undefined)} onChange={(e) => setAmount("fobUsd", e.target.value)} required /></Field>
                  <Field label="Flete internacional (USD)" required hint={fri.data.vehicleType === "Automóvil" ? "Valor referencial precargado: USD 3,000 para automóvil. Confirma o ajusta el flete real." : fri.data.vehicleType === "Camión" ? "Valor referencial precargado: USD 9,000 para camión. Confirma o ajusta el flete real." : "El FRI no especifica el tipo de vehículo. Ingresa el flete internacional confirmado."}><input className={inputClass} type="number" min="0.01" step="0.01" value={amountText(input.freightUsd || undefined)} onChange={(e) => setAmount("freightUsd", e.target.value)} required /></Field>
                </div>
              </section>

              <details className="rounded-xl border border-border bg-white">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold marker:hidden">Ajustes excepcionales de esta cotización <span className="ml-1 text-xs font-normal text-muted">· opcional</span></summary>
                <div className="border-t border-border px-5 py-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-xl text-xs leading-5 text-muted">Deja un campo vacío para usar el valor base. Los ajustes no cambian la configuración general.</p>
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

            <aside className="rounded-xl border border-border bg-white p-5 xl:sticky xl:top-5">
              <h2 className="font-semibold">Resumen del cálculo</h2>
              <p className="mt-1 text-xs text-muted">Vista previa en tiempo real</p>
              {preview && <div className="mt-5 space-y-5 text-sm">
                <Group title="Importación marítima">
                  <Row label="FOB" value={preview.fobUsd} />
                  <Row label="Flete" value={preview.freightUsd} />
                  <Row label="Seguro" value={preview.insuranceUsd} dashOnZero={false} />
                  <Row label="CIF" value={preview.cifUsd} strong />
                </Group>
                <Group title="Contenido">
                  <Row label="ADV" value={preview.advUsd} />
                  <Row label="IPM" value={preview.ipmUsd} />
                  <Row label="IGV" value={preview.importIgvUsd} />
                  <Row label="Tasa de despacho" value={preview.dispatchTaxUsd} />
                  <Row label="Subtotal" value={preview.contentSubtotalUsd} strong />
                  <Row label={`Percepción ${fmt.format((input.adjustments.perceptionRate ?? settings.perceptionRate) * 100)}%`} value={preview.perceptionUsd} />
                </Group>
                <Group title="Gastos locales">
                  {localCostKeys.map((key) => <Row key={key} label={localCostLabels[key]} value={preview.localCosts[key]} />)}
                  <Row label="IGV de gastos" value={preview.localIgvUsd} />
                  <Row label="Subtotal gastos" value={preview.localSubtotalUsd} strong />
                </Group>
                <Group title="Referencia en soles">
                  <Row label="Derechos de aduana" customValue={pen(preview.customsDutiesPen)} />
                  <Row label="Percepción" customValue={pen(preview.perceptionPen)} />
                  <p className="pt-1 text-[11px] text-muted">T/C {fmt.format(preview.exchangeRate)} S/ por USD</p>
                </Group>
                <div className="rounded-xl bg-primary px-4 py-4 text-white">
                  <p className="text-xs text-white/75">TOTAL DE LA COTIZACIÓN</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{usd(preview.totalUsd)}</p>
                </div>
              </div>}
              <div className="mt-5 border-t border-border pt-4">
                {quote && <p className="mb-3 flex items-center gap-2 text-xs text-success"><Check size={15} />Cotización guardada el {new Date(quote.updatedAt).toLocaleDateString("es-PE")}</p>}
                {saved && <p role="status" className="mb-3 flex items-center gap-2 text-xs text-success"><Check size={15} />Guardada. La solicitud pasó a Cotizado.</p>}
                {emailNotice && <p role="status" className="mb-3 rounded-lg bg-green-50 p-3 text-xs text-green-900">{emailNotice}</p>}
                <Button className="w-full" type="submit" disabled={saving || !input.fobUsd || !input.freightUsd}><Save size={16} />{saving ? "Guardando…" : quote ? "Guardar cambios" : "Guardar cotización"}</Button>
                <Button className="mt-2 w-full" type="button" variant="secondary" onClick={() => void sendByEmail()} disabled={!quote || !saved || !fri.data.email || saving || sendingEmail}>
                  <Mail size={16} />{sendingEmail ? "Enviando proforma…" : "Enviar proforma al cliente"}
                </Button>
                {!fri.data.email && <p className="mt-2 text-center text-[11px] leading-5 text-muted">La solicitud FRI no tiene correo; no se puede enviar la proforma.</p>}
                {quote && !saved && fri.data.email && <p className="mt-2 text-center text-[11px] leading-5 text-muted">Guarda los cambios antes de enviar la proforma.</p>}
                <p className="mt-2 text-center text-[11px] leading-5 text-muted">Las tarifas base no se modifican desde esta pantalla.</p>
              </div>
            </aside>
          </form>
        </>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3><div className="space-y-2">{children}</div></section>;
}
function Row({ label, value, strong, dashOnZero = true, customValue }: { label: string; value?: number; strong?: boolean; dashOnZero?: boolean; customValue?: string }) {
  const display = customValue ?? (value === undefined || (dashOnZero && !value) ? "—" : usd(value));
  return <div className={`flex items-start justify-between gap-3 ${strong ? "border-t border-border pt-2 font-semibold text-foreground" : "text-muted"}`}><span>{label}</span><span className="shrink-0 text-right tabular-nums">{display}</span></div>;
}
