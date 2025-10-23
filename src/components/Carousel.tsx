"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import clsx from "clsx";

type Img = { src: string; alt?: string; w?: number; h?: number };
type Props = {
  images: Img[];
  aspect?: string;   // ej: "aspect-[16/9]" o "aspect-square"
  rounded?: string;  // ej: "rounded-xl"
};

export default function Carousel({ images, aspect = "aspect-[16/9]", rounded = "rounded-xl" }: Props) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);
  const go = (i: number) => setIdx(i);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx > 0 ? prev() : next());
    touchStartX.current = null;
  }

  return (
    <div
      className={clsx("relative w-full select-none", rounded)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Galería"
      onKeyDown={(e) => (e.key === "ArrowLeft" ? prev() : e.key === "ArrowRight" ? next() : null)}
      tabIndex={0}
    >
      {/* Viewport */}
      <div className={clsx("overflow-hidden", rounded, aspect)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative min-w-full">
              <Image
                src={img.src}
                alt={img.alt || ""}
                fill
                sizes="(max-width:768px) 100vw, (max-width:1200px) 66vw, 1200px"
                className="object-contain bg-black"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controles */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
      >
        {/* chevron left */}
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
      >
        {/* chevron right */}
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      </button>

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir a la imagen ${i + 1}`}
            onClick={() => go(i)}
            className={clsx(
              "h-2.5 w-2.5 rounded-full transition",
              i === idx ? "bg-white shadow ring-1 ring-black/20 w-6" : "bg-white/60 hover:bg-white"
            )}
          />
        ))}
      </div>
    </div>
  );
}
