import { describe, expect, it } from "vitest";
import { readDraft, serializeDraft } from "./draft";
describe("borradores del nuevo FRI", () => {
  it.each([2, 3, 4])(
    "recupera el borrador anterior en Condiciones (%s)",
    (step) => {
      const draft = readDraft(
        JSON.stringify({
          version: 1,
          step,
          values: {
            name: "Cliente",
            budget: 25000,
            email: "old@example.com",
            usage: "Personal",
            observations: "old",
          },
        }),
      );
      expect(draft?.step).toBe(2);
      expect(draft?.values).toEqual({ name: "Cliente", budget: 25000 });
    },
  );
  it("conserva el nuevo resumen y la decisión sin proveedor", () => {
    expect(readDraft(serializeDraft({ hasSupplier: "No", budget: 25000 }, 3)))
      .toEqual({ step: 3, values: { hasSupplier: "No", budget: 25000 } });
  });
});
