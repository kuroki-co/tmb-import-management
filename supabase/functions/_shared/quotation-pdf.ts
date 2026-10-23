import PDFDocument from "npm:pdfkit@0.20.2";
import { Buffer } from "node:buffer";
import { fonts } from "./fonts.ts";
import type { Fri } from "./validation.ts";
import { localCostKeys } from "./quotation.ts";

const localCostLabels: Record<(typeof localCostKeys)[number], string> = {
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

type SavedQuotation = {
  input: unknown;
  settings: unknown;
  calculation: {
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
    localCosts: Record<string, number>;
    localIgvUsd: number;
    localSubtotalUsd: number;
    totalUsd: number;
  };
  updatedAt: string;
};

const money = (amount: number) => amount.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const date = (value: string) => new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
}).format(new Date(value));

export class QuotationPdfService {
  async generate(fri: Fri, quotation: SavedQuotation): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 34, bottom: 38, left: 34, right: 34 },
      bufferPages: true,
    });
    for (const [name, value] of Object.entries(fonts)) {
      doc.registerFont(name, Buffer.from(value, "base64"));
    }
    const chunks: Buffer[] = [];
    const result = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    const navy = "#203864";
    const green = "#29A64A";
    const ink = "#202936";
    const muted = "#596579";
    const left = 34;
    const width = doc.page.width - left * 2;
    const bottom = doc.page.height - 34;
    let y = 28;
    const c = quotation.calculation;
    const d = fri.data;
    const input = quotation.input as {
      adjustments?: { perceptionRate?: number };
    };
    const settings = quotation.settings as { perceptionRate?: number };
    const perceptionRate = input.adjustments?.perceptionRate ??
      settings.perceptionRate ?? 0.035;
    const clientId = d.documentType === "RUC"
      ? `RUC ${d.documentNumber}`
      : `${d.documentType} ${d.documentNumber}`;

    const ensure = (height: number) => {
      if (y + height > bottom) {
        doc.addPage();
        y = 36;
      }
    };
    const section = (title: string) => {
      ensure(31);
      doc.rect(left, y, width, 21).fill(navy);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("white")
        .text(title.toUpperCase(), left + 8, y + 5, { width: width - 16 });
      y += 25;
    };
    const metaCell = (label: string, value: string, x: number, w: number) => {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(navy)
        .text(label, x, y, { width: w });
      doc.font("Helvetica").fontSize(9).fillColor(ink)
        .text(value || "—", x + 102, y, { width: w - 106 });
      doc.moveTo(x, y + 15).lineTo(x + w, y + 15).lineWidth(0.45)
        .strokeColor("#C4CCD7").stroke();
    };
    const value = (amount: number) => `$ ${money(amount)}`;
    const exchangeRate = c.exchangeRate.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });

    // Header follows the reference proforma: navy rule, company title, then two-column metadata.
    doc.rect(left, y, width, 8).fill(navy);
    doc.rect(left + 14, y + 8, 88, 3).fill(green);
    doc.rect(left + 98, y + 8, 58, 3).fill("#2098C8");
    y += 16;
    doc.font("Helvetica-Bold").fontSize(14).fillColor(navy)
      .text("TMB IMPORTACIONES E.I.R.L.", left, y, {
        width,
        align: "right",
      });
    y += 19;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink)
      .text("PROFORMA / COTIZACIÓN COMERCIAL", left, y, {
        width,
        align: "right",
      });
    y += 24;

    const half = (width - 18) / 2;
    const gap = 18;
    const leftFields: Array<[string, string]> = [
      ["N° proforma", fri.code],
      ["Cliente", d.name],
      ["Contacto", d.representative || d.name],
      ["Destino", "Perú / Callao"],
      ["Producto", `${d.brand} ${d.model}${d.version ? ` ${d.version}` : ""}`],
    ];
    const rightFields: Array<[string, string]> = [
      ["Fecha", date(quotation.updatedAt)],
      ["RUC / ID", clientId],
      ["Vigencia", "15 días calendario"],
      ["Moneda", "USD"],
      ["Cantidad", String(d.quantity)],
    ];
    for (let i = 0; i < leftFields.length; i++) {
      metaCell(leftFields[i][0], leftFields[i][1], left, half);
      metaCell(rightFields[i][0], rightFields[i][1], left + half + gap, half);
      y += 16;
    }
    y += 3;

    section("Descripción de la cotización");
    const tableX = left;
    const col = [width * 0.39, width * 0.21, width * 0.17, width * 0.23];
    const headerHeight = 19;
    doc.rect(tableX, y, width, headerHeight).fill(navy);
    const headers = ["DESCRIPCIÓN", "PRECIO (USD)", "IGV (USD)", "TOTAL (USD)"];
    let x = tableX;
    headers.forEach((label, index) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("white")
        .text(label, x + 5, y + 7, {
          width: col[index] - 10,
          align: index ? "right" : "left",
          lineBreak: false,
        });
      x += col[index];
    });
    y += headerHeight;

    const tableRow = (
      label: string,
      amount: number,
      igv = 0,
      options: { bold?: boolean; total?: boolean; subtotal?: boolean } = {},
    ) => {
      const height = 14;
      ensure(height);
      if (options.total) doc.rect(tableX, y, width, height).fill("#FFF1A8");
      else if (options.subtotal) doc.rect(tableX, y, width, height).fill("#EEF2F7");
      const total = amount + igv;
      const color = options.bold || options.total ? navy : ink;
      const font = options.bold || options.total ? "Helvetica-Bold" : "Helvetica";
      doc.font(font).fontSize(8.4).fillColor(color)
        .text(label, tableX + 5, y + 4, { width: col[0] - 10, lineBreak: false });
      const vals = [value(amount), igv ? value(igv) : "—", value(total)];
      let cellX = tableX + col[0];
      vals.forEach((text, index) => {
        doc.font(font).fontSize(8.4).fillColor(color)
          .text(text, cellX + 5, y + 4, {
            width: col[index + 1] - 10,
            align: "right",
            lineBreak: false,
          });
        cellX += col[index + 1];
      });
      if (!options.total && !options.subtotal) {
        doc.moveTo(tableX, y + height).lineTo(tableX + width, y + height)
          .lineWidth(0.35).strokeColor("#D7DDE5").stroke();
      }
      y += height;
    };
    const category = (label: string) => {
      ensure(12);
      doc.rect(tableX, y, width, 12).fill("#E8EDF4");
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(navy)
        .text(label.toUpperCase(), tableX + 3, y + 3, { width: width - 6 });
      y += 12;
    };

    category("Importación");
    tableRow("FOB", c.fobUsd);
    tableRow("Flete internacional", c.freightUsd);
    tableRow("Seguro internacional", c.insuranceUsd);
    tableRow("Subtotal importación (CIF)", c.cifUsd, 0, { subtotal: true });
    category("Tributos de importación");
    tableRow("ADV", c.advUsd);
    tableRow("IPM", c.ipmUsd);
    tableRow("IGV de importación", 0, c.importIgvUsd);
    tableRow("Tasa de despacho", c.dispatchTaxUsd);
    tableRow(
      `Percepción ${(perceptionRate * 100).toLocaleString("es-PE", { maximumFractionDigits: 2 })}%`,
      c.perceptionUsd,
    );
    category("Gastos locales");
    for (const key of localCostKeys) {
      const amount = c.localCosts[key] || 0;
      if (amount > 0) tableRow(localCostLabels[key], amount);
    }
    tableRow("IGV de gastos locales", 0, c.localIgvUsd);
    tableRow("TOTAL ESTIMADO", c.totalUsd, 0, { total: true });
    y += 9;
    doc.font("Helvetica").fontSize(7.5).fillColor(muted)
      .text(
        `Referencias calculadas en soles: derechos/tributos S/ ${money(c.customsDutiesPen)} · percepción S/ ${money(c.perceptionPen)} · T/C S/ ${exchangeRate} por USD. CIF es un subtotal de FOB, flete y seguro; no se suma nuevamente al total.`,
        left,
        y,
        { width, lineGap: 1 },
      );
    y = doc.y + 10;

    section("Condiciones comerciales");
    const conditions = [
      "Los precios están expresados en dólares americanos (USD).",
      "La oferta está sujeta a disponibilidad y confirmación final del proveedor.",
      `Forma de pago: ${d.payment || "según negociación comercial"}.`,
      `Incoterm: ${d.incoterm || "según negociación comercial"}.`,
      "Los impuestos y gastos son referenciales y pueden variar según la operación.",
      "La proforma tiene una vigencia de 15 días calendario desde su emisión.",
      "No incluye transporte local ni descarga, salvo que aparezcan como concepto cotizado.",
    ];
    for (let i = 0; i < conditions.length; i++) {
      ensure(13);
      doc.font("Helvetica").fontSize(7.2).fillColor(ink)
        .text(`${i + 1}. ${conditions[i]}`, left + 4, y, {
          width: width - 8,
          lineGap: 1,
        });
      y = doc.y + 0.5;
    }
    y += 5;

    section("Datos de TMB");
    const companyRows: Array<[string, string]> = [
      ["Razón social", "TMB IMPORTACIONES E INVERSIONES GENERALES E.I.R.L."],
      ["RUC", "20608463985"],
      ["Dirección", "Av. Lima 519 Vallecito, Cercado"],
      ["Teléfono", "978143660"],
      ["Correo", "importaciones@tmbimport.com"],
      ["Banco", "INTERBANK"],
      ["Cuenta USD", "300-3006531908"],
      ["Cuenta CCI USD", "033-300-003006531908-16"],
      ["Código SWIFT", "BINPPEPL"],
    ];
    const companyColWidth = (width - 16) / 2;
    const [legalNameLabel, legalName] = companyRows[0];
    ensure(14);
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor(navy)
      .text(legalNameLabel, left + 2, y, { width: 82, lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(ink)
      .text(legalName, left + 84, y, {
        width: width - 86,
        align: "right",
        lineBreak: false,
      });
    doc.moveTo(left, y + 11).lineTo(left + width, y + 11)
      .lineWidth(0.35).strokeColor("#D7DDE5").stroke();
    y += 13;
    for (let i = 1; i < companyRows.length; i += 2) {
      ensure(14);
      for (let cell = 0; cell < 2; cell++) {
        const item = companyRows[i + cell];
        if (!item) continue;
        const x = left + cell * (companyColWidth + 16);
        const [label, text] = item;
        doc.font("Helvetica-Bold").fontSize(7.2).fillColor(navy)
          .text(label, x + 2, y, { width: 74, lineBreak: false });
        doc.font("Helvetica").fontSize(7.2).fillColor(ink)
          .text(text, x + 76, y, {
            width: companyColWidth - 78,
            align: "right",
            lineBreak: false,
          });
      }
      doc.moveTo(left, y + 11).lineTo(left + width, y + 11)
        .lineWidth(0.35).strokeColor("#D7DDE5").stroke();
      y += 13;
    }

    const pages = doc.bufferedPageRange();
    for (let page = 0; page < pages.count; page++) {
      doc.switchToPage(page);
      const bodyMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font("Helvetica").fontSize(7).fillColor(muted)
        .text(`${fri.code}  |  ${page + 1} / ${pages.count}`, left, doc.page.height - 28, {
          width,
          align: "right",
          lineBreak: false,
        });
      doc.page.margins.bottom = bodyMargin;
    }
    doc.end();
    return result;
  }
}
