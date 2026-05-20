"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemShell from "@/components/system/SystemShell";

type SessionUser = {
  name: string;
  email: string;
};

type ContentStats = {
  courses: number;
  services: number;
  blogPosts: number;
  galleryImages: number;
  certifications: number;
};

const redirectStorageKey = "asoserlid_admin_redirect_after_login";

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const [coursesRes, servicesRes, postsRes, galleryRes, certsRes] = await Promise.all([
      fetch("/api/admin/courses", { cache: "no-store" }).catch(() => null),
      fetch("/api/admin/services", { cache: "no-store" }).catch(() => null),
      fetch("/api/admin/posts", { cache: "no-store" }).catch(() => null),
      fetch("/api/admin/gallery", { cache: "no-store" }).catch(() => null),
      fetch("/api/admin/certifications", { cache: "no-store" }).catch(() => null),
    ]);
    const [coursesData, servicesData, postsData, galleryData, certsData] = await Promise.all([
      coursesRes?.json().catch(() => ({})),
      servicesRes?.json().catch(() => ({})),
      postsRes?.json().catch(() => ({})),
      galleryRes?.json().catch(() => ({})),
      certsRes?.json().catch(() => ({})),
    ]);
    setStats({
      courses: coursesData?.items?.length ?? 0,
      services: servicesData?.items?.length ?? 0,
      blogPosts: postsData?.posts?.length ?? 0,
      galleryImages: galleryData?.items?.length ?? 0,
      certifications: certsData?.items?.length ?? 0,
    });
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const [modulesRes, meRes] = await Promise.all([
      fetch("/api/admin/modules", { cache: "no-store" }),
      fetch("/api/admin/me", { cache: "no-store" }),
    ]);

    if (modulesRes.status === 401 || meRes.status === 401) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    const meData = await meRes.json().catch(() => ({}));
    if (!meRes.ok) {
      setStatus(meData.error || "No se pudo cargar la sesion.");
      setLoading(false);
      return;
    }

    setSessionUser(meData.user || null);
    setAuthenticated(true);
    await loadStats();
    setLoading(false);
  }, [loadStats]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired") === "1") {
      setStatus("Tu sesion se cerro por inactividad. Ingresa nuevamente para continuar.");
    }
  }, []);

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "Correo o contrasena incorrectos.");
      return;
    }

    setLogin({ email: "", password: "" });
    const redirectTo = sessionStorage.getItem(redirectStorageKey);
    if (redirectTo && redirectTo.startsWith("/admin") && redirectTo !== "/admin") {
      sessionStorage.removeItem(redirectStorageKey);
      router.push(redirectTo);
      return;
    }
    await loadSession();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <p className="mx-auto max-w-4xl text-slate-600">Cargando...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0d2235] px-4 py-8">
        <img
          src="/fondo-inicio.jpg"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-40 blur-[3px]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d2235]/80 via-[#173C61]/60 to-[#218F93]/30" />
        <div className="absolute left-[-12rem] top-[-10rem] h-96 w-96 rounded-full bg-[#33C3C9]/20 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full bg-[#7AC143]/15 blur-3xl" />

        <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-xl border border-white/20 bg-white shadow-2xl md:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={submitLogin} className="bg-white px-6 py-8 sm:px-10 sm:py-12">
            <div className="mb-8 flex flex-col items-start gap-3">
              <img src="/logo2.png" alt="ASOSERLID" className="h-16 w-16 rounded-full object-cover shadow-md" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#218F93]">Administracion web</p>
                <h1 className="mt-1 text-2xl font-bold text-[#173C61]">Iniciar sesion</h1>
                <p className="mt-1 text-sm leading-5 text-slate-500">Accede para gestionar el contenido del sitio web institucional.</p>
              </div>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Correo
              <input
                required
                type="email"
                className={inputClass}
                value={login.email}
                onChange={(e) => setLogin({ ...login, email: e.target.value })}
              />
            </label>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
              Contrasena
              <input
                required
                type="password"
                className={inputClass}
                value={login.password}
                onChange={(e) => setLogin({ ...login, password: e.target.value })}
              />
            </label>

            <button className="mt-7 w-full rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white shadow-lg shadow-[#173C61]/20 transition hover:bg-[#218F93]">
              Ingresar
            </button>

            {status && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{status}</p>}
            <Link href="/" className="mt-5 block text-center text-sm font-semibold text-[#173C61] hover:text-[#218F93]">
              Volver al sitio web
            </Link>
          </form>

          <aside className="relative hidden min-h-[31rem] overflow-hidden bg-[#173C61] md:block">
            <img
              src="/fondo-inicio.jpg"
              alt="ASOSERLID - Limpieza y Desinfeccion"
              className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#173C61]/70 via-[#218F93]/40 to-transparent" />
            <div className="absolute inset-x-6 bottom-8 rounded-xl border border-white/25 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-md">
              <img src="/logo.png" alt="ASOSERLID" className="mb-4 h-16 w-auto object-contain drop-shadow-lg" />
              <h2 className="text-2xl font-bold leading-tight">Limpieza y Desinfeccion<br/>con normas de calidad</h2>
              <p className="mt-2 text-sm font-semibold text-[#7AC143]">ISO/IEC 17024</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
                <span className="rounded-full border border-white/25 px-3 py-1">Hospitalaria</span>
                <span className="rounded-full border border-white/25 px-3 py-1">Oficinas</span>
                <span className="rounded-full border border-white/25 px-3 py-1">Hogares</span>
              </div>
            </div>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <SystemShell title="Panel de administracion web" subtitle="Gestiona el contenido del sitio web institucional.">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#173C61] via-[#218F93] to-[#7AC143] px-5 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Panel principal</p>
          <h2 className="mt-2 text-2xl font-bold">Bienvenido{sessionUser?.name ? `, ${sessionUser.name}` : ""}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">
            Administra el contenido de la pagina web: blog, galeria de servicios y certificaciones institucionales.
          </p>
        </div>
      </section>

      {stats && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Capacitaciones" value={String(stats.courses)} href="/admin/capacitaciones" tone="purple" />
          <StatCard label="Servicios web" value={String(stats.services)} href="/admin/servicios" tone="teal" />
          <StatCard label="Publicaciones del blog" value={String(stats.blogPosts)} href="/admin/blog" tone="blue" />
          <StatCard label="Imagenes en galeria" value={String(stats.galleryImages)} href="/admin/galeria" tone="green" />
          <StatCard label="Certificaciones" value={String(stats.certifications)} href="/admin/certificaciones" tone="cyan" />
        </section>
      )}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Acciones rapidas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink href="/admin/capacitaciones" title="Capacitaciones" description="Cursos y formacion tecnica" />
          <QuickLink href="/admin/servicios" title="Servicios" description="Servicios ofrecidos en la web" />
          <QuickLink href="/admin/blog" title="Blog institucional" description="Publicaciones y articulos" />
          <QuickLink href="/admin/galeria" title="Galeria" description="Imagenes por categoria de servicio" />
          <QuickLink href="/admin/certificaciones" title="Certificaciones" description="Documentos institucionales" />
          <QuickLink href="/admin/respaldos" title="Respaldos" description="Exportar contenido del sitio" />
        </div>
      </section>
    </SystemShell>
  );
}

function StatCard({ label, value, href, tone = "blue" }: { label: string; value: string; href: string; tone?: "blue" | "green" | "cyan" | "teal" | "purple" }) {
  const styles = {
    purple: "border-purple-200 bg-purple-50 text-purple-800",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  }[tone];
  return (
    <Link href={href} className={`rounded-lg border p-4 shadow-sm transition hover:shadow-md ${styles}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Link>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#33C3C9] hover:bg-[#F7FEFF]"
    >
      <h3 className="font-bold text-[#173C61]">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </Link>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
