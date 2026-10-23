import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogVehiclePicker } from "./catalog-vehicle-picker";
import type { CatalogVehicle } from "../api";

const { searchCatalog, getCatalogVehicle } = vi.hoisted(() => ({
  searchCatalog: vi.fn(),
  getCatalogVehicle: vi.fn(),
}));

vi.mock("../api", () => ({ searchCatalog, getCatalogVehicle }));

const vehicle: CatalogVehicle = {
  id: "7bcaf98d-7e73-48e6-9b7b-cc25ef0fd23b",
  source: "supplier_excel",
  brand: "Toyota",
  model: "Corolla Cross",
  variant: "2.0L Hybrid Elite",
  year: 2026,
  vehicleType: "SUV",
  fuel: "Híbrido",
  transmission: "CVT",
  engine: "2.0L",
  driveType: null,
  color: null,
  price: 16370,
  currency: "USD",
  priceLabel: "FOB (USD)",
  imageUrl: null,
  sourceUrl: null,
  sourceReference: "xiaomi proveedora.xlsx",
  updatedAt: "2026-10-23T10:00:00.000Z",
  lastSeenAt: undefined,
  isActive: true,
  isPublished: true,
};

describe("selector de vehículos con búsqueda", () => {
  beforeEach(() => {
    searchCatalog.mockReset();
    getCatalogVehicle.mockReset();
    searchCatalog.mockResolvedValue([vehicle]);
  });

  it("filtra por marca o modelo y completa al elegir un resultado con teclado", async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <CatalogVehiclePicker onSelect={onSelect} onClear={onClear} />,
    );

    const input = screen.getByRole("combobox", { name: /Marca o modelo/ });
    await user.type(input, "corolla");
    await screen.findByRole("option");
    await user.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(vehicle));
    view.rerender(
      <CatalogVehiclePicker
        value={vehicle.id}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    expect((input as HTMLInputElement).value).toBe("Toyota Corolla Cross · 2026");
    expect(screen.getByText(/FOB \(USD\): USD 16,370/)).toBeTruthy();
    expect(onClear).not.toHaveBeenCalled();
  });
});
