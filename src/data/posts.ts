// /data/posts.ts
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;        // ruta dentro de /public
  date: string;         // ISO (YYYY-MM-DD)
  author?: string;
  tags?: string[];
  content: string;      // HTML simple o texto; aquí usamos HTML seguro
};

export const posts: Post[] = [
  {
    slug: "limpieza-hospitalaria-sostenible",
    title: "Limpieza hospitalaria sostenible: prácticas clave",
    excerpt:
      "Cómo implementar protocolos efectivos de desinfección con enfoque ambiental en unidades de salud.",
    cover: "/blog/limpieza-hospitalaria.jpg",
    date: "2025-10-15",
    author: "Equipo ASOSERLID",
    tags: ["hospitalaria", "bioseguridad", "sostenibilidad"],
    content: `
      <p>La limpieza hospitalaria requiere <strong>protocolos validados</strong>, control de insumos y
      trazabilidad. En ASOSERLID aplicamos matrices de riesgo, diluciones correctas y
      <em>checklists</em> por área crítica/no crítica.</p>
      <h3>Buenas prácticas</h3>
      <ul>
        <li>Rutas de desinfección con código de color.</li>
        <li>Capacitación continua bajo perfiles SETEC/ISO/IEC 17024.</li>
        <li>Registro fotográfico y reportes por turno.</li>
      </ul>
    `,
  },
  {
    slug: "oficinas-mas-sanas-y-eficientes",
    title: "Oficinas más sanas y eficientes: limpieza por resultados",
    excerpt:
      "Pasar de ‘tareas por hora’ a ‘niveles de servicio (SLA)’ para espacios corporativos.",
    cover: "/blog/oficinas-sostenibles.jpg",
    date: "2025-09-30",
    author: "Equipo ASOSERLID",
    tags: ["oficinas", "SLA", "calidad"],
    content: `
      <p>El enfoque por SLA prioriza el <strong>resultado visible</strong> y la satisfacción del usuario.
      Definimos indicadores como brillo de superficies, ausencia de polvo y tiempos de respuesta.</p>
      <p>Beneficios: mejor experiencia, costos transparentes y priorización por zonas.</p>
    `,
  },
  {
    slug: "epp-bioseguridad-imprescindible",
    title: "EPP y bioseguridad: imprescindibles para el servicio",
    excerpt:
      "Selección correcta de equipos de protección personal y su mantenimiento.",
    cover: "/blog/epp-bioseguridad.jpg",
    date: "2025-08-20",
    author: "ASOSERLID Capacitación",
    tags: ["EPP", "seguridad", "capacitación"],
    content: `
      <p>El EPP reduce riesgos y estandariza la operación. Recomendamos inventario por persona,
      protocolos de cambio y <strong>control de vencimientos</strong>.</p>
      <p>Incluye guantes, mascarillas, lentes, calzado y uniformes con propiedades anti-químicas.</p>
    `,
  },
];

// Helpers
export function getAllPosts() {
  // ordena por fecha descendente
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string) {
  return posts.find((p) => p.slug === slug);
}
