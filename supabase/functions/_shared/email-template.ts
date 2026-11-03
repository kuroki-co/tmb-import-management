type TmbEmailInput = {
  preheader: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  reference?: { label: string; value: string };
  attachments?: string[];
  notice?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function renderTmbEmail(input: TmbEmailInput) {
  const preheader = escapeHtml(input.preheader);
  const eyebrow = escapeHtml(input.eyebrow);
  const title = escapeHtml(input.title);
  const greeting = input.greeting ? escapeHtml(input.greeting) : "";
  const paragraphs = input.paragraphs.map((paragraph) =>
    `<p style="margin:0 0 16px;color:#40566a;font-size:15px;line-height:1.65">${escapeHtml(paragraph)}</p>`
  ).join("");
  const reference = input.reference
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid #d9e4eb;border-radius:10px;background:#f5f8fa"><tr><td style="padding:16px 18px"><div style="color:#607487;font-size:12px;line-height:1.4">${escapeHtml(input.reference.label)}</div><div style="margin-top:5px;color:#12385b;font-size:20px;font-weight:700;letter-spacing:.4px">${escapeHtml(input.reference.value)}</div></td></tr></table>`
    : "";
  const attachmentRows = (input.attachments ?? []).map((attachment) =>
    `<tr><td style="padding:10px 12px;border-top:1px solid #e5edf1;color:#40566a;font-size:14px">${escapeHtml(attachment)}</td><td align="right" style="padding:10px 12px;border-top:1px solid #e5edf1;color:#167c80;font-size:12px;font-weight:700">PDF adjunto</td></tr>`
  ).join("");
  const attachments = attachmentRows
    ? `<div style="margin:24px 0 8px;color:#12385b;font-size:13px;font-weight:700">Documentos incluidos</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5edf1;border-radius:9px;border-collapse:separate;border-spacing:0;overflow:hidden">${attachmentRows}</table>`
    : "";
  const notice = input.notice
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;background:#f5f8fa;border-left:3px solid #168b88"><tr><td style="padding:13px 15px;color:#526879;font-size:13px;line-height:1.6">${escapeHtml(input.notice)}</td></tr></table>`
    : "";
  const text = [
    input.title,
    greeting,
    ...input.paragraphs,
    input.reference ? `${input.reference.label}: ${input.reference.value}` : "",
    input.attachments?.length ? `Documentos incluidos: ${input.attachments.join(", ")}.` : "",
    input.notice ?? "",
    "TMB Importaciones E.I.R.L.",
    "Global Mobility & Industrial Solutions",
  ].filter(Boolean).join("\n\n");

  return {
    text,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;background:#f1f5f7;font-family:Arial,Helvetica,sans-serif;color:#12385b"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f7"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border:1px solid #dce6ec;border-radius:14px;background:#ffffff;overflow:hidden"><tr><td style="height:5px;background:#12385b;font-size:0;line-height:0"><span style="display:inline-block;width:18%;height:5px;background:#28a65a"></span><span style="display:inline-block;width:12%;height:5px;background:#168b88"></span></td></tr><tr><td style="padding:24px 30px 20px;border-bottom:1px solid #e7eef2"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><div style="color:#12385b;font-size:24px;font-weight:800;letter-spacing:-1px">TMB</div><div style="margin-top:2px;color:#12385b;font-size:10px;font-weight:700;letter-spacing:.8px">IMPORTACIONES E.I.R.L.</div></td><td align="right" style="color:#6b7f8f;font-size:11px">Global Mobility<br>&amp; Industrial Solutions</td></tr></table></td></tr><tr><td style="padding:30px 30px 32px"><div style="margin-bottom:10px;color:#168b88;font-size:11px;font-weight:700;letter-spacing:1.2px">${eyebrow}</div><h1 style="margin:0 0 22px;color:#12385b;font-size:25px;line-height:1.25">${title}</h1>${greeting ? `<p style="margin:0 0 14px;color:#40566a;font-size:15px;line-height:1.65">${greeting}</p>` : ""}${paragraphs}${reference}${attachments}${notice}</td></tr><tr><td style="padding:18px 30px;border-top:1px solid #e7eef2;background:#f8fafb"><p style="margin:0;color:#12385b;font-size:13px;font-weight:700">TMB Importaciones E.I.R.L.</p><p style="margin:5px 0 0;color:#718394;font-size:11px;line-height:1.5">Este correo fue enviado automáticamente respecto a una solicitud registrada en el sistema TMB.</p></td></tr></table></td></tr></table></body></html>`,
  };
}
