"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Section from "@/components/Section";
import ServiceCard from "@/components/ServiceCard";
import Carousel from "@/components/Carousel";
import ServiceModal from "@/components/ServiceModal";
import ContactForm from "@/components/ContactForm";
import CoursesMini from "@/components/CoursesMini";
import type { CertificationItem, GalleryImage, ServiceType } from "@/types/admin";

const servicios = [
  {
    t: "Limpieza hospitalaria",
    d: "Mantenemos la asepsia en hospitales, clínicas y laboratorios con protocolos de bioseguridad certificados.",
    long:
      "Operamos con estándares de bioseguridad: zonificación, rutas limpias y sucias, equipos dedicados y registro de frecuencias. Diseñamos planes por turno para UCI, quirófanos, salas y áreas críticas.",
    bullets: [
      "Protocolos para áreas críticas",
      "Personal con EPP y capacitaciones vigentes",
      "Supervisión con checklist operativo",
    ],
    img: "/hospital.jpg",
  },
  {
    t: "Limpieza de oficinas y edificios",
    d: "Cuidamos la presentación y salubridad de entornos laborales mediante limpiezas diarias, profundas y de mantenimiento.",
    long:
      "Programas por turnos con insumos certificados y equipos silenciosos, enfocados en imagen corporativa, continuidad operativa y confort de colaboradores y clientes.",
    bullets: ["Rutina y limpieza profunda", "Cristales, pisos y mobiliario", "Cobertura para varias sedes"],
    img: "/oficinas.jpg",
  },
  {
    t: "Limpieza especializada",
    d: "Servicios adaptados a industrias, plantas de producción y zonas de difícil acceso, con personal técnico calificado.",
    long:
      "Procedimientos específicos para entornos industriales, post-obra y espacios con riesgo. Usamos químicos y equipos según ficha técnica y necesidad del cliente.",
    bullets: ["Limpieza post-obra", "Altura y espacios confinados", "Protocolos por sector"],
    img: "/work3.jpg",
  },
  {
    t: "Sanitización de ambientes",
    d: "Eliminamos virus, bacterias y hongos con técnicas avanzadas de nebulización y desinfección.",
    long:
      "Métodos de sanitización según nivel de riesgo: nebulización ULV, pulverización y barrido con amonios cuaternarios aprobados.",
    bullets: ["Nebulización ULV", "Productos certificados", "Reporte de aplicación"],
    img: "/sanitizacion.jpg",
  },
  {
    t: "Limpieza de hogar",
    d: "Soluciones confiables para el cuidado y limpieza de viviendas, con personal de confianza.",
    long:
      "Planes por horas o jornadas completas. Incluye limpieza de cocina, baños, habitaciones, cristales y detalles de mantenimiento.",
    bullets: ["Por horas o jornada", "Suministros incluidos bajo solicitud", "Checklists por área"],
    img: "/hogar1.jpg",
  },
  {
    t: "Limpieza de centros comerciales y retail",
    d: "Mantenimiento integral de espacios con alta afluencia de personas.",
    long:
      "Servicio continuo en centros comerciales, tiendas y espacios de retail, con personal certificado y equipos de alta eficiencia. Nos adaptamos a horarios operativos y mantenemos áreas comunes, vitrinas, pasillos, baños y zonas de alimentación en condiciones óptimas.",
    bullets: [
      "Horarios flexibles diurnos y nocturnos",
      "Equipos y maquinaria industrial incluida",
      "Protocolos de bioseguridad y sanitización continua",
    ],
    img: "/retail3.jpg",
  },
  {
    t: "Limpieza y mantenimiento de áreas verdes",
    d: "Podas, riegos y mantenimiento de jardines para conservar espacios naturales y agradables.",
    long:
      "Diseño, mantenimiento y renovación de áreas verdes con prácticas seguras, responsables y alineadas al cuidado ambiental.",
    bullets: ["Poda y riego", "Fertilización y control fitosanitario", "Limpieza perimetral"],
    img: "/jardin3.jpg",
  },
  {
    t: "Fumigación, desinfección y desratización",
    d: "Tratamientos certificados para el control de plagas, garantizando seguridad y efectividad.",
    long:
      "Diagnóstico, plan de intervención y seguimiento. Aplicamos manejo integrado de plagas con productos autorizados.",
    bullets: ["Inspección y diagnóstico", "Plan de control", "Certificados de servicio"],
    img: "/fumigar.jpg",
  },
];

