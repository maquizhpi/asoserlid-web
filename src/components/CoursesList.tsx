// src/components/TrainingSection.tsx
import Image from "next/image";
import CoursesList from "./CoursesList";

type CourseItem = { title: string; desc: string };

type Props = {
  id?: string;
  imageSrc?: string;
  imageAlt?: string;
  courses: CourseItem[];
};

export default function TrainingSection({
  id = "capacitaciones",
  imageSrc = "/capacitaciones-libreria.jpg",
  imageAlt = "Librería con manuales y certificaciones",
  courses,
}: Props) {
  return (
    <section id={id} className="relative py-14 sm:py-20">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Cursos y Capacitación de Personal
            </h2>
            <p className="mt-3 text-base sm:text-lg opacity-90">
              Formación continua avalada por SETEC e ISO/IEC 17024.
            </p>
            <p className="mt-4 text-sm opacity-80">
              Fortalecemos competencias para asegurar seguridad, eficiencia y calidad
              en hospitales, retail, oficinas y más.
            </p>
          </div>

          <div className="relative h-64 sm:h-72 lg:h-80 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="mt-10 sm:mt-12">
          <CoursesList
            items={courses}
            className="mt-2"
          />
        </div>

        <div className="mt-6 text-xs opacity-70">
          * Enfoque en seguridad y salud ocupacional, manejo de químicos y bioseguridad.
        </div>
      </div>
    </section>
  );
}
