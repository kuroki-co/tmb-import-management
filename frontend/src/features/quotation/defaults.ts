import type { QuotationSettings } from "./types";

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
