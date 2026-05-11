import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ASOSERLID - Servicios de Limpieza",
  description:
    "Limpieza profesional, desinfección y mantenimiento con personal certificado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Navbar />
        {children}
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p>
              © {new Date().getFullYear()} ASOSERLID. Servicios profesionales de limpieza y mantenimiento.
            </p>
            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-medium">
              <Link href="/politica-privacidad" className="hover:text-[#173C61]">
                Política de privacidad
              </Link>
              <Link href="/proteccion-datos-personales" className="hover:text-[#173C61]">
                Protección de datos personales
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
