import { z } from "zod";
import { departments } from "./options";
import { documentRules } from "./document-rules";
export const transmissions = [
  "Manual o mecánica (MT)",
  "Automática convencional (AT)",
  "Manual automatizada (AMT)",
  "Automática de doble embrague (DCT)",
  "Transmisión continuamente variable (CVT)",
  "Transmisión eléctrica (EV / e-Axle)",
  "Transmisión híbrida (e-CVT / DHT)",
] as const;
export const fuelGroups = ["EV", "Gas", "Gasolina"] as const;
export const vehicleTypes = ["Automóvil", "Camión"] as const;
export const fuelTypes = [
  "Híbrido enchufable",
  "Híbrido autorregenerativo",
  "EREV (alto kilometraje extendido)",
  "GNV",
  "GNL",
  "Diésel",
] as const;
export const fuelTypesByGroup = {
  EV: fuelTypes.slice(0, 3),
  Gas: fuelTypes.slice(3, 5),
  Gasolina: fuelTypes.slice(5, 6),
} as const;
const requiredText = (max = 200) =>
  z
    .string()
    .trim()
    .min(1, "Completa este campo")
    .max(max, `Máximo ${max} caracteres`);
const optionalText = (max = 200) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`);
export const validPurchaseDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const friSchema = z
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
    email: z.string().trim().max(254, "El correo es demasiado largo").refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Ingresa un correo válido",
    ),
    vehicleType: z.enum(["", ...vehicleTypes]),
    brand: requiredText(100),
    model: requiredText(100),
    version: optionalText(300),
    catalogVehicleId: z.union([z.uuid(), z.literal("")]).optional(),
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
    fuelGroup: z.enum(["", ...fuelGroups]),
    fuelType: z.enum(["", ...fuelTypes]),
    transmission: z.enum(transmissions),
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
      "Contado",
      "Financiado",
    ]).optional(),
    alternatives: z.enum(["Sí", "No"]).optional(),
    declaration: z
      .boolean()
      .refine((v) => v, "Acepta la declaración para continuar"),
  })
  .superRefine((data, ctx) => {
    const allowedFuelTypes = data.fuelGroup
      ? fuelTypesByGroup[data.fuelGroup as keyof typeof fuelTypesByGroup]
      : [];
    if (!data.vehicleType) {
      ctx.addIssue({ code: "custom", path: ["vehicleType"], message: "Selecciona un tipo de vehículo" });
    }
    if (!data.fuelGroup) {
      ctx.addIssue({ code: "custom", path: ["fuelGroup"], message: "Selecciona un grupo" });
    }
    if (!data.fuelType || !allowedFuelTypes.includes(data.fuelType as never)) {
      ctx.addIssue({ code: "custom", path: ["fuelType"], message: "Selecciona un tipo válido para el grupo" });
    }
    if (data.hasSupplier === "Sí") {
      for (
        const key of [
          "supplier",
          "incoterm",
          "purchaseDate",
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
export type FriFormValues = z.infer<typeof friSchema>;
export const defaults: Partial<FriFormValues> = {
  documentType: "DNI",
  documentNumber: "",
  issuingCountry: "",
  name: "",
  representative: "",
  company: "",
  position: "",
  mobile: "",
  email: "",
  vehicleType: "",
  brand: "",
  model: "",
  catalogVehicleId: "",
  version: "",
  color: "",
  quantity: 1,
  fuelGroup: "",
  fuelType: "",
  power: "",
  equipment: "",
  purchaseDate: "",
  supplier: "",
  incoterm: "",
  payment: "",
  declaration: false,
};
export const stepFields: (keyof FriFormValues)[][] = [
  [
    "documentType",
    "documentNumber",
    "issuingCountry",
    "name",
    "representative",
    "company",
    "position",
    "department",
    "mobile",
    "email",
  ],
  [
    "vehicleType",
    "brand",
    "model",
    "version",
    "year",
    "color",
    "quantity",
    "fuelGroup",
    "fuelType",
    "transmission",
    "power",
    "autonomy",
    "equipment",
  ],
  [
    "budget",
    "hasSupplier",
    "supplier",
    "incoterm",
    "purchaseDate",
    "alternatives",
  ],
  ["declaration"],
];
