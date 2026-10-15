"use client";
import { createContext, useContext, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
export const PanelSessionContext = createContext({ ready: false, error: "" });
export function PanelAccess({ children }: { children: ReactNode }) {
  const { ready, error } = useContext(PanelSessionContext);
  if (ready) return children;
  return (
    <section
      aria-label="Acceso al panel"
      className="rounded-xl border border-border bg-white p-8 text-center"
    >
      <p role={error ? "alert" : "status"} className="text-sm text-muted">
        {error || "Verificando tu sesión…"}
      </p>
      {error && (
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      )}
    </section>
  );
}
