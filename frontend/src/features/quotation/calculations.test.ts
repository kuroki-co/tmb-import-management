import { describe, expect, it } from "vitest";
import { calculateQuotation } from "./calculations";
import { defaultQuotationSettings } from "./defaults";

describe("cálculos de cotización", () => {
  it("reproduce el ejemplo de importación marítima del Excel", () => {
    const result = calculateQuotation({ fobUsd: 50_000, freightUsd: 9_230, adjustments: {} }, defaultQuotationSettings);
    expect(result.insuranceUsd).toBeCloseTo(888.45, 8);
    expect(result.cifUsd).toBeCloseTo(60_118.45, 8);
    expect(result.ipmUsd).toBeCloseTo(1_202.369, 8);
    expect(result.importIgvUsd).toBeCloseTo(9_618.952, 8);
    expect(result.contentSubtotalUsd).toBeCloseTo(10_821.321, 8);
    expect(result.perceptionUsd).toBeCloseTo(2_482.891985, 8);
    expect(result.customsDutiesPen).toBeCloseTo(36_089.105535, 8);
    expect(result.perceptionPen).toBeCloseTo(8_280.444769975, 8);
    expect(result.localIgvUsd).toBeCloseTo(414, 8);
    expect(result.localSubtotalUsd).toBeCloseTo(2_714, 8);
    expect(result.totalUsd).toBeCloseTo(76_136.662985, 8);
  });

  it("aplica excepciones solo al cálculo de esta cotización", () => {
    const baseCopy = structuredClone(defaultQuotationSettings);
    const result = calculateQuotation({
      fobUsd: 10_000,
      freightUsd: 1_000,
      adjustments: { exchangeRate: 3.5, localCosts: { handlingUsd: 500 } },
    }, defaultQuotationSettings);
    expect(result.exchangeRate).toBe(3.5);
    expect(result.localCosts.handlingUsd).toBe(500);
    expect(defaultQuotationSettings).toEqual(baseCopy);
  });
});
