"use client";

import clsx from "clsx";

export type CourseItem = {
  t: string;        // título
  st?: string;      // subtítulo
  img?: string;     // ruta imagen
  href?: string;    // enlace opcional
};

type Props = {
  items: CourseItem[];     // ⬅️ ahora sí existirá "items"
  className?: string;
};

export default function CoursesList({ items, className }: Props) {
  return (
    <ul className={clsx("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((c, i) => (
        <li key={i} className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="aspect-[16/9] bg-gray-100">
            {c.img ? (
              // Si usas next/image, puedes cambiar a <Image>
              <img src={c.img} alt={c.t} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="p-4">
            <div className="font-semibold">{c.t}</div>
            {c.st ? <div className="text-sm text-gray-600 mt-1">{c.st}</div> : null}
            {c.href ? (
              <a
                href={c.href}
                className="mt-3 inline-flex text-sky-600 hover:underline"
              >
                Ver más
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
