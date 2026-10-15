import PDFDocument from "npm:pdfkit@0.20.2";
import { Buffer } from "node:buffer";
import { fonts } from "./fonts.ts";

import type { Fri as FriDto } from "./validation.ts";

type Field = [string, string | number | undefined];
const declaration =
  "Declaro que la información proporcionada es veraz y solicito a TMB Importaciones e Inversiones Generales E.I.R.L. iniciar la investigación comercial, búsqueda y negociación internacional del vehículo descrito. Esta ficha no constituye una orden de compra y servirá de base para la posterior Carta de Autorización y el Contrato de Agencia Internacional de Compras (AIC).";

export class PdfService {
  async generate(fri: FriDto): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    for (const [name, value] of Object.entries(fonts)) {
      doc.registerFont(name, Buffer.from(value, "base64"));
    }
    const result = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    const d = fri.data;
    const navy = "#203864";
    const left = 36;
    const width = doc.page.width - left * 2;
    const bottom = doc.page.height - 36;
    let y = 28;
    const ensure = (height: number) => {
      if (y + height > bottom) {
        doc.addPage();
        y = 36;
      }
    };
    const section = (title: string, barWidth = width, minimumY = 0) => {
      if (doc.bufferedPageRange().count === 1) y = Math.max(y, minimumY);
      ensure(45);
      doc.rect(left, y, barWidth, 23).fill(navy);
      let titleSize = 10;
      doc.font("Helvetica-Bold").fontSize(titleSize);
      while (doc.widthOfString(title) > barWidth - 14) {
        doc.fontSize(titleSize -= 0.25);
      }
      doc
        .fillColor("white")
        .text(title, left + 7, y + 7, { width: barWidth - 14 });
      y += 31;
    };
    const row = (fields: Field[], blank = false) => {
      const gap = 0;
      const cell = (width - gap * (fields.length - 1)) / fields.length;
      const values = fields.map(([, value]) =>
        value === undefined || value === ""
          ? (blank ? " " : "-")
          : String(value)
      );
      doc.font("Helvetica-Bold").fontSize(8).fillColor(navy);
      const labelHeight = Math.max(
        ...fields.map(([label]) =>
          doc.heightOfString(`${label}:`, { width: cell - 6 })
        ),
      );
      doc.font("Helvetica").fontSize(9);
      const valueHeight = Math.max(
        ...values.map((value) =>
          doc.heightOfString(value, { width: cell - 6 })
        ),
      );
      const height = Math.max(34, labelHeight + valueHeight + 12);
      // Very long notes flow across pages instead of being clipped in a grid cell.
      if (height > bottom - 36) {
        for (const [label, value] of fields) {
          ensure(45);
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(navy)
            .text(label, left, y, { width });
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#252525")
            .text(
              value === undefined || value === ""
                ? (blank ? " " : "-")
                : String(value),
              left,
              doc.y + 5,
              { width, lineGap: 2 },
            );
          y = doc.y + 12;
        }
        return;
      }
      ensure(height);
      fields.forEach(([label], index) => {
        const x = left + index * (cell + gap);
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(navy)
          .text(`${label}:`, x + 3, y, { width: cell - 6 });
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#252525")
          .text(values[index], x + 3, y + labelHeight + 4, { width: cell - 6 });
        doc
          .moveTo(x, y + height - 5)
          .lineTo(x + cell, y + height - 5)
          .lineWidth(0.5)
          .strokeColor("#888888")
          .stroke();
      });
      y += height;
    };
    doc
      .font("Helvetica-Bold")
      .fontSize(12.5)
      .fillColor(navy)
      .text("FICHA DE REQUERIMIENTO DE IMPORTACIÓN (FRI)", left, y, {
        width,
        align: "center",
      });
    y = doc.y + 5;
    doc
      .fontSize(8)
      .fillColor("#555555")
      .text("TMB IMPORTACIONES E INVERSIONES GENERALES E.I.R.L.", left, y, {
        width,
        align: "center",
      });
    y = doc.y + 8;
    doc
      .moveTo(left, y)
      .lineTo(left + width, y)
      .lineWidth(1)
      .strokeColor(navy)
      .stroke();
    y += 6;
    section("1. DATOS DEL CLIENTE", width * 0.4);
    row([
      ["Nombre o razón social", d.name],
      ["Documento", `${d.documentType} ${d.documentNumber}`],
    ]);
    if (d.documentType === "Pasaporte") {
      row([["País emisor", d.issuingCountry]]);
    }
    row([
      ...(d.documentType === "RUC" && d.documentNumber.startsWith("20")
        ? [["Representante legal", d.representative] as Field]
        : []),
      ["Empresa", d.company],
      ["Cargo", d.position],
    ]);
    row([["Ciudad / País", `${d.department} / Perú`]]);
    row([
      ["Celular", d.mobile],
    ]);
    y += 6;
    section("2. VEHÍCULO SOLICITADO", width * 0.25, 254);
    row([
      ["Marca", d.brand],
      ["Modelo", d.model],
      ["Versión", d.version],
      ["Año", d.year],
      ["Color", d.color],
    ]);
    row([
      ["Cantidad", d.quantity],
      ["Combustible", d.fuel],
      ["Transmisión", d.transmission],
      ["Potencia", d.power],
      ["Autonomía (EV, km)", d.fuel === "Eléctrico" ? d.autonomy : "No aplica"],
    ]);
    row([["Equipamiento requerido", d.equipment]]);
    y += 6;
    section("3. CONDICIONES COMERCIALES", width * 0.35, 450);
    row([
      [
        "Presupuesto estimado (USD)",
        d.budget.toLocaleString("es-PE", { minimumFractionDigits: 2 }),
      ],
      ["Puerto de destino", "Callao, Perú"],
    ]);
    const hasSupplier = d.hasSupplier === true;
    const commercial = hasSupplier || d.hasSupplier === undefined;
    row([
      [
        "Proveedor de preferencia",
        d.hasSupplier === false ? "No tiene" : d.supplier,
      ],
      ["Incoterm (FOB/FCA/CIF/CFR/EXW)", commercial ? d.incoterm : ""],
    ]);
    const date = commercial
      ? d.purchaseDate?.split("-").reverse().join("/")
      : "";
    row([
      ["Fecha estimada de compra", date],
      ["Forma de pago", commercial ? d.payment : ""],
      [
        "¿Acepta alternativas equivalentes?",
        !commercial || d.alternatives === undefined
          ? ""
          : d.alternatives
          ? "Sí (X)   No ( )"
          : "Sí ( )   No (X)",
      ],
    ]);
    y += 6;
    section("4. INFORMACIÓN PARA LA INVESTIGACIÓN", width * 0.4, 599);
    row([
      ["Uso del vehículo", ""],
      ["País de origen preferido", ""],
    ], true);
    row([["Observaciones", ""]], true);
    y += 6;
    section("5. COMPROMISO DEL SOLICITANTE", width, 704);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(navy)
      .text(`Código de solicitud:  ${fri.code}`, left + 6, y + 2, {
        width: width - 12,
      });
    // The reference places the declaration and signature area on a second sheet.
    doc.addPage();
    y = 54;
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#555555");
    const declarationHeight = doc.heightOfString(declaration, {
      width,
      lineGap: 3,
    });
    ensure(declarationHeight + 32);
    doc.text(declaration, left, y + 3, { width, lineGap: 3 });
    y = doc.y + 10;
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Declaración ${
          d.declaration ? "aceptada" : "no aceptada"
        } en el formulario digital.`,
        left,
        y,
        { width },
      );
    y = doc.y + 70;
    ensure(40);
    const signatureWidth = (width - 35) / 2;
    [left].forEach((x) =>
      doc
        .moveTo(x, y)
        .lineTo(x + width, y)
        .strokeColor("#888888")
        .lineWidth(0.5)
        .stroke()
    );
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(navy)
      .text("CLIENTE (Firma)", left, y + 7, {
        width: signatureWidth,
        align: "center",
      });
    doc.text(
      "TMB IMPORTACIONES E INVERSIONES GENERALES\nAGENTE INTERNACIONAL DE COMPRAS",
      left + signatureWidth + 35,
      y + 7,
      { width: signatureWidth, align: "center" },
    );
    const pages = doc.bufferedPageRange();
    for (let page = 0; page < pages.count; page++) {
      doc.switchToPage(page);
      // Footer sits outside the body margin; prevent PDFKit adding a blank page.
      const bodyMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#777777")
        .text(
          `${fri.code}  |  ${page + 1} / ${pages.count}`,
          left,
          doc.page.height - 30,
          { width, align: "right", lineBreak: false },
        );
      doc.page.margins.bottom = bodyMargin;
    }
    doc.end();
    return result;
  }
}
