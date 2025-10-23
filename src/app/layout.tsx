import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ASOSERLID – Servicios de Limpieza",
  description:
    "Limpieza profesional, desinfección y mantenimiento con personal certificado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Navbar />
        {children}
        <footer className="py-6 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} ASOSERLID
        </footer>
      </body>
    </html>
  );
}
