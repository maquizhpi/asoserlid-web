"use client";

import Section from "@/components/Section";
import { Gallery } from "@/components/Gallery";
import ServiceCard from "@/components/ServiceCard";
import Carousel from "@/components/Carousel";
import ServiceModal from "@/components/ServiceModal";
import { useState } from "react";
import ContactForm from "@/components/ContactForm";
import CoursesMini from "@/components/CoursesMini";
import Image from 'next/image';



export default function Home() {
  const [selected, setSelected] = useState<number | null>(null);
  const [contactService, setContactService] = useState<string>("General"); // 👈 NUEVO

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
      t: "Limpieza de centros comerciales y retail",
      d: "Mantenimiento integral de espacios con alta afluencia de personas.",
      long:
        "Ofrecemos servicios de limpieza continua en centros comerciales, tiendas y espacios de retail, con personal certificado y equipos de alta eficiencia. Nos adaptamos a los horarios operativos y mantenemos áreas comunes, vitrinas, pasillos, baños y zonas de alimentación en condiciones óptimas.",
      bullets: [
        "Limpieza en horarios flexibles (diurno y nocturno)",
        "Equipos y maquinaria industrial incluida",
        "Protocolos de bioseguridad y sanitización continua"
      ],
      img: "/retail3.jpg",
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
        <Image
          src="/fondo-inicio.jpg"
          alt="Fondo ASOSERLID"
          fill
          priority
          className="object-cover"
        />

        {/* Capa oscura */}
        <div className="absolute inset-0 bg-black/70"></div>

        {/* Contenido principal */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-3xl">
          {/* LOGO */}
          <Image
            src="/logo8.png"
            alt="Logo ASOSERLID"
            width={240}
            height={240}
            className="mb-6 drop-shadow-lg animate-fade-in h-auto w-auto"
            priority
          />
          {/* ... resto igual ... */}
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
                onSelect={() => setSelected(i)}
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
      
      {/* CAPACITACIONES */}
      <Section id="capacitaciones" title="Cursos y Capacitación">
        <CoursesMini
          items={[
            {
              t: "Manejo y segregación de desechos",
              st: "Comunes, orgánicos, inorgánicos y biopeligrosos",
              img: "/cursos/desechos.jpg",
            },
            {
              t: "Competencias laborales (Operario de Limpieza)",
              st: "Buenas prácticas, productividad y control de calidad",
              img: "/cursos/laborales.jpg",
            },
            {
              t: "Limpieza hospitalaria",
              st: "Rutina, terminal y gestión de riesgos en unidades de salud",
              img: "/cursos/hospitalaria.jpg",
            },
            {
              t: "Trabajos en alturas",
              st: "Uso de EPP, líneas de vida y procedimientos seguros",
              img: "/cursos/alturas.webp",
            },
            {
              t: "Riesgos psicosociales",
              st: "Identificación, prevención y primeros auxilios psicológicos",
              img: "/cursos/riesgos.png",
            },
            {
              t: "Bioseguridad hospitalaria",
              st: "Barreras, control de infecciones y trazabilidad",
              img: "/cursos/bioseguridad.jpeg",
            },
            {
              t: "Atención al usuario",
              st: "Protocolo de servicio y resolución de incidencias",
              img: "/cursos/usuario.jpg",
            },
            {
              t: "Disolución y manejo de químicos",
              st: "Diluciones seguras, MSDS y almacenamiento",
              img: "/cursos/quimicos.jpg",
            },
          ]}
        />
      </Section>



      {/* CLIENTES Y ALIADOS */}
      <Section id="clientes" title="Nuestros clientes y aliados">
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/clientes.png"
            alt="Clientes y aliados ASOSERLID"
            width={1600}
            height={900}
            className="w-full max-w-4xl h-auto rounded-xl shadow-lg transition-transform duration-500 hover:scale-[1.02]"
          />
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
          <ContactForm defaultService={contactService} /> {/* 👈 ahora precarga */}
        </div>
      </Section>

      {/* MODAL DE SERVICIO */}
      <ServiceModal
        open={open}
        onClose={() => setSelected(null)}
        service={current}
        onRequest={(serviceName) => {
          setContactService(serviceName);       // 1) setea el servicio
          // 2) scroll suave (si aún no lo tienes global)
          document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </main>
  );
}
