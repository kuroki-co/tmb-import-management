import { z } from "zod";
import { friSchema } from "./schema";
const fields = friSchema.shape;
export const friDataSchema = z.object({
  ...fields,
  // Requests created before this field was added remain readable.
  vehicleType: fields.vehicleType.optional(),
  // Older records stored only `fuel`; new records retain group and subtype too.
  fuelGroup: fields.fuelGroup.optional(),
  fuelType: fields.fuelType.optional(),
  fuel: z.string().optional(),
  alternatives: z.boolean().optional(),
  hasSupplier: z.boolean().optional(),
  // Old submissions may contain the two transmission labels used by the earlier form.
  transmission: z.enum([
    ...friSchema.shape.transmission.options,
    "Automática",
    "Manual",
  ]).transform((value) => value === "Automática"
    ? "Automática convencional (AT)"
    : value === "Manual"
    ? "Manual o mecánica (MT)"
    : value),
  email: z.string().optional(),
  usage: z.string().optional(),
  originCountry: z.string().optional(),
  observations: z.string().optional(),
  purchaseDate: fields.purchaseDate.optional(),
  // Historial: solicitudes previas pueden conservar formas de pago antiguas.
  payment: z.string().optional(),
  issuingCountry: fields.issuingCountry.optional(),
  representative: fields.representative.optional(),
  company: fields.company.optional(),
  position: fields.position.optional(),
  version: fields.version.optional(),
  color: fields.color.optional(),
  power: fields.power.optional(),
  equipment: fields.equipment.optional(),
  supplier: fields.supplier.optional(),
  catalogReference: z.object({
    id: z.uuid(),
    sourceType: z.enum(["supplier_excel", "tmb_web"]),
    price: z.number().nonnegative().nullable(),
    currency: z.string().max(3),
    priceLabel: z.string().max(100).nullable(),
    sourceUrl: z.url().nullable(),
    updatedAt: z.string(),
  }).optional(),
});
export const friRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  code: z.string(),
  status: z.enum([
    "Pendiente a revisar",
    "En revisión",
    "Cotizado",
    "Confirmado a compra",
  ]),
  data: friDataSchema,
});
export const receiptSchema = z.object({
  id: z.string(),
  receiptToken: z.string(),
  emailStatus: z.enum(["sent", "failed", "not_provided", "not_configured"]),
});
export type Fri = z.infer<typeof friRecordSchema>;