const cursos = [
  {
    t: "Manejo y segregación de desechos",
    st: "Comunes, orgánicos, inorgánicos y biopeligrosos",
    img: "/cursos/desechos.jpg",
    long:
      "Capacitación enfocada en la correcta clasificación, transporte y disposición final de los desechos generados en áreas de limpieza, mantenimiento y salud. Incluye recipientes codificados por color, técnicas de separación segura y cumplimiento de la normativa sanitaria ecuatoriana vigente.",
  },
  {
    t: "Competencias laborales",
    st: "Buenas prácticas, productividad y control de calidad",
    img: "/cursos/laborales.jpg",
    long:
      "Este curso fortalece habilidades técnicas y blandas del personal operativo, orientadas al trabajo eficiente, comunicación efectiva y desempeño de calidad.",
  },
  {
    t: "Limpieza hospitalaria",
    st: "Rutina, terminal y gestión de riesgos en unidades de salud",
    img: "/cursos/hospitalaria.jpg",
    long:
      "Formación especializada en limpieza y desinfección hospitalaria bajo protocolos del Ministerio de Salud Pública y normativas aplicables.",
  },
  {
    t: "Trabajos en alturas",
    st: "Uso de EPP, líneas de vida y procedimientos seguros",
    img: "/cursos/alturas.webp",
    long:
      "Curso práctico sobre seguridad industrial en actividades realizadas por encima de los dos metros de altura, con énfasis en prevención de caídas.",
  },
  {
    t: "Riesgos psicosociales",
    st: "Identificación, prevención y primeros auxilios psicológicos",
    img: "/cursos/riesgos.png",
    long:
      "Capacitación para reconocer factores de riesgo psicosocial como estrés, fatiga, presión laboral o acoso, promoviendo salud mental en el trabajo.",
  },
  {
    t: "Bioseguridad hospitalaria",
    st: "Barreras, control de infecciones y trazabilidad",
    img: "/cursos/bioseguridad.jpeg",
    long:
      "Formación sobre uso de equipos de protección personal, normas de higiene, control de infecciones y medidas preventivas en ambientes hospitalarios.",
  },
  {
    t: "Atención al usuario",
    st: "Protocolo de servicio y resolución de incidencias",
    img: "/cursos/usuario.jpg",
    long:
      "Entrenamiento en atención al cliente interno y externo, con enfoque en cortesía, empatía y respuesta efectiva a los usuarios.",
  },
  {
    t: "Disolución y manejo de químicos",
    st: "Diluciones seguras, MSDS y almacenamiento responsable",
    img: "/cursos/quimicos.jpg",
    long:
      "Capacitación técnica sobre manipulación, dilución y preparación de productos químicos para limpieza profesional.",
  },
];

const indicadores = [
  { value: "2015", label: "Año de inicio de operaciones" },
  { value: "8+", label: "Líneas de servicio profesional" },
  { value: "24/7", label: "Atención para operaciones críticas" },
  { value: "100%", label: "Enfoque en calidad y bioseguridad" },
];

