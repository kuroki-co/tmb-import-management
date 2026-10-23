import { describe, expect, it } from "vitest";
import { friRecordSchema } from "./contracts";

describe("historial FRI", () => {
  it.each([
    ["Automática", "Transferencia bancaria"],
    ["Manual", "Tarjeta de crédito"],
  ])("lee solicitudes antiguas con transmisión %s", (transmission, payment) => {
    const result = friRecordSchema.safeParse({
      id: "request-1",
      createdAt: "2026-10-13T15:00:00Z",
      code: "TMB-000001",
      status: "Pendiente a revisar",
      data: {
        documentType: "DNI",
        documentNumber: "01234567",
        name: "Cliente de prueba",
        department: "Arequipa",
        mobile: "999123456",
        brand: "Toyota",
        model: "Corolla",
        year: 2026,
        quantity: 1,
        fuel: "Gasolina",
        transmission,
        budget: 25000,
        purchaseDate: "2026-12-01",
        payment,
        alternatives: false,
        usage: "Personal",
        declaration: true,
      },
    });

    expect(result.success).toBe(true);
  });
});
