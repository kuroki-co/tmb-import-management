import { type FriFormValues, friSchema, stepFields } from "./schema";

export const FRI_DRAFT_KEY = "tmb:fri:draft:v1";
const numericFields = new Set(["year", "quantity", "autonomy", "budget"]);
const enumFields = new Set([
  "documentType",
  "department",
  "fuel",
  "transmission",
  "payment",
  "alternatives",
  "hasSupplier",
  "incoterm",
]);

// Un borrador puede estar incompleto o tener errores: no exige un FRI válido.
export function readDraft(
  raw: string | null,
): { step: number; values: Partial<FriFormValues> } | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (
      ![1, 2].includes(draft?.version) ||
      !Number.isInteger(draft.step) ||
      draft.step < 0 ||
      draft.step >= (draft.version === 1 ? 5 : stepFields.length) ||
      !draft.values ||
      typeof draft.values !== "object" ||
      Array.isArray(draft.values)
    ) {
      return null;
    }
    const entries: [string, unknown][] = [];
    for (const name of stepFields.flat()) {
      const value: unknown = draft.values[name];
      const migratedValue = name === "transmission" && value === "Automática"
        ? "Automática convencional (AT)"
        : name === "transmission" && value === "Manual"
        ? "Manual o mecánica (MT)"
        : value;
      const valid = numericFields.has(name)
        ? typeof migratedValue === "number" && Number.isFinite(migratedValue)
        : name === "declaration"
        ? typeof migratedValue === "boolean"
        : enumFields.has(name)
        ? friSchema.shape[name].safeParse(migratedValue).success
        : typeof migratedValue === "string" && migratedValue.length <= 10000;
      if (valid) entries.push([name, migratedValue]);
    }
    const values = Object.fromEntries(entries) as Partial<FriFormValues>;
    if (values.documentType !== "Pasaporte") delete values.issuingCountry;
    if (
      values.documentType !== "RUC" ||
      !values.documentNumber?.startsWith("20")
    ) {
      delete values.representative;
    }
    if (values.fuel !== "Eléctrico") delete values.autonomy;
    return {
      step: draft.version === 1 ? Math.min(draft.step, 2) : draft.step,
      values,
    };
  } catch {
    return null;
  }
}

export function serializeDraft(values: Partial<FriFormValues>, step: number) {
  return JSON.stringify({ version: 2, step, values });
}
