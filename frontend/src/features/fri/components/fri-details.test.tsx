import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FriDetails } from "./fri-details";
import type { Fri } from "../api";
const { GET, POST } = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  api: { GET, POST },
  errorMessage: () => "Error",
}));
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
    transmission: "Automática",
    budget: 25000,
    purchaseDate: "2026-12-01",
    payment: "Transferencia bancaria",
    alternatives: false,
    usage: "Personal",
    declaration: true,
  },
};
beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
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
});
