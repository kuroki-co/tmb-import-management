import { friSchema, stepFields, type FriFormValues } from "./schema";

export const FRI_DRAFT_KEY = "tmb:fri:draft:v1";
const numericFields = new Set(["year", "quantity", "autonomy", "budget"]);
const enumFields = new Set([
  "documentType",
  "department",
  "fuel",
  "transmission",
  "payment",
  "alternatives",
  "usage",
]);

// Un borrador puede estar incompleto o tener errores: no exige un FRI válido.
export function readDraft(
  raw: string | null,
): { step: number; values: Partial<FriFormValues> } | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (
      draft?.version !== 1 ||
      !Number.isInteger(draft.step) ||
      draft.step < 0 ||
      draft.step >= stepFields.length ||
      !draft.values ||
      typeof draft.values !== "object" ||
      Array.isArray(draft.values)
    )
      return null;
    const entries: [string, unknown][] = [];
    for (const name of stepFields.flat()) {
      const value: unknown = draft.values[name];
      const valid = numericFields.has(name)
        ? typeof value === "number" && Number.isFinite(value)
        : name === "declaration"
          ? typeof value === "boolean"
          : enumFields.has(name)
            ? friSchema.shape[name].safeParse(value).success
            : typeof value === "string" && value.length <= 10000;
      if (valid) entries.push([name, value]);
    }
    const values = Object.fromEntries(entries) as Partial<FriFormValues>;
    if (values.documentType !== "Pasaporte") delete values.issuingCountry;
    if (
      values.documentType !== "RUC" ||
      !values.documentNumber?.startsWith("20")
    )
      delete values.representative;
    if (values.fuel !== "Eléctrico") delete values.autonomy;
    return { step: draft.step, values };
  } catch {
    return null;
  }
}

export function serializeDraft(values: Partial<FriFormValues>, step: number) {
  return JSON.stringify({ version: 1, step, values });
}
