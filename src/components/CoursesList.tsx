"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

export type CourseItem = {
  t: string;        // título
  st?: string;      // subtítulo
  img?: string;     // ruta imagen
  href?: string;    // enlace opcional
};

type Props = {
  items: CourseItem[];
  className?: string;
};

export default function CoursesList({ items, className }: Props) {
  return (
    <ul className={clsx("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((c) => (
        <li
          key={`${c.t}-${c.img ?? "noimg"}`}
          className="border rounded-xl overflow-hidden bg-white shadow-sm"
        >
          <div className="relative aspect-[16/9] bg-gray-100">
            {c.img ? (
              <Image
                src={c.img}
                alt={c.t}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            ) : null}
          </div>

          <div className="p-4">
            <div className="font-semibold">{c.t}</div>
            {c.st ? <div className="text-sm text-gray-600 mt-1">{c.st}</div> : null}

            {c.href ? (
              // Si es ruta interna (ej: /cursos/xxx) usa Link; si es externa usa <a>
              c.href.startsWith("/") ? (
                <Link
                  href={c.href}
                  className="mt-3 inline-flex text-sky-600 hover:underline"
                >
                  Ver más
                </Link>
              ) : (
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sky-600 hover:underline"
                >
                  Ver más
                </a>
              )
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
