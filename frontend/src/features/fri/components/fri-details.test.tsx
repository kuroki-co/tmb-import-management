import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FriDetails } from "./fri-details";
import type { Fri } from "../api";
const { GET, POST, quotationStatus, quotationDownload } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  quotationStatus: vi.fn(),
  quotationDownload: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({
  api: { GET, POST },
  errorMessage: () => "Error",
}));
vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    quotationReceiptStatus: quotationStatus,
    downloadQuotation: quotationDownload,
  };
});
const fixture: Fri = {
  id: "test-id",
  createdAt: "2026-10-13T15:00:00Z",
  status: "En revisión",
  code: "TMB-000001",
  data: {
    documentType: "DNI",
    documentNumber: "01234567",
    name: "Cliente prueba",
    department: "Arequipa",
    mobile: "999123456",
    brand: "Toyota",
    model: "Corolla",
    year: 2026,
    quantity: 1,
    fuel: "Gasolina",
    transmission: "Automática convencional (AT)",
    budget: 25000,
    purchaseDate: "2026-12-01",
    payment: "Contado",
    alternatives: false,
    usage: "Personal",
    declaration: true,
  },
};
beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  quotationStatus.mockReset();
  quotationDownload.mockReset();
  quotationStatus.mockResolvedValue({ available: false, updatedAt: null });
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL() {
        return "blob:test";
      }
      static revokeObjectURL() {}
    },
  );
  GET.mockImplementation(async (path) =>
    path.endsWith("/pdf")
      ? { data: new Blob(["PDF"]), response: { ok: true } }
      : { data: { ...fixture, status: "Pendiente a revisar" } },
  );
});
describe("Acción automática al abrir detalle", () => {
  it("inicia revisión al abrir el detalle del vendedor y muestra el estado devuelto", async () => {
    POST.mockResolvedValue({ data: fixture });
    render(<FriDetails id="test-id" />);
    await screen.findByText("En revisión");
    expect(POST).toHaveBeenCalledWith("/fri/{id}/review", {
      params: { path: { id: "test-id" } },
    });
    await waitFor(() =>
      expect(GET).toHaveBeenCalledWith("/fri/{id}/pdf", expect.anything()),
    );
  });
  it("el comprobante del cliente no inicia revisión", async () => {
    sessionStorage.setItem("fri-receipt-test-id", "token");
    render(<FriDetails id="test-id" receipt />);
    await screen.findByText("¡Solicitud enviada correctamente!");
    expect(POST).not.toHaveBeenCalled();
    expect(GET).toHaveBeenCalledWith("/fri/receipt/{id}", {
      params: { path: { id: "test-id" }, query: { token: "token" } },
    });
  });
  it("una solicitud cotizada sigue mostrando Cotizado al abrirla", async () => {
    POST.mockResolvedValue({ data: { ...fixture, status: "Cotizado" } });
    render(<FriDetails id="test-id" />);
    await screen.findByText("Cotizado");
    expect(screen.queryByText("En revisión")).toBeNull();
  });
  it("permite descargar la proforma cuando la cotización está lista", async () => {
    sessionStorage.setItem("fri-receipt-test-id", "token");
    quotationStatus.mockResolvedValue({
      available: true,
      updatedAt: "2026-10-23T15:00:00.000Z",
    });
    render(<FriDetails id="test-id" receipt />);
    await screen.findByRole("button", { name: "Descargar cotización" });
    expect(quotationStatus).toHaveBeenCalledWith("test-id", "token");
    expect(screen.getByText("La cotización está lista para descargar.")).toBeTruthy();
  });
  it("permite volver a consultar si aún no hay cotización", async () => {
    sessionStorage.setItem("fri-receipt-test-id", "token");
    render(<FriDetails id="test-id" receipt />);
    await screen.findByText("La cotización todavía no está disponible.");
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(quotationStatus).toHaveBeenCalledTimes(2));
  });
});
