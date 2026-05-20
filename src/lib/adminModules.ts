export type AdminModule = {
  key: string;
  title: string;
  href: string;
  description: string;
  collection?: string;
  status: "ready" | "base";
  required: boolean;
  group: "settings" | "content";
};

export const adminModules: AdminModule[] = [
  {
    key: "courses",
    title: "Capacitaciones",
    href: "/admin/capacitaciones",
    description: "Cursos y capacitaciones ofrecidos en la pagina web.",
    collection: "courses",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "services",
    title: "Servicios",
    href: "/admin/servicios",
    description: "Servicios ofrecidos por la organizacion en la pagina web.",
    collection: "services",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "blog",
    title: "Blog institucional",
    href: "/admin/blog",
    description: "Edicion de publicaciones, portadas y contenido institucional.",
    collection: "blog_posts",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "gallery",
    title: "Galeria",
    href: "/admin/galeria",
    description: "Imagenes de servicios por categoria para la pagina institucional.",
    collection: "gallery_images",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "certifications",
    title: "Certificaciones",
    href: "/admin/certificaciones",
    description: "Documentos e imagenes de respaldo institucional.",
    collection: "certifications",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "audits",
    title: "Auditorias",
    href: "/admin/auditorias",
    description: "Registro de cambios realizados en el contenido de la pagina web.",
    collection: "audit_logs",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "backups",
    title: "Respaldos",
    href: "/admin/respaldos",
    description: "Exportacion de respaldo del contenido de la pagina web.",
    status: "ready",
    required: true,
    group: "content",
  },
  {
    key: "users",
    title: "Usuarios",
    href: "/admin/usuarios",
    description: "Administracion de usuarios con acceso al panel web.",
    collection: "users",
    status: "ready",
    required: true,
    group: "settings",
  },
];

export const settingsModules = adminModules.filter((module) => module.group === "settings");
export const contentModules = adminModules.filter((module) => module.group === "content");

export function getModuleByKey(key: string) {
  return adminModules.find((module) => module.key === key);
}
