"use client";

import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";

type Props = {
  title: string;
  desc: string;
  img: string;
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
        "group relative h-full w-full overflow-hidden rounded-lg border bg-white text-left shadow-sm outline-none transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl focus:shadow-xl",
        selected
          ? "ring-2 ring-[#33C3C9]"
          : "ring-1 ring-black/5 hover:ring-[#33C3C9]/60 focus-visible:ring-2 focus-visible:ring-[#33C3C9]"
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image
          src={img}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1200px) 33vw, 400px"
          className={clsx(
            "object-cover transition-transform duration-500 ease-out",
            "group-hover:scale-[1.06] group-focus:scale-[1.06]",
            isLoading ? "scale-105 blur-sm" : "blur-0"
          )}
          onLoadingComplete={() => setIsLoading(false)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#173C61] shadow-sm">
          Servicio
        </span>
      </div>

      <div className="p-5">
        <h4 className="text-lg font-bold tracking-tight text-[#173C61]">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
        <span className="mt-4 inline-flex text-sm font-semibold text-[#218F93]">
          Ver detalles
        </span>
      </div>

      <span
        className={clsx(
          "pointer-events-none absolute inset-0 rounded-lg ring-0 ring-[#33C3C9] transition-[box-shadow] duration-300",
          selected ? "ring-2" : "ring-0"
        )}
      />
    </button>
  );
}
