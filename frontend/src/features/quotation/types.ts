import { z } from "zod";

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

export const localCostLabels: Record<(typeof localCostKeys)[number], string> = {
  transportUsd: "Transporte",
  insuranceUsd: "Seguro local",
  freightUsd: "Flete local",
  fobExpensesUsd: "Gastos FOB",
  handlingUsd: "Handling",
  customsUsd: "Aduanas",
  gateInUsd: "Gate in",
  storageUsd: "Almacén",
  approvalUsd: "V°B°",
  minimumCommissionUsd: "Comisión mínima",
};

export const quotationSettingsSchema = z.object({
  exchangeRate: z.number().finite().gt(0).max(100_000),
  insuranceRate: rate,
  advRate: rate,
  ipmRate: rate,
  importIgvRate: rate,
  dispatchTaxUsd: amount,
  perceptionRate: rate,
  localCosts: z.object(
    Object.fromEntries(localCostKeys.map((key) => [key, amount])) as Record<
      (typeof localCostKeys)[number],
      typeof amount
    >,
  ),
  localIgvRate: rate,
});
export type QuotationSettings = z.infer<typeof quotationSettingsSchema>;

export const quotationAdjustmentsSchema = z.object({
  exchangeRate: z.number().finite().gt(0).max(100_000).optional(),
  insuranceUsd: amount.optional(),
  advRate: rate.optional(),
  ipmRate: rate.optional(),
  importIgvRate: rate.optional(),
  dispatchTaxUsd: amount.optional(),
  perceptionRate: rate.optional(),
  localCosts: z.object(
    Object.fromEntries(localCostKeys.map((key) => [key, amount.optional()])) as Record<
      (typeof localCostKeys)[number],
      z.ZodOptional<typeof amount>
    >,
  ).partial().optional(),
  localIgvRate: rate.optional(),
}).strict();
export type QuotationAdjustments = z.infer<typeof quotationAdjustmentsSchema>;

export const quotationInputSchema = z.object({
  fobUsd: amount,
  freightUsd: amount,
  adjustments: quotationAdjustmentsSchema.default({}),
}).strict();
export type QuotationInput = z.infer<typeof quotationInputSchema>;

export type QuotationCalculation = {
  fobUsd: number;
  freightUsd: number;
  insuranceUsd: number;
  cifUsd: number;
  advUsd: number;
  ipmUsd: number;
  importIgvUsd: number;
  dispatchTaxUsd: number;
  contentSubtotalUsd: number;
  perceptionUsd: number;
  exchangeRate: number;
  customsDutiesPen: number;
  perceptionPen: number;
  localCosts: Record<(typeof localCostKeys)[number], number>;
  localIgvUsd: number;
  localSubtotalUsd: number;
  totalUsd: number;
};
