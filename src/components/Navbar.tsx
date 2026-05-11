"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import Image from "next/image";

type NavLink =
  | { type: "section"; sectionId: string; label: string }
  | { type: "route"; href: string; label: string };

const links: NavLink[] = [
  { type: "section", sectionId: "quienes-somos", label: "Quiénes somos" },
  { type: "section", sectionId: "servicios", label: "Servicios" },
  { type: "section", sectionId: "capacitaciones", label: "Capacitación" },
  { type: "section", sectionId: "certificaciones", label: "Certificaciones" },
  { type: "section", sectionId: "clientes", label: "Clientes" },
  { type: "section", sectionId: "galeria", label: "Galería" },
  { type: "route", href: "/blog", label: "Blog" },
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
    if (l.type === "route") {
      return (
        <Link href={l.href} className={className} onClick={onClick}>
          {l.label}
        </Link>
      );
    }

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
        "sticky top-0 z-50 w-full border-b border-slate-200 backdrop-blur transition",
        scrolled ? "bg-white/95 shadow-sm" : "bg-white/90"
      )}
    >
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo3.jpg"
            alt="ASOSERLID"
            width={48}
            height={48}
            className="h-12 w-12 rounded-md object-contain"
            priority
          />
          <div className="hidden sm:block">
            <span className="block text-base font-bold tracking-tight text-[#173C61]">
              ASOSERLID
            </span>
            <span className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Limpio duradero
            </span>
          </div>
        </Link>

        <ul className="hidden items-center gap-5 text-sm font-medium lg:flex">
          {links.map((l) => (
            <li key={l.type === "route" ? `${l.href}-${l.label}` : `${l.sectionId}-${l.label}`}>
              {renderNavLink(l, "text-slate-700 transition hover:text-[#218F93]")}
            </li>
          ))}
          <li>
            <Link
              href={{ pathname: "/", hash: "contacto" }}
              className="rounded-md bg-[#173C61] px-4 py-2.5 font-semibold text-white transition hover:bg-[#218F93]"
            >
              Cotizar
            </Link>
          </li>
        </ul>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      <div
        className={clsx(
          "overflow-hidden transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[32rem]" : "max-h-0"
        )}
      >
        <ul className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 text-sm font-medium">
          {links.map((l) => (
            <li key={l.type === "route" ? `${l.href}-${l.label}` : `${l.sectionId}-${l.label}`}>
              {renderNavLink(
                l,
                "block rounded-md px-3 py-2.5 text-slate-800 hover:bg-slate-50",
                () => setOpen(false)
              )}
            </li>
          ))}
          <li className="pt-2">
            <Link
              href={{ pathname: "/", hash: "contacto" }}
              className="block rounded-md bg-[#173C61] px-3 py-2.5 text-center font-semibold text-white hover:bg-[#218F93]"
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
