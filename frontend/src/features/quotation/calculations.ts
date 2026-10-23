import type {
  QuotationCalculation,
  QuotationInput,
  QuotationSettings,
} from "./types";

export function calculateQuotation(
  input: QuotationInput,
  base: QuotationSettings,
): QuotationCalculation {
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
  ) as QuotationCalculation["localCosts"];
  const localCostsSubtotal = Object.values(localCosts).reduce(
    (sum, value) => sum + value,
    0,
  );
  const localIgvUsd = localCostsSubtotal *
    (adjustments.localIgvRate ?? base.localIgvRate);
  const localSubtotalUsd = localCostsSubtotal + localIgvUsd;
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
