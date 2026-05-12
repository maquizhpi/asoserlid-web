import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} ASOSERLID. Servicios profesionales de limpieza y mantenimiento.</p>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-medium">
            <Link href="/politica-privacidad" className="hover:text-[#173C61]">
              Politica de privacidad
            </Link>
            <Link href="/proteccion-datos-personales" className="hover:text-[#173C61]">
              Proteccion de datos personales
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

