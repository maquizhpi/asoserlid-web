import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ASOSERLID - Limpieza y Desinfección",
  description: "ASOSERLID ofrece servicios profesionales de limpieza y desinfección con normas de calidad ISO/IEC 17024.",
  icons: {
    icon: [
      { url: "/logo2.png", type: "image/png" },
    ],
    shortcut: "/logo2.png",
    apple: "/logo2.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