export default function Home() {
  const [selected, setSelected] = useState<number | null>(null);
  const [contactService, setContactService] = useState<string>("General");
  const [serviceItems, setServiceItems] = useState<typeof servicios>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [certificationItems, setCertificationItems] = useState<CertificationItem[]>([]);

  const open = selected !== null;
  const visibleServices = serviceItems.length ? serviceItems : servicios;
  const current = selected !== null ? visibleServices[selected] : null;
  const visibleCertifications = certificationItems.length
    ? certificationItems.map((item) => ({ src: item.fileUrl, alt: item.title }))
    : [
        { src: "/certs/iso9001.png", alt: "Certificación ISO 9001: Gestión de Calidad" },
        { src: "/certs/inen.png", alt: "Certificación INEN: Calidad y Seguridad Industrial" },
        { src: "/certs/eps.png", alt: "Certificación Somos EPS: Economía Popular y Solidaria" },
        { src: "/certs/soy-responsable.png", alt: "Certificación Soy Responsable: Compromiso Ambiental" },
      ];
  const visibleGallery = galleryImages.length
    ? galleryImages.map((item) => ({ src: item.imageUrl, alt: item.alt || item.title }))
    : [
        { src: "/work1.jpg", alt: "Trabajo de limpieza profesional 1" },
        { src: "/work2.jpg", alt: "Trabajo de limpieza profesional 2" },
        { src: "/work3.jpg", alt: "Trabajo de limpieza profesional 3" },
        { src: "/work4.jpg", alt: "Trabajo de limpieza profesional 4" },
        { src: "/work5.jpg", alt: "Trabajo de limpieza profesional 5" },
        { src: "/work6.jpg", alt: "Trabajo de limpieza profesional 6" },
        { src: "/work7.jpg", alt: "Trabajo de limpieza profesional 7" },
      ];

  useEffect(() => {
    fetch("/api/content/services")
      .then((res) => res.json())
      .then((data) => {
        const items = ((data.items || []) as ServiceType[]).map((item) => ({
          t: item.name,
          d: item.detail || item.name,
          long: item.detail || item.name,
          bullets: (item.activities || item.detail || item.name).split(/\r?\n|,/).map((activity) => activity.trim()).filter(Boolean),
          img: item.imageUrl || "/work3.jpg",
        }));
        setServiceItems(items);
      })
      .catch(() => undefined);
    fetch("/api/content/gallery").then((res) => res.json()).then((data) => setGalleryImages(data.items || [])).catch(() => undefined);
    fetch("/api/content/certifications").then((res) => res.json()).then((data) => setCertificationItems(data.items || [])).catch(() => undefined);
  }, []);

  return (
    <main>
      <section
        id="inicio"
        className="relative isolate flex min-h-[92vh] w-full items-center overflow-hidden bg-[#07141F] text-white"
      >
        <Image
          src="/fondo-inicio.jpg"
          alt="Equipo de limpieza profesional ASOSERLID"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,20,31,0.98),rgba(23,60,97,0.84),rgba(7,20,31,0.48))]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07141F] to-transparent" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-2xl backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#33C3C9]" />
              Servicios profesionales de limpieza y desinfección
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              Ambientes limpios, seguros y listos para operar
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-medium leading-relaxed text-white/90">
              Soluciones integrales de limpieza, bioseguridad, mantenimiento y capacitación para instituciones públicas, privadas y de salud.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#servicios"
                className="inline-flex items-center justify-center rounded-md bg-[#33C3C9] px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-white"
              >
                Ver servicios
              </a>
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white hover:text-slate-950"
              >
                Solicitar cotización
              </a>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {["Hospitales", "Empresas", "Instituciones"].map((item) => (
                <div key={item} className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white/90 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl border border-white/10 bg-white/10 blur-xl" />
            <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white text-slate-900 shadow-2xl">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/hospital.jpg"
                  alt="Servicio institucional de limpieza ASOSERLID"
                  fill
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#33C3C9]">
                    Limpio duradero
                  </p>
                  <p className="mt-1 text-2xl font-bold">ASOSERLID</p>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {["Bioseguridad", "Calidad", "Supervisión", "Trazabilidad"].map((item) => (
                  <div key={item} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-[#173C61]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden rounded-lg border border-white/15 bg-white/95 p-6 text-slate-900 shadow-2xl">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
              <Image
                src="/logo8.png"
                alt="Logo ASOSERLID"
                width={96}
                height={96}
                className="h-20 w-20 object-contain"
                priority
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#218F93]">
                  Compromiso institucional
                </p>
                <p className="mt-1 text-2xl font-bold text-[#173C61]">
                  Limpio duradero
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 text-sm text-slate-700">
              <p>
                Operamos con planificación, supervisión y personal capacitado para asegurar ambientes saludables, presentables y confiables.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Bioseguridad", "Calidad", "Responsabilidad", "Trazabilidad"].map((item) => (
                  <div key={item} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-[#173C61]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-8 sm:grid-cols-4">
          {indicadores.map((item) => (
            <div key={item.label} className="px-3 py-4 text-center">
              <div className="text-3xl font-bold text-[#173C61]">{item.value}</div>
              <div className="mt-2 text-sm text-slate-600">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <Section id="quienes-somos" title="Quiénes somos" subtitle="Una asociación con vocación de servicio, calidad y responsabilidad.">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-4 text-lg leading-relaxed text-slate-700">
            <p>
              La Asociación de Servicios de Limpieza DURACLEAN Limpio Duradero - ASOSERLID inició sus actividades el 15 de septiembre de 2015, fruto del compromiso de un grupo de personas honestas, responsables y con vocación de servicio.
            </p>
            <p>
              Nos especializamos en limpieza, desinfección, jardinería y mantenimiento profesional de hospitales, edificaciones, oficinas y viviendas, garantizando altos estándares de calidad, bioseguridad y sostenibilidad ambiental.
            </p>
            <p>
              También distribuimos productos de limpieza con sello de calidad, fichas técnicas y registros sanitarios autorizados, lo que nos permite ofrecer soluciones confiables e integrales a nuestros clientes.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              ["Misión", "Brindar servicios de limpieza y mantenimiento con personal capacitado, procesos responsables y atención cercana."],
              ["Visión", "Ser una organización referente por su calidad, cumplimiento y aporte al bienestar de cada espacio intervenido."],
              ["Valores", "Ética, responsabilidad, puntualidad, bioseguridad, trabajo en equipo y mejora continua."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-bold text-[#173C61]">{title}</h3>
                <p className="mt-2 text-slate-700">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section
        id="servicios"
        title="Servicios que prestamos"
        subtitle="Atención técnica para espacios de salud, empresas, hogares, comercios e industrias."
        className="bg-slate-50"
      >
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleServices.map((s, i) => (
            <li key={s.t} className="list-none">
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

      <Section
        id="capacitaciones"
        title="Cursos y capacitación"
        subtitle="Formación técnica para fortalecer la seguridad, eficiencia y calidad del personal operativo."
      >
        <CoursesMini items={cursos} />
      </Section>

      <Section
        id="certificaciones"
        title="Certificaciones"
        subtitle="Respaldos que fortalecen nuestro compromiso con la calidad, la seguridad y la responsabilidad social."
        className="bg-slate-50"
      >
        <p className="mb-8 max-w-4xl text-lg leading-relaxed text-slate-700">
          En <strong>ASOSERLID</strong>, trabajamos bajo altos estándares de calidad, seguridad y responsabilidad social. Estas acreditaciones fortalecen nuestra credibilidad ante instituciones públicas, privadas y de salud, reafirmando que nuestro trabajo se desarrolla con ética, eficiencia y sostenibilidad ambiental.
        </p>
        <div className="grid items-center gap-5 grid-cols-2 sm:grid-cols-4">
          {visibleCertifications.map((logo) => (
            <div key={logo.alt} className="flex min-h-44 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="relative h-32 w-full">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="clientes" title="Nuestros clientes y aliados" subtitle="Relaciones construidas con cumplimiento, confianza y servicio permanente.">
        <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4 text-lg leading-relaxed text-slate-700">
            <p>
              Contamos con la confianza de instituciones públicas y privadas del país, que respaldan nuestro compromiso con la calidad y la excelencia en el servicio.
            </p>
            <p>
              Nuestro equipo se adapta a las necesidades de cada cliente, desde operaciones diarias hasta servicios especializados por evento, riesgo o sector.
            </p>
          </div>
          <Image
            src="/clientes.png"
            alt="Clientes y aliados ASOSERLID"
            width={1600}
            height={900}
            className="h-auto w-full rounded-lg border border-slate-200 bg-white shadow-sm"
          />
        </div>
      </Section>

      <Section id="galeria" title="Galería" subtitle="Evidencia de nuestro trabajo en campo." className="bg-slate-50">
        <Carousel
          images={visibleGallery}
          aspect="aspect-[16/9]"
          rounded="rounded-lg"
        />
      </Section>

      <Section id="contacto" title="Contáctanos" subtitle="Cotiza tu servicio">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg bg-[#173C61] p-6 text-white">
            <h3 className="text-xl font-bold text-white">Información de contacto</h3>
            <div className="mt-6 space-y-4 text-white/90">
              <p><strong>Teléfono:</strong> 0998894744 | 032411217</p>
              <p><strong>Email:</strong> asoserlid@outlook.es</p>
              <p><strong>Dirección:</strong> Barcelona y Madrid, Ambato</p>
            </div>
            <div className="mt-8 rounded-md border border-white/20 bg-white/10 p-4 text-sm text-white/85">
              Responderemos tu solicitud para coordinar alcance, frecuencia, horarios y requerimientos técnicos del servicio.
            </div>
            <a
              href="https://wa.me/593998894744?text=Hola%20ASOSERLID%2C%20quiero%20informacion%20sobre%20sus%20servicios%20de%20limpieza."
              target="_blank"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[#25D366] px-5 py-3 font-bold text-slate-950 hover:bg-white"
            >
              Contactar por WhatsApp
            </a>
          </div>
          <ContactForm defaultService={contactService} />
        </div>
      </Section>

      <ServiceModal
        open={open}
        onClose={() => setSelected(null)}
        service={current}
        onRequest={(serviceName) => {
          setContactService(serviceName);
          document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </main>
  );
}
