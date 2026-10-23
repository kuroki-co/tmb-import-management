import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TablePagination } from "./table-pagination";

describe("TablePagination", () => {
  it("shows the current range and moves forward and backward", () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <TablePagination
        label="solicitudes FRI"
        page={1}
        pageSize={10}
        totalItems={23}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole("navigation").textContent).toContain(
      "Mostrando 1–10 de 23",
    );
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <TablePagination
        label="solicitudes FRI"
        page={3}
        pageSize={10}
        totalItems={23}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByRole("navigation").textContent).toContain(
      "Mostrando 21–23 de 23",
    );
    fireEvent.click(screen.getByRole("button", { name: /Anterior/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(
      (screen.getByRole("button", { name: /Siguiente/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("hides pagination when the rows fit on one page", () => {
    const { container } = render(
      <TablePagination
        label="vehículos"
        page={1}
        pageSize={20}
        totalItems={20}
        onPageChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
