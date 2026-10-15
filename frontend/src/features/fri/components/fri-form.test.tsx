import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriForm } from "./fri-form";
import { FRI_DRAFT_KEY, serializeDraft } from "../draft";
import { defaults, type FriFormValues } from "../schema";
import { getReceiptToken } from "../receipt-storage";
const { push, submitFri } = vi.hoisted(() => ({
  push: vi.fn(),
  submitFri: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api", () => ({ submitFri }));
const fixture: FriFormValues = {
  ...defaults,
  documentType: "DNI",
  documentNumber: "01234567",
  name: "Cliente prueba",
  issuingCountry: "",
  representative: "",
  company: "",
  position: "",
  department: "Arequipa",
  mobile: "999123456",
  email: "",
  brand: "Toyota",
  model: "Corolla",
  version: "",
  year: 2026,
  color: "",
  quantity: 1,
  fuel: "Gasolina",
  transmission: "Automática",
  power: "",
  equipment: "",
  budget: 25000,
  purchaseDate: "2026-12-01",
  payment: "Transferencia bancaria",
  alternatives: "No",
  usage: "Personal",
  originCountry: "",
  supplier: "",
  observations: "",
  declaration: true,
};
function seed(values: Partial<FriFormValues>, step = 0) {
  localStorage.setItem(FRI_DRAFT_KEY, serializeDraft(values, step));
}
async function open(
  values?: Partial<FriFormValues>,
  step = 0,
  preview = false,
) {
  if (values) seed(values, step);
  const view = render(<FriForm preview={preview} />);
  await screen.findByRole("button", {
    name: preview || step < 4 ? "Continuar" : "Enviar solicitud",
  });
  return { ...view, user: userEvent.setup() };
}
beforeEach(() => {
  push.mockReset();
  submitFri.mockReset();
});
describe("Flujo público FRI", () => {
  it.each([false, true])(
    "completa los cinco pasos desde cero (preview=%s)",
    async (preview) => {
      submitFri.mockResolvedValue({
        id: "complete-id",
        receiptToken: "complete-token",
      });
      const { user } = await open(undefined, 0, preview);
      await user.type(screen.getByLabelText(/Número de documento/), "01234567");
      await user.type(
        screen.getByLabelText(/Nombres y apellidos/),
        "Cliente prueba",
      );
      await user.selectOptions(
        screen.getByLabelText(/Departamento/),
        "Arequipa",
      );
      await user.type(screen.getByLabelText(/Celular/), "999123456");
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      await screen.findByRole("heading", {
        name: "¿Qué vehículo deseas importar?",
      });
      await user.type(screen.getByLabelText(/^Marca/), "Toyota");
      await user.type(screen.getByLabelText(/^Modelo/), "Corolla");
      await user.type(screen.getByLabelText(/^Año/), "2026");
      await user.selectOptions(
        screen.getByLabelText(/Tipo de combustible/),
        "Gasolina",
      );
      await user.selectOptions(
        screen.getByLabelText(/Transmisión/),
        "Automática",
      );
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      await screen.findByRole("heading", { name: "Condiciones comerciales" });
      await user.type(screen.getByLabelText(/Presupuesto estimado/), "25000");
      await user.type(
        screen.getByLabelText(/Fecha estimada de compra/),
        "2026-12-01",
      );
      await user.selectOptions(
        screen.getByLabelText(/Forma de pago/),
        "Transferencia bancaria",
      );
      await user.click(screen.getByRole("radio", { name: "No" }));
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      await screen.findByRole("heading", {
        name: "Información para la investigación",
      });
      await user.selectOptions(
        screen.getByLabelText(/Uso del vehículo/),
        "Personal",
      );
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      await screen.findByRole("heading", {
        name: "Revisa y confirma tu solicitud",
      });
      await user.click(screen.getByRole("checkbox"));
      await user.click(
        screen.getByRole("button", {
          name: preview ? "Probar confirmación" : "Enviar solicitud",
        }),
      );
      if (preview) {
        await screen.findByText(
          "Formulario validado correctamente. Esta vista previa no guarda solicitudes.",
        );
        expect(submitFri).not.toHaveBeenCalled();
        expect(localStorage.getItem(FRI_DRAFT_KEY)).toBeNull();
      } else {
        await waitFor(() =>
          expect(push).toHaveBeenCalledWith("/fri/exito/complete-id"),
        );
        expect(submitFri).toHaveBeenCalledTimes(1);
        expect(submitFri.mock.calls[0][0].documentNumber).toBe("01234567");
      }
    },
  );
  it("no ofrece retroceso en Cliente y preserva los datos al volver desde Vehículo", async () => {
    const { user } = await open(fixture);
    expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", {
      name: "¿Qué vehículo deseas importar?",
    });
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(
      (screen.getByLabelText(/Número de documento/) as HTMLInputElement).value,
    ).toBe("01234567");
  });
  it("impide avanzar con DNI incompleto y enfoca el campo con error", async () => {
    const { user } = await open({ ...fixture, documentNumber: "123" });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("El DNI debe tener 8 dígitos");
    expect(document.activeElement).toBe(
      screen.getByLabelText(/Número de documento/),
    );
    expect(
      screen.queryByRole("heading", { name: "¿Qué vehículo deseas importar?" }),
    ).toBeNull();
  });
  it("cambia los campos de persona a empresa y limpia el documento al cambiar tipo", async () => {
    const { user } = await open(fixture);
    await user.selectOptions(screen.getByLabelText(/Tipo de documento/), "RUC");
    const input = screen.getByLabelText(
      /Número de documento/,
    ) as HTMLInputElement;
    expect(input.value).toBe("");
    await user.type(input, "20123456789");
    expect(screen.getByLabelText(/Razón social/)).toBeTruthy();
    expect(screen.getByLabelText(/Representante legal/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(/Tipo de documento/), "DNI");
    expect(screen.queryByLabelText(/Representante legal/)).toBeNull();
    expect(screen.getByLabelText(/Nombres y apellidos/)).toBeTruthy();
  });
  it("recupera el paso y los datos después de desmontar y volver a abrir", async () => {
    const { user, unmount } = await open(fixture, 1);
    await user.clear(screen.getByLabelText(/Modelo/));
    await user.type(screen.getByLabelText(/Modelo/), "Hilux");
    unmount();
    await open();
    await screen.findByRole("heading", {
      name: "¿Qué vehículo deseas importar?",
    });
    expect((screen.getByLabelText(/Modelo/) as HTMLInputElement).value).toBe(
      "Hilux",
    );
  });
  it("permite cancelar el reinicio sin borrar datos y exige confirmar para borrarlos", async () => {
    const { user } = await open(fixture);
    await user.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    await user.click(
      screen.getByRole("button", { name: "Seguir completando" }),
    );
    expect(
      (screen.getByLabelText(/Número de documento/) as HTMLInputElement).value,
    ).toBe("01234567");
    await user.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    await user.click(screen.getByRole("button", { name: "Borrar y empezar" }));
    expect(
      (screen.getByLabelText(/Número de documento/) as HTMLInputElement).value,
    ).toBe("");
    expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
  });
  it("edita desde el resumen y Enter vuelve a confirmar sin enviar la solicitud", async () => {
    const { user } = await open(fixture, 4);
    await user.click(
      screen.getByRole("button", { name: "Editar datos del cliente" }),
    );
    await user.clear(screen.getByLabelText(/Nombres y apellidos/));
    await user.type(
      screen.getByLabelText(/Nombres y apellidos/),
      "Cliente actualizado{Enter}",
    );
    await screen.findByRole("heading", {
      name: "Revisa y confirma tu solicitud",
    });
    expect(screen.getByText("Cliente actualizado")).toBeTruthy();
    expect(submitFri).not.toHaveBeenCalled();
  });
  it("no permite enviar sin aceptar la declaración", async () => {
    const { user } = await open({ ...fixture, declaration: false }, 4);
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await screen.findByText("Acepta la declaración para continuar");
    expect(submitFri).not.toHaveBeenCalled();
  });
  it("un campo EV oculto deja de bloquear el avance al cambiar a gasolina", async () => {
    const { user } = await open(
      { ...fixture, fuel: "Eléctrico", autonomy: -1 },
      1,
    );
    await user.selectOptions(
      screen.getByLabelText(/Tipo de combustible/),
      "Gasolina",
    );
    expect(screen.queryByLabelText(/Autonomía EV/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Condiciones comerciales" });
  });
  it("bloquea la edición y el segundo envío mientras el primero está pendiente", async () => {
    let finish!: (value: { id: string; receiptToken: string }) => void;
    submitFri.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { user } = await open(fixture, 4);
    await user.dblClick(
      screen.getByRole("button", { name: "Enviar solicitud" }),
    );
    expect(submitFri).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("checkbox") as HTMLInputElement).disabled ||
        screen.getByRole("checkbox").closest("fieldset")?.disabled,
    ).toBe(true);
    finish({ id: "once-id", receiptToken: "once-token" });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/fri/exito/once-id"),
    );
  });
  it("conserva el borrador si falla el envío y permite reintentar", async () => {
    submitFri
      .mockRejectedValueOnce(new Error("Servidor no disponible"))
      .mockResolvedValueOnce({ id: "retry-id", receiptToken: "retry-token" });
    const { user } = await open(fixture, 4);
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await screen.findByText("Servidor no disponible");
    expect(localStorage.getItem(FRI_DRAFT_KEY)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/fri/exito/retry-id"),
    );
    expect(localStorage.getItem(FRI_DRAFT_KEY)).toBeNull();
  });
  it("un bloqueo del almacenamiento del recibo no convierte un envío exitoso en error", async () => {
    submitFri.mockResolvedValue({
      id: "blocked-storage-id",
      receiptToken: "token",
    });
    const { user } = await open(fixture, 4);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key.startsWith("fri-receipt-")) throw new Error("Bloqueado");
      original.call(this, key, value);
    });
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/fri/exito/blocked-storage-id"),
    );
    expect(getReceiptToken("blocked-storage-id")).toBe("token");
    expect(submitFri).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByRole("button", {
          name: "Solicitud registrada",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("el preview no lee el borrador público ni registra una solicitud", async () => {
    seed(fixture, 4);
    const saved = localStorage.getItem(FRI_DRAFT_KEY);
    const { user } = await open(undefined, 0, true);
    expect(
      (screen.getByLabelText(/Número de documento/) as HTMLInputElement).value,
    ).toBe("");
    await user.type(screen.getByLabelText(/Número de documento/), "01234567");
    expect(localStorage.getItem(FRI_DRAFT_KEY)).toBe(saved);
    expect(submitFri).not.toHaveBeenCalled();
  });
});
