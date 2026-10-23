"use client";

import { useEffect, useState } from "react";
import { Check, RefreshCw, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import {
  loadQuotationSettings,
  saveQuotationSettings,
} from "../api";
import {
  localCostKeys,
  localCostLabels,
  type QuotationSettings,
} from "../types";

const percentFields = [
  ["insuranceRate", "Seguro sobre FOB + flete"],
  ["advRate", "ADV"],
  ["ipmRate", "IPM"],
  ["importIgvRate", "IGV de importación"],
  ["perceptionRate", "Percepción"],
  ["localIgvRate", "IGV de gastos locales"],
] as const;

function money(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}
function percent(value: number) {
  return String(Number((value * 100).toFixed(4)));
}

export function QuotationSettingsForm() {
  const [settings, setSettings] = useState<QuotationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadQuotationSettings()
      .then((data) => active && setSettings(data))
      .catch((e) => active && setError(e instanceof Error ? e.message : "No se pudo cargar la configuración"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [attempt]);

  const update = <K extends keyof QuotationSettings>(key: K, value: QuotationSettings[K]) => {
    setSettings((current) => current ? { ...current, [key]: value } : current);
    setSaved(false);
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      setSettings(await saveQuotationSettings(settings));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-7">
        <p className="mb-2 text-xs font-semibold text-primary">COTIZACIONES</p>
        <h1 className="text-2xl font-semibold">Parámetros base</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Define el tipo de cambio, tasas y gastos que se usarán como valores iniciales. Cada cotización guarda su propia copia y permite excepciones sin cambiar estos parámetros.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
          {error}
          {!settings && <Button variant="secondary" className="ml-3" onClick={() => { setLoading(true); setError(""); setAttempt((n) => n + 1); }}><RefreshCw size={15} />Reintentar</Button>}
        </div>
      )}
      {loading && !settings ? (
        <p role="status" className="rounded-xl border border-border bg-white p-8 text-sm text-muted">Cargando parámetros…</p>
      ) : settings ? (
        <form onSubmit={submit} className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-primary"><Settings2 size={19} /></div>
              <div><h2 className="font-semibold">Importación marítima y tributos</h2><p className="mt-1 text-xs text-muted">Tasas base aplicadas a FOB, flete y CIF.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Tipo de cambio" hint="Soles por dólar; se copia a cada cotización.">
                <input className={inputClass} type="number" min="0.0001" step="0.0001" value={settings.exchangeRate} onChange={(e) => update("exchangeRate", Number(e.target.value))} required />
              </Field>
              {percentFields.slice(0, 5).map(([key, label]) => (
                <Field key={key} label={`${label} (%)`}>
                  <input className={inputClass} type="number" min="0" max="100" step="0.01" value={percent(settings[key])} onChange={(e) => update(key, Number(e.target.value) / 100)} required />
                </Field>
              ))}
              <Field label="Tasa de despacho (USD)" optional>
                <input className={inputClass} type="number" min="0" step="0.01" value={money(settings.dispatchTaxUsd)} onChange={(e) => update("dispatchTaxUsd", Number(e.target.value))} />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-5 md:p-6">
            <div className="mb-5"><h2 className="font-semibold">Gastos locales</h2><p className="mt-1 text-xs text-muted">Los valores en cero se mostrarán como “—” en el desglose.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {localCostKeys.map((key) => (
                <Field key={key} label={`${localCostLabels[key]} (USD)`} optional>
                  <input className={inputClass} type="number" min="0" step="0.01" value={money(settings.localCosts[key])} onChange={(e) => update("localCosts", { ...settings.localCosts, [key]: Number(e.target.value) })} />
                </Field>
              ))}
              <Field label="IGV sobre gastos locales (%)">
                <input className={inputClass} type="number" min="0" max="100" step="0.01" value={percent(settings.localIgvRate)} onChange={(e) => update("localIgvRate", Number(e.target.value) / 100)} required />
              </Field>
            </div>
          </section>

          <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white/95 p-3 shadow-sm backdrop-blur">
            <p role={saved ? "status" : undefined} className="flex items-center gap-2 text-sm text-muted">
              {saved ? <><Check size={16} className="text-success" />Parámetros guardados.</> : "Los cambios afectan cotizaciones nuevas; las ya guardadas conservan sus valores."}
            </p>
            <Button type="submit" disabled={saving || loading}>
              <Save size={16} />{saving ? "Guardando…" : "Guardar parámetros"}
            </Button>
          </div>
        </form>
      ) : null}
    </>
  );
}
