import { z } from "zod";
import { callFriFunction } from "@/lib/supabase/functions";
import {
  quotationInputSchema,
  quotationSettingsSchema,
  type QuotationCalculation,
  type QuotationInput,
  type QuotationSettings,
} from "./types";

const calculationSchema: z.ZodType<QuotationCalculation> = z.object({
  fobUsd: z.number(),
  freightUsd: z.number(),
  insuranceUsd: z.number(),
  cifUsd: z.number(),
  advUsd: z.number(),
  ipmUsd: z.number(),
  importIgvUsd: z.number(),
  dispatchTaxUsd: z.number(),
  contentSubtotalUsd: z.number(),
  perceptionUsd: z.number(),
  exchangeRate: z.number(),
  customsDutiesPen: z.number(),
  perceptionPen: z.number(),
  localCosts: z.record(z.string(), z.number()),
  localIgvUsd: z.number(),
  localSubtotalUsd: z.number(),
  totalUsd: z.number(),
});
const quotationSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  input: quotationInputSchema,
  settings: quotationSettingsSchema,
  calculation: calculationSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Quotation = z.infer<typeof quotationSchema>;

export async function loadQuotationSettings() {
  return quotationSettingsSchema.parse(
    await callFriFunction({ action: "quotation-settings-get" }, true),
  );
}

export async function saveQuotationSettings(values: QuotationSettings) {
  const valid = quotationSettingsSchema.parse(values);
  return quotationSettingsSchema.parse(
    await callFriFunction({ action: "quotation-settings-update", values: valid }, true),
  );
}

export async function loadQuotation(requestId: string) {
  const result = await callFriFunction({ action: "quotation-get", id: requestId }, true);
  return result === null ? null : quotationSchema.parse(result);
}

export async function saveQuotation(requestId: string, input: QuotationInput) {
  const valid = quotationInputSchema.parse(input);
  return quotationSchema.parse(
    await callFriFunction({ action: "quotation-save", id: requestId, input: valid }, true),
  );
}

export async function sendQuotationEmail(requestId: string) {
  return z.object({
    success: z.literal(true),
    recipient: z.string().email(),
  }).parse(await callFriFunction({ action: "quotation-send", id: requestId }, true));
}
