"use client";
import { Select } from "@/components/ui/select";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Contact,
  FileText,
  IdCard,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { declarationText, departments } from "../options";
import { defaults, type FriFormValues, friSchema, stepFields, transmissions, fuelGroups, fuelTypesByGroup, vehicleTypes } from "../schema";
import { submitFri } from "../api";
import { documentRules } from "../document-rules";
import { useFriDraft } from "../use-fri-draft";
import { FriSummary } from "./fri-summary";
import { rememberReceipt } from "../receipt-storage";
import { CatalogVehiclePicker } from "@/features/vehicle-catalog/components/catalog-vehicle-picker";
import { getCatalogVehicle, getPublicCatalogIndex, type CatalogVehicle } from "@/features/vehicle-catalog/api";
const steps = [
  "Cliente",
  "Vehículo",
  "Condiciones",
  "Confirmación",
];
const titles = [
  "Datos del cliente",
  "¿Qué vehículo deseas importar?",
  "Condiciones comerciales",
  "Revisa y confirma tu solicitud",
];
const descriptions = [
  "Identifica al solicitante y deja un celular de contacto.",
  "Describe el vehículo que buscas. Puedes dejar los datos opcionales sin completar.",
  "Indica tu presupuesto y si ya tienes un proveedor de preferencia.",
  "Comprueba tus datos. Puedes editar cada sección antes de enviar.",
];
const fuelGroupLabels: Record<(typeof fuelGroups)[number], string> = {
  EV: "Eléctrico e híbrido",
  Gas: "Gas (GNV / GNL)",
  Gasolina: "Diésel",
};
function FormSectionHeading({
  icon: Icon,
  children,
  separated = false,
}: {
  icon: LucideIcon;
  children: string;
  separated?: boolean;
}) {
  return (
    <h3
      className={`flex items-center gap-3 md:col-span-2 ${
        separated ? "border-t border-border pt-5" : ""
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
        <Icon size={17} aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight text-navy">
        {children}
      </span>
    </h3>
  );
}
export function FriForm({ preview = false }: { preview?: boolean }) {
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogVehicle | null>(null);
  const [manualVehicleEntry, setManualVehicleEntry] = useState(false);
  const checkingRef = useRef(false);
  const sendingRef = useRef(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
  const pendingFocus = useRef<keyof FriFormValues | null>(null);
  const router = useRouter();
  const {
    register,
    control,
    trigger,
    handleSubmit,
    setError: setFieldError,
    clearErrors,
    formState: { errors, isSubmitting },
    getValues,
    resetField,
    setValue,
    reset,
    subscribe,
    setFocus,
  } = useForm<FriFormValues>({
    resolver: zodResolver(friSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const {
    step,
    setStep,
    ready,
    restored,
    storageError,
    clearDraft,
    startOver,
  } = useFriDraft({ enabled: !preview, reset, subscribe, getValues });
  useEffect(() => {
    void getPublicCatalogIndex().catch(() => {
      // The picker retains remote search as a fallback if preloading is unavailable.
    });
  }, []);
  useEffect(() => {
    if (!ready || previousStep.current === step) return;
    previousStep.current = step;
    heading.current?.scrollIntoView({ block: "start" });
    if (pendingFocus.current) {
      setFocus(pendingFocus.current);
      pendingFocus.current = null;
    } else heading.current?.focus({ preventScroll: true });
  }, [step, ready, setFocus]);
  const documentType = useWatch({ control, name: "documentType" });
  const number = useWatch({ control, name: "documentNumber" }) || "";
  const hasSupplier = useWatch({ control, name: "hasSupplier" });
  const catalogVehicleId = useWatch({ control, name: "catalogVehicleId" });
  const vehicleDraftValues = useWatch({
    control,
    name: ["vehicleType", "brand", "model", "version", "year", "color"],
  });
  const fuelGroup = useWatch({ control, name: "fuelGroup" });
  const corporate = documentType === "RUC" && number.startsWith("20");
  const showVehicleDetails = Boolean(
    selectedCatalog || catalogVehicleId || manualVehicleEntry || vehicleDraftValues.some(Boolean),
  );
  const documentRule = documentRules[documentType] ?? documentRules.DNI;
  const documentRegistration = register("documentNumber");
  useEffect(() => {
    if (!catalogVehicleId || selectedCatalog?.id === catalogVehicleId) return;
    let active = true;
    getCatalogVehicle(catalogVehicleId)
      .then((vehicle) => {
        if (active) setSelectedCatalog(vehicle);
      })
      .catch(() => {
        if (active) setSelectedCatalog(null);
      });
    return () => {
      active = false;
    };
  }, [catalogVehicleId, selectedCatalog?.id]);
  const selectCatalogVehicle = useCallback((vehicle: CatalogVehicle) => {
    setSelectedCatalog(vehicle);
    setValue("catalogVehicleId", vehicle.id, { shouldDirty: true });
    setValue("brand", vehicle.brand, { shouldDirty: true });
    setValue("model", vehicle.model.slice(0, 100), { shouldDirty: true });
    if (vehicle.variant) setValue("version", vehicle.variant.slice(0, 300), { shouldDirty: true });
    if (vehicle.year) setValue("year", vehicle.year, { shouldDirty: true });
    const fuel = vehicle.fuel?.toLowerCase();
    setValue("fuelGroup", "", { shouldDirty: true });
    setValue("fuelType", "", { shouldDirty: true });
    setValue("autonomy", undefined, { shouldDirty: true });
    if (fuel?.includes("erev") || fuel?.includes("range extender") || fuel?.includes("增程")) {
      setValue("fuelGroup", "EV", { shouldDirty: true });
      setValue("fuelType", "EREV (alto kilometraje extendido)", { shouldDirty: true });
    } else if (fuel?.includes("plug-in") || fuel?.includes("phev") || fuel?.includes("插电")) {
      setValue("fuelGroup", "EV", { shouldDirty: true });
      setValue("fuelType", "Híbrido enchufable", { shouldDirty: true });
    } else if (fuel?.includes("hybrid") || fuel?.includes("híbrido") || fuel?.includes("混动")) {
      setValue("fuelGroup", "EV", { shouldDirty: true });
      setValue("fuelType", "Híbrido autorregenerativo", { shouldDirty: true });
    } else if (fuel?.includes("gnv") || fuel?.includes("cng")) {
      setValue("fuelGroup", "Gas", { shouldDirty: true });
      setValue("fuelType", "GNV", { shouldDirty: true });
    } else if (fuel?.includes("gnl") || fuel?.includes("lng")) {
      setValue("fuelGroup", "Gas", { shouldDirty: true });
      setValue("fuelType", "GNL", { shouldDirty: true });
    } else if (fuel?.includes("diesel") || fuel?.includes("diésel")) {
      setValue("fuelGroup", "Gasolina", { shouldDirty: true });
      setValue("fuelType", "Diésel", { shouldDirty: true });
    }
    const transmission = vehicle.transmission?.toLowerCase();
    if (transmission?.includes("dct") || transmission?.includes("doble embrague")) setValue("transmission", "Automática de doble embrague (DCT)", { shouldDirty: true });
    else if (transmission?.includes("cvt") && (fuel?.includes("hybrid") || fuel?.includes("híbrido"))) setValue("transmission", "Transmisión híbrida (e-CVT / DHT)", { shouldDirty: true });
    else if (transmission?.includes("cvt")) setValue("transmission", "Transmisión continuamente variable (CVT)", { shouldDirty: true });
    else if (transmission?.includes("amt") || transmission?.includes("automatizada")) setValue("transmission", "Manual automatizada (AMT)", { shouldDirty: true });
    else if (transmission?.includes("manual") || transmission?.includes("mt")) setValue("transmission", "Manual o mecánica (MT)", { shouldDirty: true });
    else if (transmission?.includes("automatic") || transmission?.includes("automática") || transmission === "at") setValue("transmission", "Automática convencional (AT)", { shouldDirty: true });
    else if (transmission?.includes("electric") || transmission?.includes("eléctrica") || transmission === "ev") setValue("transmission", "Transmisión eléctrica (EV / e-Axle)", { shouldDirty: true });
  }, [setValue]);
  const hints: Partial<Record<keyof FriFormValues, string>> = {
    version:
      "Por ejemplo: XLE o versión de equipamiento. Puedes dejarlo en blanco.",
    power: "Incluye la unidad, por ejemplo: 150 HP o 110 kW.",
    autonomy: "Distancia estimada con una carga completa, en kilómetros.",
    mobile: "Celular peruano de 9 dígitos, sin +51.",
  };
  const describedBy = (name: keyof FriFormValues) =>
    [hints[name] ? `${name}-hint` : "", errors[name] ? `${name}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const field = (
    name: keyof FriFormValues,
    label: string,
    required = false,
    type = "text",
  ) => (
    <Field
      key={name}
      label={label}
      required={required}
      optional={!required}
      hint={hints[name]}
      error={errors[name]?.message}
      htmlFor={name}
    >
      <input
        id={name}
        className={inputClass}
        type={type}
        aria-invalid={!!errors[name]}
        aria-describedby={describedBy(name)}
        autoComplete={name === "mobile"
          ? "tel-national"
          : name === "name" && !corporate
          ? "name"
          : undefined}
        step={type === "number" && (name === "budget" || name === "autonomy")
          ? "any"
          : undefined}
        {...register(
          name,
          type === "number"
            ? { setValueAs: (v: string) => (v === "" ? undefined : Number(v)) }
            : {},
        )}
      />
    </Field>
  );
  const select = (
    name: keyof FriFormValues,
    label: string,
    options: readonly string[],
    required = true,
    optionLabels?: Record<string, string>,
    hint?: string,
  ) => (
    <Field
      label={label}
      required={required}
      optional={!required}
      error={errors[name]?.message ? "Selecciona una opción válida" : undefined}
      htmlFor={name}
      hint={hint}
    >
      <Select
        id={name}
        className={inputClass}
        disabled={name === "fuelType" && !fuelGroup}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...register(
          name,
          name === "documentType"
            ? {
              onChange: () => {
                resetField("documentNumber", { defaultValue: "" });
                setValue("issuingCountry", "");
                setValue("representative", "");
                clearErrors([
                  "documentNumber",
                  "issuingCountry",
                  "representative",
                ]);
              },
            }
            : name === "fuelGroup"
            ? {
              onChange: () => {
                setValue("fuelType", "", { shouldDirty: true });
                setValue("autonomy", undefined);
                clearErrors(["fuelType", "autonomy"]);
              },
            }
            : {},
        )}
      >
        <option value="">Selecciona una opción</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {optionLabels?.[v] ?? v}
          </option>
        ))}
      </Select>
    </Field>
  );
  const textArea = (name: keyof FriFormValues, label: string) => (
    <div className="md:col-span-2">
      <Field
        label={label}
        optional
        error={errors[name]?.message}
        htmlFor={name}
        hint={name === "equipment"
          ? "Por ejemplo: cámara de retroceso, asientos de cuero o accesorios específicos."
          : undefined}
      >
        <textarea
          id={name}
          className={inputClass}
          rows={3}
          aria-invalid={!!errors[name]}
          aria-describedby={[
            name === "equipment" ? `${name}-hint` : "",
            errors[name] ? `${name}-error` : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined}
          {...register(name)}
        />
      </Field>
    </div>
  );
  async function next() {
    if (checkingRef.current || sendingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      setError("");
      if (step === 0) clearErrors(["documentNumber", "issuingCountry"]);
      const valid = await trigger(stepFields[step], { shouldFocus: true });
      if (step === 0) {
        const n = getValues("documentNumber").trim();
        const t = getValues("documentType");
        const rule = documentRules[t];
        if (!rule) return;
        if (!rule.pattern.test(n)) {
          setFieldError(
            "documentNumber",
            {
              type: "manual",
              message: rule.message,
            },
            { shouldFocus: true },
          );
          return;
        }
        if (t === "Pasaporte" && !getValues("issuingCountry").trim()) {
          setFieldError(
            "issuingCountry",
            { type: "manual", message: "Indica el país emisor" },
            { shouldFocus: true },
          );
          return;
        }
      }
      if (valid) {
        setStep(editing ? 3 : Math.min(step + 1, 3));
        setEditing(false);
      } else {
        setError("Completa o corrige los campos señalados para continuar.");
      }
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }
  async function submit(values: FriFormValues) {
    setError("");
    if (preview) {
      setPreviewConfirmed(true);
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const receipt = await submitFri(values);
      rememberReceipt(receipt.id, receipt.receiptToken);
      setRegistered(true);
      clearDraft();
      router.push(`/fri/exito/${receipt.id}`);
    } catch (e) {
      sendingRef.current = false;
      setError(
        e instanceof Error ? e.message : "No se pudo enviar la solicitud",
      );
    }
  }
  if (!ready) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-white p-8 text-sm text-muted"
      >
        Recuperando tu formulario…
      </div>
    );
  }
  return (
    <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <form
        noValidate
        onSubmit={(event) => {
          if (checkingRef.current || sendingRef.current) {
            event.preventDefault();
            return;
          }
          if (step < 3) {
            event.preventDefault();
            void next();
            return;
          }
          void handleSubmit(submit, () => {
            setError("Revisa los campos señalados.");
            const values = getValues();
            const result = friSchema.safeParse(values);
            if (!result.success) {
              const key = result.error.issues[0]?.path[0];
              const target = stepFields.findIndex((fields) =>
                fields.includes(key as keyof FriFormValues)
              );
              if (target >= 0) {
                pendingFocus.current = key as keyof FriFormValues;
                setStep(target);
              }
            }
          })(event);
        }}
        className="w-full min-w-0 rounded-xl border border-border bg-white p-5 md:p-8"
      >
        {preview && (
          <p className="mb-6 rounded-lg bg-accent-soft p-3 text-sm text-primary">
            Vista previa del formulario: no registra solicitudes.{" "}
            <a
              href="/fri"
              target="_blank"
              rel="noopener"
              className="font-semibold underline underline-offset-2"
            >
              Abrir formulario público
            </a>
          </p>
        )}
        {!preview && (
          <div className="mb-6 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-background p-3 text-xs text-muted">
            <p className="min-w-0" role="status">
              {storageError
                ? "Este navegador no permite guardar el avance. Mantén esta página abierta hasta enviar."
                : restored
                ? "Recuperamos tu avance. Puedes continuar donde te quedaste."
                : "Tu avance se guarda automáticamente en este navegador."}
            </p>
            <button
              type="button"
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-1.5 text-xs font-semibold text-primary underline underline-offset-2"
              disabled={isSubmitting || checking || registered}
              onClick={() => {
                resetDialog.current?.showModal();
              }}
            >
              Reiniciar
            </button>
          </div>
        )}
        <div className="mb-6 md:hidden">
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-semibold">{steps[step]}</span>
            <span className="text-muted">Paso {step + 1} de 4</span>
          </div>
          <progress
            aria-label="Progreso del formulario"
            value={step + 1}
            max={4}
            className="h-2 w-full overflow-hidden rounded-full accent-accent"
          />
        </div>
        <ol className="mb-9 hidden grid-cols-4 gap-4 md:grid" aria-label="Pasos del formulario">
          {steps.map((label, i) => (
            <li
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={`border-t-3 pt-3 ${
                i <= step
                  ? "border-accent text-primary"
                  : "border-border text-muted"
              }`}
            >
              <span className="flex items-center gap-1 text-xs font-semibold">
                {(i < step || (editing && i < 3)) && i !== step
                  ? <Check size={12} aria-label="Completado" />
                  : (
                    `${i + 1}.`
                  )} {label}
              </span>
            </li>
          ))}
        </ol>
        <div className="mb-6">
          <p className="mb-2 hidden text-xs font-bold tracking-[.12em] text-muted md:block">
            PASO {step + 1} DE 4
          </p>
          <h2
            ref={heading}
            tabIndex={-1}
            className="scroll-mt-6 text-xl font-semibold"
          >
            {titles[step]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {descriptions[step]}
          </p>
          {step < 3 && (
            <p className="mt-2 text-xs text-muted">
              Los campos con <span className="text-primary">*</span>{" "}
              son obligatorios.
            </p>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <fieldset
          disabled={isSubmitting || registered}
          className="grid w-full min-w-0 gap-x-6 gap-y-5 md:grid-cols-2"
        >
          {step === 1 && (
            <CatalogVehiclePicker
              value={catalogVehicleId}
              disabled={isSubmitting || registered}
              onSelect={selectCatalogVehicle}
              onManualEntry={() => {
                for (const name of stepFields[1]) resetField(name);
                setSelectedCatalog(null);
                setManualVehicleEntry(true);
              }}
              onClear={() => {
                setSelectedCatalog(null);
                setValue("catalogVehicleId", "", { shouldDirty: true });
              }}
            />
          )}
          {step === 1 && showVehicleDetails && selectedCatalog && (
            <div className="md:col-span-2 rounded-xl border border-accent-border bg-accent-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Precio referencial en China (FOB)
              </p>
              {selectedCatalog.price !== null ? (
                <p className="mt-1 text-lg font-semibold text-navy">
                  {selectedCatalog.currency} {selectedCatalog.price.toLocaleString(
                    "es-PE",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </p>
              ) : (
                <p className="mt-1 text-sm font-medium text-navy">No hay un precio referencial publicado para este vehículo.</p>
              )}
              <p className="mt-1 text-xs leading-5 text-muted">
                Referencia del {selectedCatalog.source === "supplier_excel" ? "proveedor TMB" : "catálogo web de TMB"}. El precio puede cambiar; la cotización formal se enviará después en PDF.
              </p>
            </div>
          )}
          {step === 0 && (
            <>
              <section className="grid gap-x-6 gap-y-5 border-b border-border pb-5 md:col-span-2 md:grid-cols-2">
                <FormSectionHeading icon={IdCard}>Identificación</FormSectionHeading>
                {select("documentType", "Tipo de documento", [
                  "DNI",
                  "RUC",
                  "CE",
                  "Pasaporte",
                ])}
                <Field
                  label="Número de documento"
                  required
                  htmlFor="documentNumber"
                  error={errors.documentNumber?.message}
                >
                  <input
                    id="documentNumber"
                    type="text"
                    className={inputClass}
                    inputMode={documentRule.numeric ? "numeric" : "text"}
                    maxLength={documentRule.maxLength}
                    aria-describedby={`documentNumber-hint${
                      errors.documentNumber ? " documentNumber-error" : ""
                    }`}
                    aria-invalid={!!errors.documentNumber}
                    {...documentRegistration}
                    onChange={(event) => {
                      event.target.value = event.target.value
                        .replace(documentRule.invalidCharacters, "")
                        .slice(0, documentRule.maxLength);
                      if (
                        documentType === "RUC" &&
                        !event.target.value.startsWith("20")
                      ) {
                        setValue("representative", "");
                        clearErrors("representative");
                      }
                      void documentRegistration.onChange(event);
                    }}
                  />
                  <p
                    id="documentNumber-hint"
                    className="mt-1.5 text-xs leading-5 text-muted"
                  >
                    {documentRule.hint}
                  </p>
                </Field>
                {documentType === "Pasaporte" &&
                  field("issuingCountry", "País emisor", true)}
                {field(
                  "name",
                  corporate ? "Razón social" : "Nombres y apellidos",
                  true,
                )}
                {corporate && field("representative", "Representante legal")}
              </section>
              <section className="grid gap-x-6 gap-y-5 md:col-span-2 md:grid-cols-2">
                <FormSectionHeading icon={Contact}>Datos de contacto</FormSectionHeading>
                {field("company", "Empresa")}
                {field("position", "Cargo")}
                {select("department", "Departamento", departments)}
                {field("mobile", "Celular", true, "tel")}
              </section>
            </>
          )}
          {step === 1 && showVehicleDetails && (
            <section className="grid gap-x-6 gap-y-5 border-b border-border pb-5 md:col-span-2 md:grid-cols-2">
              <FormSectionHeading icon={CarFront}>Datos del vehículo</FormSectionHeading>
              {select("vehicleType", "Tipo de vehículo", vehicleTypes)}
              {field("brand", "Marca", true)}
              {field("model", "Modelo", true)}
              {field("version", "Versión")}
              {field("year", "Año", true, "number")}
              {field("color", "Color")}
              <FormSectionHeading icon={SlidersHorizontal} separated>
                Características
              </FormSectionHeading>
              {field("quantity", "Cantidad", true, "number")}
              {select(
                "fuelGroup",
                "Grupo de combustible",
                fuelGroups,
                true,
                fuelGroupLabels,
              )}
              {select(
                "fuelType",
                "Tipo de combustible",
                fuelGroup ? fuelTypesByGroup[fuelGroup] : [],
                true,
                undefined,
                fuelGroup ? undefined : "Elige primero el grupo de combustible.",
              )}
              {select("transmission", "Transmisión", transmissions)}
              {field("power", "Potencia (indica unidad)")}
              {fuelGroup === "EV" &&
                field("autonomy", "Autonomía EV (km)", false, "number")}
              {textArea("equipment", "Equipamiento requerido")}
            </section>
          )}
          {step === 2 && (
            <>
              {field("budget", "Presupuesto estimado (USD)", true, "number")}
              <fieldset
                className="md:col-span-2"
                aria-invalid={!!errors.hasSupplier}
                aria-describedby={errors.hasSupplier
                  ? "hasSupplier-error"
                  : undefined}
              >
                <legend className="mb-1 text-sm font-medium">
                  ¿Tiene un proveedor de preferencia?{" "}
                  <span className="text-primary">*</span>
                </legend>
                <p className="mb-3 text-xs leading-5 text-muted">
                  Si respondes que sí, te pediremos los datos comerciales del proveedor.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Sí", "Conozco al proveedor y completaré sus datos."],
                    ["No", "Continuaré sin indicar un proveedor."],
                  ].map(([value, description]) => (
                    <label
                      key={value}
                      className="flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-accent-soft focus-within:ring-2 focus-within:ring-accent/20"
                    >
                      <input
                        type="radio"
                        value={value}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        aria-labelledby={`supplier-option-${value}-label`}
                        aria-describedby={`supplier-option-${value}-description`}
                        {...register("hasSupplier", {
                          onChange: (event) => {
                            if (event.target.value === "No") {
                              setValue("supplier", "");
                              setValue("incoterm", "");
                              setValue("purchaseDate", "");
                              setValue("alternatives", undefined);
                              clearErrors([
                                "supplier",
                                "incoterm",
                                "purchaseDate",
                                "alternatives",
                              ]);
                            }
                          },
                        })}
                      />
                      <span className="min-w-0">
                        <span id={`supplier-option-${value}-label`} className="block text-sm font-semibold">{value}</span>
                        <span id={`supplier-option-${value}-description`} className="mt-0.5 block text-xs leading-5 text-muted">
                          {description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.hasSupplier && (
                  <p
                    id="hasSupplier-error"
                    role="alert"
                    className="mt-2 text-xs text-danger"
                  >
                    Selecciona Sí o No
                  </p>
                )}
              </fieldset>
              {hasSupplier === "Sí" && (
                <>
                  {field("supplier", "Proveedor de preferencia", true)}
                  {select("incoterm", "Incoterm", [
                    "FOB",
                    "FCA",
                    "CIF",
                    "CFR",
                    "EXW",
                  ])}
                  {field(
                    "purchaseDate",
                    "Fecha estimada de compra",
                    true,
                    "date",
                  )}
                  <div className="md:col-span-2 rounded-lg bg-background px-4 py-3 text-sm text-foreground">
                    <span className="font-medium">Forma de pago:</span> Al contado
                  </div>
                  <fieldset
                    aria-describedby={errors.alternatives
                      ? "alternatives-error"
                      : undefined}
                    aria-invalid={!!errors.alternatives}
                  >
                    <legend className="mb-3 text-sm font-medium">
                      ¿Acepta alternativas equivalentes?{" "}
                      <span className="text-primary">*</span>
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["Sí", "No"].map((v) => (
                        <label
                          key={v}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-4 text-sm transition-colors hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-accent-soft focus-within:ring-2 focus-within:ring-accent/20"
                        >
                          <input
                            type="radio"
                            value={v}
                            className="h-4 w-4 accent-primary"
                            {...register("alternatives")}
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                    {errors.alternatives && (
                      <p
                        id="alternatives-error"
                        role="alert"
                        className="mt-2 text-xs text-danger"
                      >
                        Selecciona Sí o No
                      </p>
                    )}
                  </fieldset>
                </>
              )}
              <div className="rounded-lg bg-background p-4 md:col-span-2">
                <p className="text-xs text-muted">Puerto de destino</p>
                <p className="mt-1 text-sm font-semibold">Callao, Perú</p>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="md:col-span-2">
                <FriSummary
                  data={getValues()}
                  catalogVehicle={selectedCatalog}
                  compact
                  onEdit={(target) => {
                    setEditing(true);
                    setPreviewConfirmed(false);
                    setError("");
                    setStep(target);
                  }}
                />
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border p-4 md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-primary"
                  aria-invalid={!!errors.declaration}
                  aria-describedby={errors.declaration
                    ? "declaration-error"
                    : undefined}
                  {...register("declaration")}
                />
                <span className="text-sm leading-6 text-muted">
                  {declarationText}
                </span>
              </label>
              {errors.declaration && (
                <p
                  id="declaration-error"
                  role="alert"
                  className="text-xs text-danger md:col-span-2"
                >
                  {errors.declaration.message}
                </p>
              )}
            </>
          )}
        </fieldset>
        {preview && previewConfirmed && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-accent-soft p-3 text-sm text-primary"
          >
            Formulario validado correctamente. Esta vista previa no guarda
            solicitudes.
          </p>
        )}
        <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-4 md:static md:mx-0 md:px-0 md:pt-5">
          {(step > 0 || editing) && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting || checking || registered}
              onClick={() => {
                if (editing) {
                  setEditing(false);
                  setStep(3);
                  setError("");
                } else setStep((v) => v - 1);
              }}
            >
              <ArrowLeft size={15} />
              {editing ? "Volver al resumen" : "Anterior"}
            </Button>
          )}
          {step < 3
            ? (
              <Button
                type="submit"
                className="ml-auto"
                disabled={checking || registered}
              >
                {checking
                  ? "Revisando…"
                  : editing
                  ? "Revisar cambios"
                  : "Continuar"}
                <ArrowRight size={15} />
              </Button>
            )
            : (
              <Button type="submit" disabled={isSubmitting || registered}>
                {registered
                  ? "Solicitud registrada"
                  : isSubmitting
                  ? "Registrando…"
                  : preview
                  ? "Probar confirmación"
                  : "Enviar solicitud"}
                <ArrowRight size={15} />
              </Button>
            )}
        </div>
      </form>
      <aside className="hidden h-fit min-w-0 rounded-xl border border-border bg-white p-5 xl:block">
        <span className="rounded bg-accent-soft px-2 py-1 text-[10px] font-bold tracking-wider text-primary">
          FRI DIGITAL
        </span>
        <h3 className="mt-4 text-lg font-semibold">Así funciona</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Envía tu solicitud y el equipo de TMB revisará las opciones.
        </p>
        <div className="mt-5 space-y-4">
          {[
            [
              "01",
              "Completa el FRI",
              "Datos de contacto y vehículo.",
            ],
            [
              "02",
              "Revisión de TMB",
              "Verificaremos los datos y opciones.",
            ],
            ["03", "Descarga tu ficha", "Al finalizar podrás descargar el PDF."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-primary">
                {n}
              </span>
              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 flex gap-2 border-t border-border pt-5 text-xs leading-5 text-muted">
          <ShieldCheck size={18} className="shrink-0" />
          Esta ficha no constituye una orden de compra.
        </p>
        {preview && (
          <p className="mt-4 flex gap-2 text-xs text-primary">
            <FileText size={15} />
            Vista previa: no registra datos.
          </p>
        )}
      </aside>
      <dialog
        ref={resetDialog}
        aria-labelledby="reset-title"
        aria-describedby="reset-description"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-border bg-white p-6 text-foreground shadow-xl"
      >
        <h2 id="reset-title" className="text-lg font-semibold">
          ¿Empezar una nueva solicitud?
        </h2>
        <p id="reset-description" className="mt-3 text-sm leading-6 text-muted">
          Se borrarán los datos y el avance guardados de este formulario. Esta
          acción no modifica solicitudes ya enviadas.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            autoFocus
            onClick={() => resetDialog.current?.close()}
          >
            Seguir completando
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              startOver();
              setEditing(false);
              setError("");
              resetDialog.current?.close();
            }}
          >
            Borrar y empezar
          </Button>
        </div>
      </dialog>
    </div>
  );
}
