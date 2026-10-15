import { z } from "npm:zod@4.6.5";
import { departments } from "./options.ts";
import { documentRules } from "./document-rules.ts";
const requiredText = (max = 200) =>
  z
    .string()
    .trim()
    .min(1, "Completa este campo")
    .max(max, `Máximo ${max} caracteres`);
const optionalText = (max = 200) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).default("");
export const validPurchaseDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const formSchema = z
  .object({
    documentType: z.enum(["DNI", "RUC", "CE", "Pasaporte"]),
    documentNumber: requiredText(30),
    issuingCountry: optionalText(80),
    name: requiredText().min(2, "Indica el nombre completo"),
    representative: optionalText(),
    company: optionalText(),
    position: optionalText(100),
    department: z.enum(departments),
    mobile: z
      .string()
      .regex(/^9\d{8}$/, "Ingresa un celular peruano de 9 dígitos"),
    brand: requiredText(100),
    model: requiredText(100),
    version: optionalText(100),
    year: z
      .number("Indica el año")
      .int("El año debe ser un número entero")
      .min(1900, "El año mínimo es 1900")
      .max(2100, "El año máximo es 2100"),
    color: optionalText(80),
    quantity: z
      .number("Indica la cantidad")
      .int("Indica una cantidad entera")
      .min(1, "La cantidad mínima es 1")
      .max(10000, "La cantidad máxima es 10 000"),
    fuel: z.enum(["Gasolina", "Diésel", "Eléctrico", "No aplica"]),
    transmission: z.enum(["Automática", "Manual"]),
    power: optionalText(80),
    autonomy: z
      .number("Indica una distancia válida")
      .min(0, "La autonomía no puede ser negativa")
      .max(10000, "La autonomía máxima es 10 000 km")
      .optional(),
    equipment: optionalText(4000),
    budget: z
      .number("Indica el presupuesto")
      .min(1, "Debe ser mayor que cero")
      .max(1000000000, "El presupuesto máximo es USD 1 000 000 000"),
    hasSupplier: z.enum(["Sí", "No"]),
    supplier: optionalText(),
    incoterm: z.enum(["", "FOB", "FCA", "CIF", "CFR", "EXW"]).optional(),
    purchaseDate: optionalText(10),
    payment: z.enum([
      "",
      "Transferencia bancaria",
      "Tarjeta de crédito",
      "Carta de crédito",
    ]).optional(),
    alternatives: z.enum(["Sí", "No"]).optional(),
    declaration: z
      .boolean()
      .refine((v) => v, "Acepta la declaración para continuar"),
  })
  .superRefine((data, ctx) => {
    if (data.hasSupplier === "Sí") {
      for (
        const key of [
          "supplier",
          "incoterm",
          "purchaseDate",
          "payment",
          "alternatives",
        ] as const
      ) {
        if (!data[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Completa este campo",
          });
        }
      }
      if (data.purchaseDate && !validPurchaseDate(data.purchaseDate)) {
        ctx.addIssue({
          code: "custom",
          path: ["purchaseDate"],
          message: "Indica una fecha válida",
        });
      }
    }
    const add = (path: "documentNumber" | "issuingCountry", message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    const rule = documentRules[data.documentType];
    if (!rule.pattern.test(data.documentNumber)) {
      add("documentNumber", rule.message);
    }
    if (data.documentType === "Pasaporte") {
      if (!data.issuingCountry) add("issuingCountry", "Indica el país emisor");
    }
  });

const fields = formSchema.shape;
export const recordDataSchema = z.object({
  ...fields,
  hasSupplier: z.boolean().optional(),
  alternatives: z.boolean().optional(),
  email: z.string().optional(),
  usage: z.string().optional(),
  originCountry: z.string().optional(),
  observations: z.string().optional(),
});
export const inputSchema = z.object({
  ...fields,
  hasSupplier: z.boolean(),
  alternatives: z.boolean().optional(),
  declaration: z.literal(true),
}).strict().superRefine((data, ctx) => {
  const form = formSchema.safeParse({
    ...data,
    hasSupplier: data.hasSupplier ? "Sí" : "No",
    alternatives: data.alternatives === undefined
      ? undefined
      : data.alternatives
      ? "Sí"
      : "No",
  });
  if (!form.success) {
    for (const issue of form.error.issues) {
      ctx.addIssue({
        code: "custom",
        path: issue.path,
        message: issue.message,
      });
    }
  }
}).transform((data) => {
  const {
    representative,
    issuingCountry,
    autonomy,
    supplier,
    incoterm,
    purchaseDate,
    payment,
    alternatives,
    ...rest
  } = data;
  return {
    ...rest,
    ...(data.hasSupplier
      ? { supplier, incoterm, purchaseDate, payment, alternatives }
      : {}),
    ...(data.documentType === "RUC" && data.documentNumber.startsWith("20")
      ? { representative }
      : {}),
    ...(data.documentType === "Pasaporte" ? { issuingCountry } : {}),
    ...(data.fuel === "Eléctrico" ? { autonomy } : {}),
  };
});
export type FriData = z.output<typeof recordDataSchema>;
export type Fri = {
  id: string;
  createdAt: string;
  status: string;
  code: string;
  data: FriData;
};
