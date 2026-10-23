import { z } from "npm:zod@4.6.5";

const amount = z.number().finite().min(0).max(1_000_000_000);
const rate = z.number().finite().min(0).max(1);
export const localCostKeys = [
  "transportUsd",
  "insuranceUsd",
  "freightUsd",
  "fobExpensesUsd",
  "handlingUsd",
  "customsUsd",
  "gateInUsd",
  "storageUsd",
  "approvalUsd",
  "minimumCommissionUsd",
] as const;
const costShape = Object.fromEntries(localCostKeys.map((key) => [key, amount]));
const adjustmentCostShape = Object.fromEntries(
  localCostKeys.map((key) => [key, amount.optional()]),
);
export const quotationSettingsSchema = z.object({
  exchangeRate: z.number().finite().gt(0).max(100_000),
  insuranceRate: rate,
  advRate: rate,
  ipmRate: rate,
  importIgvRate: rate,
  dispatchTaxUsd: amount,
  perceptionRate: rate,
  localCosts: z.object(costShape),
  localIgvRate: rate,
}).strict();
export const quotationAdjustmentsSchema = z.object({
  exchangeRate: z.number().finite().gt(0).max(100_000).optional(),
  insuranceUsd: amount.optional(),
  advRate: rate.optional(),
  ipmRate: rate.optional(),
  importIgvRate: rate.optional(),
  dispatchTaxUsd: amount.optional(),
  perceptionRate: rate.optional(),
  localCosts: z.object(adjustmentCostShape).partial().optional(),
  localIgvRate: rate.optional(),
}).strict();
export const quotationInputSchema = z.object({
  fobUsd: amount,
  freightUsd: amount,
  adjustments: quotationAdjustmentsSchema.default({}),
}).strict();
export type QuotationSettings = z.infer<typeof quotationSettingsSchema>;
export type QuotationInput = z.infer<typeof quotationInputSchema>;

export const defaultQuotationSettings: QuotationSettings = {
  exchangeRate: 3.335,
  insuranceRate: 0.015,
  advRate: 0,
  ipmRate: 0.02,
  importIgvRate: 0.16,
  dispatchTaxUsd: 0,
  perceptionRate: 0.035,
  localCosts: {
    transportUsd: 0,
    insuranceUsd: 0,
    freightUsd: 0,
    fobExpensesUsd: 0,
    handlingUsd: 300,
    customsUsd: 300,
    gateInUsd: 280,
    storageUsd: 800,
    approvalUsd: 320,
    minimumCommissionUsd: 300,
  },
  localIgvRate: 0.18,
};

export function calculateQuotation(
  input: QuotationInput,
  base: QuotationSettings,
) {
  const adjustments = input.adjustments;
  const exchangeRate = adjustments.exchangeRate ?? base.exchangeRate;
  const insuranceUsd = adjustments.insuranceUsd ??
    (input.fobUsd + input.freightUsd) * base.insuranceRate;
  const cifUsd = input.fobUsd + input.freightUsd + insuranceUsd;
  const advUsd = cifUsd * (adjustments.advRate ?? base.advRate);
  const ipmUsd = cifUsd * (adjustments.ipmRate ?? base.ipmRate);
  const importIgvUsd = cifUsd * (adjustments.importIgvRate ?? base.importIgvRate);
  const dispatchTaxUsd = adjustments.dispatchTaxUsd ?? base.dispatchTaxUsd;
  const contentSubtotalUsd = advUsd + ipmUsd + importIgvUsd + dispatchTaxUsd;
  const perceptionUsd = (cifUsd + contentSubtotalUsd) *
    (adjustments.perceptionRate ?? base.perceptionRate);
  const customsDutiesPen = contentSubtotalUsd * exchangeRate;
  const perceptionPen = perceptionUsd * exchangeRate;
  const localCosts = Object.fromEntries(
    Object.entries(base.localCosts).map(([key, value]) => [
      key,
      adjustments.localCosts?.[key as keyof typeof adjustments.localCosts] ?? value,
    ]),
  ) as QuotationSettings["localCosts"];
  const charges = Object.values(localCosts).reduce((sum, value) => sum + value, 0);
  const localIgvUsd = charges * (adjustments.localIgvRate ?? base.localIgvRate);
  const localSubtotalUsd = charges + localIgvUsd;
  const totalUsd = cifUsd + contentSubtotalUsd + perceptionUsd + localSubtotalUsd;
  return {
    fobUsd: input.fobUsd,
    freightUsd: input.freightUsd,
    insuranceUsd,
    cifUsd,
    advUsd,
    ipmUsd,
    importIgvUsd,
    dispatchTaxUsd,
    contentSubtotalUsd,
    perceptionUsd,
    exchangeRate,
    customsDutiesPen,
    perceptionPen,
    localCosts,
    localIgvUsd,
    localSubtotalUsd,
    totalUsd,
  };
}
