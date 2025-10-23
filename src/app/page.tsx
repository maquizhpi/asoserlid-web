"use client";

import Section from "@/components/Section";
import { Gallery } from "@/components/Gallery";
import ServiceCard from "@/components/ServiceCard";
import Carousel from "@/components/Carousel";
import ServiceModal from "@/components/ServiceModal";
import { useState } from "react";

export default function Home() {
  const [selected, setSelected] = useState<number | null>(null);

  const servicios = [
    {
      t: "Limpieza hospitalaria",
      d: "Mantenemos la asepsia en hospitales, clínicas y laboratorios con protocolos de bioseguridad certificados.",
      long:
        "Operamos con estándares de bioseguridad: zonificación, rutas limpias/sucias, equipos dedicados y registro de frecuencias. Planes por turno para UCI, quirófanos, salas y áreas críticas.",
      bullets: [
        "Protocolos para áreas críticas",
        "Personal con EPP y capacitaciones vigentes",
        "Supervisión con checklist digital",
      ],
      img: "/hospital.jpg",
    },
    {
      t: "Limpieza de oficinas y edificios",
      d: "Cuidamos la presentación y salubridad de entornos laborales mediante limpiezas diarias, profundas y de mantenimiento.",
      long:
        "Programas por turnos con insumos certificados y equipos silenciosos. Enfocados en imagen corporativa y confort de colaboradores y clientes.",
      bullets: ["Rutina y profunda", "Cristales, pisos y mobiliario", "Cobertura multi-sede"],
      img: "/oficinas.jpg",
    },
    {
      t: "Limpieza especializada",
      d: "Servicios adaptados a industrias, plantas de producción y zonas de difícil acceso, con personal técnico calificado.",
      long:
        "Procedimientos específicos para entornos industriales, post-obra y espacios con riesgo. Uso de químicos y equipos según ficha técnica.",
      bullets: ["Post-obra", "Altura y espacios confinados", "Protocolos por sector"],
      img: "/work3.jpg",
    },
    {
      t: "Sanitización de ambientes",
      d: "Eliminamos virus, bacterias y hongos con técnicas avanzadas de nebulización y desinfección.",
      long:
        "Métodos de sanitización según riesgo: nebulización ULV, pulverización y barrido con amonios cuaternarios aprobados.",
      bullets: ["Nebulización ULV", "Productos certificados", "Reporte de aplicación"],
      img: "/sanitizacion.jpg",
    },
    {
      t: "Limpieza de hogar",
      d: "Soluciones confiables para el cuidado y limpieza de viviendas, con personal de confianza.",
      long:
        "Planes por horas o jornadas completas. Incluye limpieza de cocina, baños, habitaciones, cristales y detalles.",
      bullets: ["Por horas o jornada", "Suministros incluidos (opcional)", "Checklists por área"],
      img: "/hogar1.jpg",
    },
    {
      t: "Limpieza y mantenimiento de áreas verdes",
      d: "Podas, riegos y mantenimiento de jardines para conservar espacios naturales y agradables.",
      long:
        "Diseño, mantenimiento y renovación de áreas verdes con prácticas seguras y ecológicas.",
      bullets: ["Poda y riego", "Fertilización y control fitosanitario", "Limpieza perimetral"],
      img: "/jardin3.jpg",
    },
    {
      t: "Fumigación, desinfección y desratización",
      d: "Tratamientos certificados para el control de plagas, garantizando seguridad y efectividad.",
      long:
        "Diagnóstico, plan de intervención y seguimiento. Manejo integrado de plagas con productos autorizados.",
      bullets: ["Inspección y diagnóstico", "Plan de control", "Certificados de servicio"],
      img: "/fumigar.jpg",
    },
  ];

  const open = selected !== null;
  const current = selected !== null ? servicios[selected] : null;

  return (
    <main>
     {/* HERO */}
      <section
        className="relative w-full h-[90vh] flex items-center justify-center text-center text-white overflow-hidden"
        id="inicio"
      >
        {/* Imagen de fondo */}
        <img
          src="/fondo-inicio.jpg" // 🔹 reemplaza con el nombre de tu imagen en /public
          alt="Fondo ASOSERLID"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Capa oscura para mejor legibilidad */}
        <div className="absolute inset-0 bg-black/70"></div>

        {/* Contenido principal */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-3xl">
          {/* LOGO */}
          <img
            src="/logo8.png" // tu logo en /public
            alt="Logo ASOSERLID"
            className="w-60 h-auto mb-6 drop-shadow-lg animate-fade-in"
          />

          {/* TÍTULO */}
          <section className="asoserlid-section">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
              ASOSERLID
            </h1>
            <h2 className="text-2xl sm:text-3xl font-semibold mt-2">
              ASOCIACIÓN DE SERVICIOS DE LIMPIEZA
            </h2>
            <h3 className="text-xl sm:text-2xl font-semibold mt-1">
              LIMPIO DURADERO DURACLEAN
            </h3>
            <p className="mt-6 text-lg sm:text-xl leading-relaxed">
              Limpieza profesional, desinfección y mantenimiento con personal certificado.
            </p>
          </section>

          {/* BOTÓN CTA */}
          <a
            href="#contacto"
            className="inline-block mt-8 px-8 py-3 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 transition shadow-lg"
          >
            Solicitar cotización
          </a>

          {/* Frase opcional tipo lema */}
          <p className="mt-6 text-sm sm:text-base text-gray-300">
            Más de <span className="text-sky-400 font-bold">9 años</span> de experiencia al servicio del Ecuador
          </p>
        </div>
      </section>


      {/* ABOUT */}
      <Section id="quienes-somos" title="¿Quiénes somos?">
        <div className="prose max-w-none">
          <p>
            La Asociación de Servicios de Limpieza DURACLEAN Limpio Duradero – ASOSERLID inició sus actividades el 15 de septiembre de 2015, fruto del compromiso de un grupo de personas honestas, responsables y con vocación de servicio.
            Nos especializamos en limpieza, desinfección, jardinería y mantenimiento profesional de hospitales, edificaciones, oficinas y viviendas, garantizando siempre altos estándares de calidad, bioseguridad y sostenibilidad ambiental
            Además, somos distribuidores de productos de limpieza con sello de calidad, respaldados por fichas técnicas y registros sanitarios autorizados, lo que nos permite ofrecer soluciones confiables e integrales a nuestros clientes.
            En ASOSERLID, trabajamos con pasión, responsabilidad y compromiso, promoviendo una cultura de limpieza, salud y bienestar en cada uno de nuestros servicios.
          </p>
        </div>
      </Section>

      {/* SERVICIOS */}
      <Section id="servicios" title="Servicios que prestamos">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s, i) => (
            <li key={i} className="list-none">
              <ServiceCard
                title={s.t}
                desc={s.d}
                img={s.img}
                selected={selected === i}
                onSelect={() => setSelected(i)} // abre el modal
              />
            </li>
          ))}
        </ul>
      </Section>

      {/* EXPERIENCIA */}
      <Section id="experiencia" title="Experiencia">
        <ul className="space-y-3">
          {[
            { t: "Red de Agencias Financieras", st: "Mantenimiento y limpieza multi-sede" },
            { t: "Clínicas & Centros de Salud", st: "Contratos de bioseguridad" },
          ].map((e, idx) => (
            <li key={idx} className="border rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{e.t}</div>
                <div className="text-sm text-gray-600">{e.st}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* CLIENTES Y ALIADOS */}
      <Section id="clientes" title="Nuestros clientes y aliados">
        <div className="flex flex-col items-center justify-center">
          {/* Imagen principal */}
          <img
            src="/clientes.png" // 🔹 coloca tu imagen en /public con este nombre
            alt="Clientes y aliados ASOSERLID"
            className="w-full max-w-4xl h-auto rounded-xl shadow-lg transition-transform duration-500 hover:scale-[1.02]"
          />

          {/* Texto opcional debajo */}
          <p className="mt-6 text-center text-gray-600 text-lg max-w-2xl">
            Contamos con la confianza de instituciones públicas y privadas del país,
            que respaldan nuestro compromiso con la calidad y la excelencia en el servicio.
          </p>
        </div>
      </Section>


      {/* CERTIFICACIONES */}
      <Section id="certificaciones" title="Certificaciones">
        <Gallery
          images={[
            { src: "/ISO.jpg", alt: "Certificación ISO" },
            { src: "/inen.jpg", alt: "INEN" },
            { src: "/somoseps.jpeg", alt: "Somos EPS" },
            { src: "/soy.png", alt: "Soy Solidario" },
          ]}
        />
      </Section>



      {/* GALERÍA */}
      <Carousel
        images={[
          { src: "/work1.jpg", alt: "Trabajo 1" },
          { src: "/work2.jpg", alt: "Trabajo 2" },
          { src: "/work3.jpg", alt: "Trabajo 3" },
          { src: "/work4.jpg", alt: "Trabajo 4" },
          { src: "/work5.jpg", alt: "Trabajo 5" },
          { src: "/work6.jpg", alt: "Trabajo 6" },
          { src: "/work7.jpg", alt: "Trabajo 7" },
        ]}
        aspect="aspect-[16/9]"     // puedes usar "aspect-square" o "aspect-[4/3]"
        rounded="rounded-2xl"
      />


      {/* CONTACTO */}
      <Section id="contacto" title="Contáctanos" subtitle="Cotiza tu servicio">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-700">Tel: 0998894744 | 032411217</p>
            <p className="text-gray-700">Email: asoserlid@outlook.es</p>
            <p className="text-gray-700">Dirección: Barcelona y Madrid, Ambato</p>
          </div>
          <form action="https://formspree.io/f/yourid" method="POST" className="space-y-2">
            <input required name="name" placeholder="Nombre" className="w-full border rounded p-2" />
            <input required name="email" type="email" placeholder="Email" className="w-full border rounded p-2" />
            <textarea required name="message" placeholder="Mensaje" className="w-full border rounded p-2 min-h-32" />
            <button className="px-4 py-2 rounded bg-black text-white">Enviar</button>
          </form>
        </div>
      </Section>

      {/* MODAL DE SERVICIO */}
      <ServiceModal
        open={open}
        onClose={() => setSelected(null)}
        service={current}
      />
    </main>
  );
}
