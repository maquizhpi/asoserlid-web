"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";

type SectionLink = { sectionId: string; label: string };
type RouteLink = { href: string; label: string; route: true };
type NavLink = SectionLink | RouteLink;

const links: NavLink[] = [
  { sectionId: "quienes-somos", label: "Quiénes somos" },
  { sectionId: "servicios", label: "Servicios" },
  { sectionId: "capacitaciones", label: "Cursos" },
  { sectionId: "certificaciones", label: "Certificaciones" },
  { sectionId: "clientes", label: "Clientes" },
  { sectionId: "galeria", label: "Galería" },
  { sectionId: "contacto", label: "Contacto" },
  { href: "/blog", label: "Blog", route: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const renderNavLink = (l: NavLink, className = "", onClick?: () => void) => {
    // Rutas normales (ej. /blog)
    if ("route" in l && l.route) {
      return (
        <Link href={l.href} className={className} onClick={onClick}>
          {l.label}
        </Link>
      );
    }
    // Secciones: siempre ir a "/" con hash
    return (
      <Link
        href={{ pathname: "/", hash: l.sectionId }}
        className={className}
        onClick={onClick}
      >
        {l.label}
      </Link>
    );
  };

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full backdrop-blur transition",
        scrolled ? "bg-white/85 shadow-sm" : "bg-white/60"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo: siempre al home */}
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo3.jpg" alt="ASOSERLID" className="h-9 w-auto" />
          <span className="hidden sm:block text-sm font-semibold text-gray-900">
            ASOSERLID
          </span>
        </Link>

        {/* Links escritorio */}
        <ul className="hidden lg:flex items-center gap-5 text-sm">
          {links.map((l) => (
            <li
              key={
                "route" in l && l.route ? `${l.href}-${l.label}` : `${l.sectionId}-${l.label}`
              }
            >
              {renderNavLink(l, "text-gray-700 hover:text-sky-700 transition")}
            </li>
          ))}
          <li>
            {/* Botón a sección contacto del home */}
            <Link
              href={{ pathname: "/", hash: "contacto" }}
              className="rounded-lg bg-sky-600 px-3 py-2 text-white hover:bg-sky-700 transition"
            >
              Cotizar
            </Link>
          </li>
        </ul>

        {/* Botón hamburguesa móvil */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {/* Panel móvil */}
      <div
        className={clsx(
          "lg:hidden overflow-hidden transition-[max-height] duration-300",
          open ? "max-h-96" : "max-h-0"
        )}
      >
        <ul className="space-y-1 border-t bg-white/95 px-4 py-3 text-sm">
          {links.map((l) => (
            <li
              key={
                "route" in l && l.route ? `${l.href}-${l.label}` : `${l.sectionId}-${l.label}`
              }
            >
              {renderNavLink(
                l,
                "block rounded-md px-2 py-2 text-gray-800 hover:bg-gray-100",
                () => setOpen(false)
              )}
            </li>
          ))}
          <li className="pt-2">
            <Link
              href={{ pathname: "/", hash: "contacto" }}
              className="block rounded-lg bg-sky-600 px-3 py-2 text-center font-medium text-white hover:bg-sky-700"
              onClick={() => setOpen(false)}
            >
              Solicitar cotización
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
