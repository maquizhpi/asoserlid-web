"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

const links = [
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#servicios", label: "Servicios" },
  { href: "#experiencia", label: "Experiencia" },
  { href: "#capacitaciones", label: "Cursos y Capacitación" },
  { href: "#certificaciones", label: "Certificaciones" },
  { href: "#clientes", label: "Clientes" },
  { href: "#galeria", label: "Galería" },
  { href: "#contacto", label: "Contacto" },
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

  // Cierra el panel al pasar a escritorio
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full backdrop-blur transition",
        scrolled ? "bg-white/85 shadow-sm" : "bg-white/60"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <a href="#inicio" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo3.jpg" alt="ASOSERLID" className="h-9 w-auto" />
          <span className="hidden sm:block text-sm font-semibold text-gray-900">
            ASOSERLID
          </span>
        </a>

        {/* Links escritorio */}
        <ul className="hidden lg:flex items-center gap-5 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-gray-700 hover:text-sky-700 transition"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#contacto"
              className="rounded-lg bg-sky-600 px-3 py-2 text-white hover:bg-sky-700 transition"
            >
              Cotizar
            </a>
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
            <li key={l.href}>
              <a
                href={l.href}
                className="block rounded-md px-2 py-2 text-gray-800 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="pt-2">
            <a
              href="#contacto"
              className="block rounded-lg bg-sky-600 px-3 py-2 text-center font-medium text-white hover:bg-sky-700"
              onClick={() => setOpen(false)}
            >
              Solicitar cotización
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
