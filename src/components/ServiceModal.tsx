"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import clsx from "clsx";

type Servicio = {
  t: string;
  d: string;
  img: string;
  long?: string;
  bullets?: string[];
};

export default function ServiceModal({
  open,
  onClose,
  service,
  onRequest,              // 👈 NUEVO
}: {
  open: boolean;
  onClose: () => void;
  service: Servicio | null;
  onRequest?: (serviceName: string) => void; // 👈 NUEVO
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open || !service) return null;

  return (
    <div
      className={clsx("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm")}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${service.t}`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={clsx("relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-[modalIn_.25s_ease-out]")}
      >
        <div className="relative w-full bg-black aspect-[16/9]">
          <Image src={service.img} alt={service.t} fill sizes="(max-width:768px) 100vw, 800px" className="object-contain" priority />
          <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow hover:bg-white">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold">{service.t}</h3>
          <p className="mt-2 text-gray-700">{service.long ?? service.d}</p>

          {service.bullets?.length ? (
            <ul className="mt-4 grid list-disc gap-1 pl-5 text-gray-700">
              {service.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#contacto"
              onClick={(e) => {
                // Rellenar y cerrar
                onRequest?.(service.t);
                onClose();
                // permitir que el hash haga scroll; si no tienes scroll-behavior, puedes hacer smooth manual
              }}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
            >
              Solicitar este servicio
            </a>
            <button onClick={onClose} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalIn { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
