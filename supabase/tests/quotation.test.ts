import {
  calculateQuotation,
  defaultQuotationSettings,
  quotationInputSchema,
} from "../functions/_shared/quotation.ts";

Deno.test("la cotización reproduce los resultados calculados en el Excel", () => {
  const input = quotationInputSchema.parse({
    fobUsd: 50_000,
    freightUsd: 9_230,
    adjustments: {},
  });
  const result = calculateQuotation(input, defaultQuotationSettings);
  if (Math.abs(result.insuranceUsd - 888.45) > 0.000001) throw new Error("insurance");
  if (Math.abs(result.cifUsd - 60_118.45) > 0.000001) throw new Error("CIF");
  if (Math.abs(result.contentSubtotalUsd - 10_821.321) > 0.000001) throw new Error("content subtotal");
  if (Math.abs(result.perceptionUsd - 2_482.891985) > 0.000001) throw new Error("perception");
  if (Math.abs(result.localSubtotalUsd - 2_714) > 0.000001) throw new Error("local subtotal");
  if (Math.abs(result.totalUsd - 76_136.662985) > 0.000001) throw new Error("total");
});

Deno.test("una excepción de cotización no muta los parámetros base", () => {
  const before = structuredClone(defaultQuotationSettings);
  const input = quotationInputSchema.parse({
    fobUsd: 10_000,
    freightUsd: 1_000,
    adjustments: { exchangeRate: 3.5, localCosts: { handlingUsd: 500 } },
  });
  const result = calculateQuotation(input, defaultQuotationSettings);
  if (result.exchangeRate !== 3.5 || result.localCosts.handlingUsd !== 500) {
    throw new Error("quotation override was not applied");
  }
  if (JSON.stringify(defaultQuotationSettings) !== JSON.stringify(before)) {
    throw new Error("base settings were mutated");
  }
});
