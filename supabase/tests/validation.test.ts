import {
  inputSchema,
  recordDataSchema,
} from "../functions/_shared/validation.ts";
import { handler } from "../functions/fri-api/index.ts";
const valid = {
  documentType: "DNI",
  documentNumber: "01234567",
  name: "Cliente prueba",
  department: "Arequipa",
  mobile: "999123456",
  brand: "Toyota",
  model: "Corolla",
  year: 2026,
  quantity: 1,
  fuelGroup: "Gasolina",
  fuelType: "Diésel",
  transmission: "Automática convencional (AT)",
  budget: 25000,
  purchaseDate: "2026-12-01",
  payment: "Contado",
  alternatives: false,
  hasSupplier: true,
  supplier: "Proveedor prueba",
  incoterm: "FOB",
  declaration: true,
};
function assert(value: unknown, message: string) {
  if (!value) throw new Error(message);
}
Deno.test("validación autoritativa de documentos y campos condicionales", () => {
  assert(inputSchema.safeParse(valid).success, "valid DNI");
  assert(
    !inputSchema.safeParse({ ...valid, fuelGroup: "Gas", fuelType: "Diésel" }).success,
    "diesel cannot be selected in the Gas group",
  );
  assert(
    inputSchema.safeParse({ ...valid, fuelGroup: "Gas", fuelType: "GNV" }).success,
    "GNV belongs to Gas",
  );
  assert(
    inputSchema.safeParse({ ...valid, fuelGroup: "EV", fuelType: "EREV (alto kilometraje extendido)" }).success,
    "EREV belongs to EV",
  );
  for (const documentNumber of ["1234567", "123456789", "1234567A"]) {
    assert(
      !inputSchema.safeParse({ ...valid, documentNumber }).success,
      "invalid DNI",
    );
  }
  assert(
    inputSchema.safeParse({
      ...valid,
      documentType: "RUC",
      documentNumber: "20123456789",
    }).success,
    "RUC20",
  );
  assert(
    !inputSchema.safeParse({
      ...valid,
      documentType: "RUC",
      documentNumber: "30123456789",
    }).success,
    "invalid RUC",
  );
  assert(
    !inputSchema.safeParse({
      ...valid,
      documentType: "Pasaporte",
      documentNumber: "A12345",
    }).success,
    "missing country",
  );
  assert(
    inputSchema.safeParse({
      ...valid,
      documentType: "Pasaporte",
      documentNumber: "A12345",
      issuingCountry: "Chile",
    }).success,
    "passport",
  );
  const data = inputSchema.parse({
    ...valid,
    representative: "Ocultar",
    issuingCountry: "Ocultar",
    autonomy: 100,
  });
  assert(
    !("representative" in data) && !("autonomy" in data) &&
      !("issuingCountry" in data),
    "strip irrelevant fields",
  );
});
Deno.test("rechaza fechas inválidas, aprobación ausente, campos desconocidos y límites", () => {
  for (
    const changes of [
      { purchaseDate: "2026-02-31" },
      { declaration: false },
      { status: "Cotizado" },
      { quantity: 0 },
      { mobile: "123456789" },
      { equipment: "x".repeat(4001) },
    ]
  ) {
    assert(
      !inputSchema.safeParse({ ...valid, ...changes }).success,
      "invalid input",
    );
  }
});
Deno.test("métodos y orígenes no autorizados no llegan a la base de datos", async () => {
  assert(
    (await handler(new Request("http://example.invalid", { method: "GET" })))
      .status === 405,
    "method",
  );
  assert(
    (await handler(
      new Request("http://example.invalid", {
        method: "POST",
        headers: { origin: "https://other.invalid" },
      }),
    )).status === 403,
    "origin",
  );
  assert(
    (await handler(
      new Request("http://example.invalid", {
        method: "POST",
        body: "invalid json",
      }),
    )).status === 400,
    "json",
  );
  assert(
    (await handler(
      new Request("http://example.invalid", {
        method: "POST",
        body: "x".repeat(33000),
      }),
    )).status === 413,
    "size",
  );
});

Deno.test("sin proveedor acepta presupuesto y descarta los campos comerciales ocultos", () => {
  const { supplier, incoterm, purchaseDate, payment, alternatives, ...base } =
    valid;
  const result = inputSchema.parse({ ...base, hasSupplier: false });
  assert(
    result.hasSupplier === false && result.payment === "Contado",
    "minimal submission",
  );
  const stale = inputSchema.parse({ ...valid, hasSupplier: false });
  assert(
    !("supplier" in stale) && !("alternatives" in stale),
    "strip stale values",
  );
  assert(
    !inputSchema.safeParse({ ...base, hasSupplier: true }).success,
    "supplier requires details",
  );
  assert(
    !inputSchema.safeParse({
      ...base,
      hasSupplier: false,
      email: "test@example.com",
    }).success,
    "removed email",
  );
  for (
    const key of [
      "supplier",
      "incoterm",
      "purchaseDate",
      "payment",
      "alternatives",
    ]
  ) {
    const missing: Record<string, unknown> = { ...valid };
    delete missing[key];
    assert(!inputSchema.safeParse(missing).success, "missing " + key);
  }
  assert(
    recordDataSchema.safeParse({
      ...base,
      purchaseDate,
      payment,
      alternatives,
      usage: "Personal",
    }).success,
    "historical records remain readable",
  );
});
