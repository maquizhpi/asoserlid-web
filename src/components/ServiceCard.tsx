"use client";

import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";

type Props = {
  title: string;
  desc: string;
  img: string;       // ruta en /public o remota permitida en next.config
  selected?: boolean;
  onSelect?: () => void;
};

export default function ServiceCard({ title, desc, img, selected, onSelect }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group relative w-full overflow-hidden rounded-2xl border",
        "bg-white text-left transition-all",
        "shadow-sm hover:shadow-lg focus:shadow-lg",
        "outline-none",
        selected ? "ring-2 ring-sky-500" : "ring-1 ring-black/5 hover:ring-sky-300 focus-visible:ring-2 focus-visible:ring-sky-500"
      )}
    >
      {/* Wrapper con relación 16:9 */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image
          src={img}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1200px) 33vw, 400px"
          className={clsx(
            "object-cover transition-transform duration-500 ease-out",
            "group-hover:scale-[1.06] group-focus:scale-[1.06]",
            isLoading ? "blur-sm scale-105" : "blur-0"
          )}
          onLoadingComplete={() => setIsLoading(false)}
          priority={false}
        />

        {/* Overlay degradado para legibilidad */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Etiqueta superior opcional */}
        {/* <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold">Nuevo</span> */}
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h4 className="text-base font-semibold tracking-tight text-gray-900">
          {title}
        </h4>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
      </div>

      {/* Borde de selección animado */}
      <span
        className={clsx(
          "pointer-events-none absolute inset-0 rounded-2xl",
          "ring-0 ring-sky-500 transition-[box-shadow] duration-300",
          selected ? "ring-2" : "ring-0"
        )}
      />
    </button>
  );
}
