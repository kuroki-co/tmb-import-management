import { z } from "zod";
import { friSchema } from "./schema";
const fields = friSchema.shape;
export const friDataSchema = z.object({
  ...fields,
  alternatives: z.boolean(),
  issuingCountry: fields.issuingCountry.optional(),
  representative: fields.representative.optional(),
  company: fields.company.optional(),
  position: fields.position.optional(),
  email: fields.email.optional(),
  version: fields.version.optional(),
  color: fields.color.optional(),
  power: fields.power.optional(),
  equipment: fields.equipment.optional(),
  originCountry: fields.originCountry.optional(),
  supplier: fields.supplier.optional(),
  observations: fields.observations.optional(),
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
});
export type Fri = z.infer<typeof friRecordSchema>;
