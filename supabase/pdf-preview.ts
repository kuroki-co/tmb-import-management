import { PdfService } from "./functions/_shared/pdf.ts";
import {
  inputSchema,
  recordDataSchema,
} from "./functions/_shared/validation.ts";
const base = {
  documentType: "DNI",
  documentNumber: "01234567",
  name: "Cliente de prueba",
  department: "Arequipa",
  mobile: "999123456",
  brand: "Toyota",
  model: "Corolla Cross",
  year: 2026,
  quantity: 1,
  fuel: "Gasolina",
  transmission: "Automática convencional (AT)",
  budget: 25000,
  declaration: true,
};
await Deno.mkdir("tmp/pdfs", { recursive: true });
for (const hasSupplier of [false, true]) {
  const data = recordDataSchema.parse(inputSchema.parse({
    ...base,
    hasSupplier,
    ...(hasSupplier
      ? {
        supplier: "Proveedor de prueba",
        incoterm: "FOB",
        purchaseDate: "2026-12-01",
        payment: "Contado",
        alternatives: false,
      }
      : {}),
  }));
  const bytes = await new PdfService().generate({
    id: crypto.randomUUID(),
    code: "TMB-000001",
    status: "Pendiente a revisar",
    createdAt: new Date().toISOString(),
    data,
  });
  await Deno.writeFile(
    `tmp/pdfs/fri-${hasSupplier ? "con" : "sin"}-proveedor.pdf`,
    bytes,
  );
  console.log(
    "PDF generado",
    hasSupplier ? "con proveedor" : "sin proveedor",
    bytes.length,
  );
}
