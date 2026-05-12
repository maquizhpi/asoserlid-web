import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ASOSERLID - Servicios de Limpieza",
  description: "Limpieza profesional, desinfeccion y mantenimiento con personal certificado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}

