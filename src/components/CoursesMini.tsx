"use client";

import { useState } from "react";
import Image from "next/image";
import CourseModal from "./CourseModal";

type Course = {
  t: string;
  st: string;
  img?: string;
  long?: string;
};

export default function CoursesMini({ items }: { items: Course[] }) {
  const [selected, setSelected] = useState<Course | null>(null);

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.t}>
            <button
              type="button"
              onClick={() => setSelected(c)}
              className="group flex h-full w-full items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#33C3C9]/70 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#33C3C9]"
            >
              {c.img && (
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 sm:h-28 sm:w-28">
                  <Image
                    src={c.img}
                    alt={c.t}
                    fill
                    sizes="112px"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-[#173C61] sm:text-lg">{c.t}</div>
                <div className="mt-1 text-sm leading-relaxed text-slate-600">{c.st}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <CourseModal
          show={!!selected}
          onClose={() => setSelected(null)}
          title={selected.t}
          description={selected.long ?? ""}
          img={selected.img}
        />
      )}
    </>
  );
}
