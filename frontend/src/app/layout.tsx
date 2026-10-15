import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TMB · Gestión de importaciones",
  description: "Solicitudes de requerimiento de importación de TMB",
  referrer: "no-referrer",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
