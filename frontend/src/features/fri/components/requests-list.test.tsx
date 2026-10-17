import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestsList } from "./requests-list";
const { listFri } = vi.hoisted(() => ({ listFri: vi.fn() }));
vi.mock("../api", () => ({ listFri }));
describe("Bandeja de solicitudes", () => {
  it("conserva la última carga si falla la actualización", async () => {
    listFri.mockReset();
    listFri
      .mockResolvedValueOnce([
        {
          id: "saved",
          code: "TMB-000010",
          createdAt: "2026-10-13T10:00:00Z",
          status: "En revisión",
          data: {
            name: "Cliente guardado",
            documentType: "DNI",
            documentNumber: "12345678",
            brand: "Toyota",
            model: "Corolla",
            year: 2026,
            quantity: 1,
            budget: 10000,
          },
        },
      ])
      .mockRejectedValueOnce(new Error("Sin conexión"));
    const user = userEvent.setup();
    render(<RequestsList />);
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await screen.findByRole("alert");
    expect(
      within(screen.getByRole("table")).getByText("Cliente guardado"),
    ).toBeTruthy();
    expect(
      screen.getByText(/Conservamos los datos de la última carga/),
    ).toBeTruthy();
  });
  it("busca por código y filtra por estado sin modificar solicitudes", async () => {
    listFri.mockReset();
    listFri.mockResolvedValue([
      {
        id: "one",
        code: "TMB-000001",
        createdAt: "2026-10-13T10:00:00Z",
        status: "Pendiente a revisar",
        data: {
          name: "Ángel Pérez",
          documentType: "DNI",
          documentNumber: "01234567",
          brand: "Toyota",
          model: "Corolla",
          year: 2026,
          quantity: 1,
          budget: 10000,
        },
      },
      {
        id: "two",
        code: "TMB-000002",
        createdAt: "2026-10-12T10:00:00Z",
        status: "En revisión",
        data: {
          name: "María López",
          documentType: "DNI",
          documentNumber: "12345678",
          brand: "Kia",
          model: "Sportage",
          year: 2026,
          quantity: 1,
          budget: 30000,
        },
      },
    ]);
    const user = userEvent.setup();
    render(<RequestsList />);
    await screen.findByRole("table");
    const table = within(screen.getByRole("table"));
    await user.type(
      screen.getByRole("textbox", { name: "Buscar solicitudes" }),
      "tmb-000002",
    );
    expect(table.queryByText("Ángel Pérez")).toBeNull();
    expect(table.getByText("María López")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await user.click(
      screen.getByRole("button", { name: "Filtrar: Pendiente a revisar" }),
    );
    expect(table.getByText("Ángel Pérez")).toBeTruthy();
    expect(table.queryByText("María López")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await user.type(
      screen.getByRole("textbox", { name: "Buscar solicitudes" }),
      "angel",
    );
    expect(table.getByText("Ángel Pérez")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Ordenar solicitudes" }),
      "budget",
    );
    expect(table.getAllByRole("row")[1].textContent).toContain("María López");
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(listFri).toHaveBeenCalledTimes(2));
  });
});
