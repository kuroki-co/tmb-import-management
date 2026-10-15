import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PanelShell } from "./panel-shell";
import { PanelAccess, PanelSessionContext } from "./panel-access";
vi.mock("next/navigation", () => ({
  usePathname: () => "/panel/solicitudes",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/features/auth/api", () => ({
  currentSeller: vi.fn(() => new Promise(() => {})),
  logout: vi.fn(),
}));
describe("Árbol del panel durante autenticación", () => {
  it("conserva el segmento hijo durante SSR aunque la sesión siga pendiente", () => {
    const html = renderToStaticMarkup(
      <PanelShell>
        <div data-testid="route-segment">Segmento de ruta</div>
      </PanelShell>,
    );
    expect(html).toContain("route-segment");
  });
  it("no monta el contenido privado mientras verifica la sesión", () => {
    const privateContent = vi.fn(() => <p>Datos privados</p>);
    const PrivateContent = privateContent;
    render(
      <PanelAccess>
        <PrivateContent />
      </PanelAccess>,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Verificando tu sesión",
    );
    expect(privateContent).not.toHaveBeenCalled();
  });
  it("muestra el contenido solo después de validar la sesión", () => {
    render(
      <PanelSessionContext.Provider value={{ ready: true, error: "" }}>
        <PanelAccess>
          <p>Datos privados</p>
        </PanelAccess>
      </PanelSessionContext.Provider>,
    );
    expect(screen.getByText("Datos privados")).toBeTruthy();
  });
});
