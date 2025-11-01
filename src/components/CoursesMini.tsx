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
      <ul className="grid gap-6 sm:grid-cols-2">
        {items.map((c, idx) => (
          <li
            key={idx}
            onClick={() => setSelected(c)}
            className="
              cursor-pointer border rounded-2xl p-6 flex items-center gap-6
              hover:shadow-xl hover:scale-[1.02] transition-all bg-white/50
            "
          >
            {/* Imagen más grande */}
            {c.img && (
              <div className="relative w-40 h-40 flex-shrink-0 overflow-hidden rounded-2xl ring-1 ring-gray-200">
                <Image
                  src={c.img}
                  alt={c.t}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            )}

            {/* Texto */}
            <div className="flex-1">
              <div className="font-semibold text-xl text-gray-900">{c.t}</div>
              <div className="text-base text-gray-600 leading-snug">{c.st}</div>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal */}
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
