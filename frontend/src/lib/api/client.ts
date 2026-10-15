import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";
export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const api = createClient<paths>({
  baseUrl: apiUrl,
  credentials: "include",
});
export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(". ");
  }
  return "No se pudo completar la operación. Inténtalo nuevamente.";
}
