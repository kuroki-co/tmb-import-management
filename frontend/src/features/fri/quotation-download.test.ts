import { beforeEach, expect, it, vi } from "vitest";
import { downloadQuotation } from "./api";
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({ auth: { getSession } }),
}));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BACKEND_PROVIDER", "supabase");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("%PDF-1.7", {
    headers: { "Content-Type": "application/pdf" },
  })));
  getSession.mockReset();
});
it("descarga la proforma del vendedor con su sesión, sin token de cliente", async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: "seller-token" } }, error: null });
  const pdf = await downloadQuotation("request-id");
  expect(pdf).toBeInstanceOf(Blob);
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
    headers: expect.objectContaining({ Authorization: "Bearer seller-token" }),
    body: JSON.stringify({ action: "quotation-pdf", id: "request-id" }),
  }));
});
it("conserva la descarga por comprobante sin exigir una sesión", async () => {
  await downloadQuotation("request-id", "receipt-token");
  expect(getSession).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
    body: JSON.stringify({ action: "quotation-pdf", id: "request-id", token: "receipt-token" }),
  }));
});
it("no intenta descargar una proforma del vendedor sin sesión", async () => {
  getSession.mockResolvedValue({ data: { session: null }, error: null });
  await expect(downloadQuotation("request-id")).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
