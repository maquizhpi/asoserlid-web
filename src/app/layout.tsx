import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SIT - Sistema Integrado de Trabajo",
  description: "Sistema Integrado de Trabajo para gestion operativa, administrativa y reportes.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
