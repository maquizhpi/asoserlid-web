import Image from "next/image";

type Course = {
  t: string;
  st: string;
  img?: string;
};

export default function CoursesMini({ items }: { items: Course[] }) {
  return (
    <ul className="space-y-4">
      {items.map((c, idx) => (
        <li
          key={idx}
          className="border rounded-2xl p-5 flex items-center gap-5 hover:shadow-lg transition-all"
        >
          {/* Imagen del curso */}
          {c.img && (
            <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl ring-1 ring-gray-200">
              <Image
                src={c.img}
                alt={c.t}
                fill
                sizes="112px"
                className="object-cover"
              />
            </div>
          )}

          {/* Texto */}
          <div className="flex-1">
            <div className="font-semibold text-lg text-gray-900">{c.t}</div>
            <div className="text-sm text-gray-600 leading-snug">{c.st}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
