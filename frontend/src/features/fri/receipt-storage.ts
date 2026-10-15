// Respaldo en memoria para no confundir un bloqueo de almacenamiento con un fallo de envío.
const receipts = new Map<string, string>();
export function rememberReceipt(id: string, token: string) {
  receipts.set(id, token);
  try {
    sessionStorage.setItem(`fri-receipt-${id}`, token);
  } catch {
    /* Disponible mientras siga abierta la aplicación. */
  }
}
export function getReceiptToken(id: string) {
  try {
    return (
      sessionStorage.getItem(`fri-receipt-${id}`) || receipts.get(id) || null
    );
  } catch {
    return receipts.get(id) || null;
  }
}
