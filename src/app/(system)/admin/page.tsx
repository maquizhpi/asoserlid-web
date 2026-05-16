"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemShell from "@/components/system/SystemShell";
import { roleLabels } from "@/lib/userRoles";
import type { AdminOverviewItem, HiringProcess, UserRole } from "@/types/admin";

type DashboardStats = {
  activeWorkers: number;
  todayReports: number;
  submittedReports: number;
  approvedReports: number;
  observedReports: number;
  pendingApprovals: number;
  absences: number;
  permissions: number;
  sickness: number;
  overtimeHours: number;
  fines: number;
  activeClients: number;
  activeProcesses: number;
  lateProcesses: number;
  upcomingProcesses: number;
  activeMachines: number;
  supplyProducts: number;
  monthlyKits: number;
  activeNotifications: number;
  areaIndicators: { area: string; total: number; late: number; upcoming: number }[];
};

type SessionUser = {
  name: string;
  email: string;
  roles: UserRole[];
  moduleAccess: string[];
};

const redirectStorageKey = "asoserlid_admin_redirect_after_login";

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [modules, setModules] = useState<AdminOverviewItem[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async (user: SessionUser, visibleModules: AdminOverviewItem[]) => {
    const visibleKeys = new Set(visibleModules.map((module) => module.key));
    const canAccess = (keys: string[]) => user.roles.includes("administrator") || keys.some((key) => visibleKeys.has(key) || user.moduleAccess.includes(key));
    const [
      workersData,
      clientsData,
      reportsData,
      processesData,
      machinesData,
      supplyProductsData,
      supplyKitsData,
      notificationsData,
    ] = await Promise.all([
      fetchJsonIf(canAccess(["workers", "labor-history"]), "/api/admin/workers"),
      fetchJsonIf(canAccess(["clients", "contracts-shifts"]), "/api/admin/clients"),
      fetchJsonIf(canAccess(["supervisor-daily-report", "report-approvals", "dashboard-supervisor", "dashboard-accounting", "accounting", "payment-calculation", "exports"]), "/api/admin/supervisor-reports"),
      fetchJsonIf(canAccess(["hiring-processes", "process-calendar", "notifications"]), "/api/admin/hiring-processes"),
      fetchJsonIf(canAccess(["machines"]), "/api/admin/machines"),
      fetchJsonIf(canAccess(["supply-products", "supply-control"]), "/api/admin/supply-products"),
      fetchJsonIf(canAccess(["supply-kits", "supply-control"]), "/api/admin/supply-kits"),
      fetchJsonIf(canAccess(["notifications"]), "/api/admin/notifications"),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const reports = reportsData.items || [];
    const processes: HiringProcess[] = processesData.items || [];
    const activeProcesses = processes.filter((process) => !["completed", "cancelled"].includes(process.status));
    const areaMap = new Map<string, { area: string; total: number; late: number; upcoming: number }>();

    activeProcesses.forEach((process) => {
      const area = process.area || "Sin area";
      const days = daysUntil(process.dueDate, today);
      const current = areaMap.get(area) || { area, total: 0, late: 0, upcoming: 0 };
      current.total += 1;
      current.late += days < 0 ? 1 : 0;
      current.upcoming += days >= 0 && days <= 7 ? 1 : 0;
      areaMap.set(area, current);
    });

    setDashboardStats({
      activeWorkers: (workersData.items || []).filter((worker: { status?: string }) => worker.status === "active").length,
      activeClients: (clientsData.items || []).filter((client: { status?: string }) => client.status === "active").length,
      todayReports: reports.filter((report: { date?: string }) => report.date === today).length,
      submittedReports: reports.filter((report: { reportStatus?: string }) => report.reportStatus === "submitted").length,
      approvedReports: reports.filter((report: { reportStatus?: string }) => report.reportStatus === "approved").length,
      observedReports: reports.filter((report: { reportStatus?: string }) => report.reportStatus === "observed").length,
      pendingApprovals: reports.filter((report: { reportStatus?: string }) => ["draft", "submitted", "observed"].includes(report.reportStatus || "draft")).length,
      absences: reports.filter((report: { attendanceStatus?: string }) => report.attendanceStatus === "absent").length,
      permissions: reports.filter((report: { attendanceStatus?: string }) => report.attendanceStatus === "permission").length,
      sickness: reports.filter((report: { attendanceStatus?: string }) => report.attendanceStatus === "sick").length,
      overtimeHours: reports.reduce((sum: number, report: { overtimeHours?: number }) => sum + Number(report.overtimeHours || 0), 0),
      fines: reports.reduce((sum: number, report: { fineAmount?: number }) => sum + Number(report.fineAmount || 0), 0),
      activeProcesses: activeProcesses.length,
      lateProcesses: activeProcesses.filter((process) => daysUntil(process.dueDate, today) < 0).length,
      upcomingProcesses: activeProcesses.filter((process) => {
        const days = daysUntil(process.dueDate, today);
        return days >= 0 && days <= 7;
      }).length,
      activeMachines: (machinesData.items || machinesData.machines || []).filter((machine: { status?: string }) => machine.status !== "inactive").length,
      supplyProducts: (supplyProductsData.items || []).length,
      monthlyKits: (supplyKitsData.items || []).length,
      activeNotifications: (notificationsData.items || []).filter((notification: { status?: string }) => notification.status === "active").length,
      areaIndicators: Array.from(areaMap.values()).sort((a, b) => b.total - a.total),
    });
  }, []);

  const loadModules = useCallback(async () => {
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

    const data = await modulesRes.json().catch(() => ({}));
    const meData = await meRes.json().catch(() => ({}));
    if (!modulesRes.ok || !meRes.ok) {
      setStatus(data.error || "No se pudo cargar el sistema.");
      setLoading(false);
      return;
    }

    const visibleModules = data.modules || [];
    setModules(visibleModules);
    setSessionUser(meData.user || null);
    setAuthenticated(true);
    if (meData.user) await loadDashboardStats(meData.user, visibleModules);
    setLoading(false);
  }, [loadDashboardStats]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

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
    await loadModules();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <p className="mx-auto max-w-6xl text-slate-600">Cargando sistema...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0f2742] px-4 py-8">
        <img
          src="/sistema-sit.png"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-55 blur-[2px]"
        />
        <div className="absolute inset-0 bg-[#0f2742]/50" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f2742] via-[#0f2742]/60 to-transparent" />
        <div className="absolute left-[-12rem] top-[-10rem] h-96 w-96 rounded-full bg-[#33C3C9]/25 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full bg-[#7AC143]/20 blur-3xl" />

        <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-xl border border-white/25 bg-white shadow-2xl md:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={submitLogin} className="bg-white px-6 py-8 sm:px-10 sm:py-12">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#218F93]">SIT</p>
              <h1 className="mt-2 text-3xl font-bold text-[#173C61]">Iniciar sesion</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Sistema Integrado de Trabajo para administracion y operacion.</p>
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
              src="/sistema-sit.png"
              alt="SIT Sistema Integrado de Trabajo"
              className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#173C61]/75 via-[#173C61]/35 to-[#218F93]/20" />
            <div className="absolute inset-x-8 bottom-8 rounded-lg border border-white/25 bg-white/15 p-6 text-center text-white shadow-2xl backdrop-blur-md">
              <h2 className="text-4xl font-bold">Bienvenido</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/90">Organizacion, eficiencia y compromiso para el control diario del trabajo.</p>
              <div className="mt-5 grid grid-cols-4 gap-2 text-xs font-bold uppercase tracking-[0.08em] text-white/85">
                <span>Control</span>
                <span>Gestion</span>
                <span>Procesos</span>
                <span>Personas</span>
              </div>
            </div>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <SystemShell title="Sistema Integrado de Trabajo" subtitle="Dashboard principal y funciones asignadas a tu usuario.">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#173C61] via-[#218F93] to-[#7AC143] px-5 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Panel principal</p>
          <h2 className="mt-2 text-2xl font-bold">Bienvenido{sessionUser?.name ? `, ${sessionUser.name}` : ""}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">
            Acceso activo para {sessionUser ? formatRoles(sessionUser.roles) : "tu usuario"}. Solo se muestran las funciones que tienes asignadas.
          </p>
        </div>
      </section>

      {dashboardStats && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Trabajadores activos" value={String(dashboardStats.activeWorkers)} tone="blue" />
          <StatCard label="Clientes activos" value={String(dashboardStats.activeClients)} tone="green" />
          <StatCard label="Asistencia hoy" value={String(dashboardStats.todayReports)} tone="cyan" />
          <StatCard label="Pendientes aprobacion" value={String(dashboardStats.pendingApprovals)} tone={dashboardStats.pendingApprovals ? "warning" : "green"} />
          <StatCard label="Reportes enviados" value={String(dashboardStats.submittedReports)} tone="blue" />
          <StatCard label="Reportes aprobados" value={String(dashboardStats.approvedReports)} tone="green" />
          <StatCard label="Reportes observados" value={String(dashboardStats.observedReports)} tone={dashboardStats.observedReports ? "warning" : "normal"} />
          <StatCard label="Notificaciones activas" value={String(dashboardStats.activeNotifications)} tone={dashboardStats.activeNotifications ? "cyan" : "normal"} />
          <StatCard label="Faltas" value={String(dashboardStats.absences)} tone={dashboardStats.absences ? "danger" : "normal"} />
          <StatCard label="Permisos" value={String(dashboardStats.permissions)} tone="blue" />
          <StatCard label="Enfermedad" value={String(dashboardStats.sickness)} tone="cyan" />
          <StatCard label="Horas extras" value={dashboardStats.overtimeHours.toFixed(2)} tone="green" />
          <StatCard label="Multas" value={`$ ${dashboardStats.fines.toFixed(2)}`} tone={dashboardStats.fines ? "danger" : "normal"} />
          <StatCard label="Equipos activos" value={String(dashboardStats.activeMachines)} tone="blue" />
          <StatCard label="Productos insumos" value={String(dashboardStats.supplyProducts)} tone="green" />
          <StatCard label="Kits mensuales" value={String(dashboardStats.monthlyKits)} tone="cyan" />
        </section>
      )}

      {dashboardStats && (
        <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_24rem]">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Procesos activos" value={String(dashboardStats.activeProcesses)} />
            <StatCard label="Procesos vencidos" value={String(dashboardStats.lateProcesses)} tone={dashboardStats.lateProcesses ? "danger" : "normal"} />
            <StatCard label="Vencen en 7 dias" value={String(dashboardStats.upcomingProcesses)} tone={dashboardStats.upcomingProcesses ? "warning" : "normal"} />
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Indicadores por area</h2>
            <div className="mt-3 space-y-2">
              {dashboardStats.areaIndicators.slice(0, 5).map((item) => (
                <div key={item.area} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-[#173C61]">{item.area}</span>
                  <span className="text-slate-600">Total {item.total} | Vencidos {item.late} | 7 dias {item.upcoming}</span>
                </div>
              ))}
              {dashboardStats.areaIndicators.length === 0 && <p className="text-sm text-slate-500">Sin procesos activos.</p>}
            </div>
          </aside>
        </section>
      )}

      <DashboardGroup title="Contenido y auditoria" modules={modules.filter((module) => ["blog", "gallery", "certifications", "backups", "audits"].includes(module.key))} />
      <DashboardGroup title="Configuraciones" modules={modules.filter((module) => ["roles", "users", "work-groups", "catalogs", "service-types"].includes(module.key))} />
      <DashboardGroup title="Operacion" modules={modules.filter((module) => ["workers", "worker-intake", "clients", "contracts-shifts", "supervisor-daily-report", "supply-control", "hiring-processes", "accounting", "payment-calculation"].includes(module.key))} />
      <DashboardGroup title="Recursos y reportes" modules={modules.filter((module) => ["machines", "worker-documents", "supply-products", "supply-kits", "dashboard-supervisor", "dashboard-accounting", "labor-history", "process-calendar", "notifications", "report-approvals", "exports"].includes(module.key))} />
    </SystemShell>
  );
}

function StatCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" | "danger" | "blue" | "green" | "cyan" }) {
  const styles = {
    normal: "border-slate-200 bg-white text-[#173C61]",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  }[tone];
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${styles}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function daysUntil(date: string, today: string) {
  const start = Date.parse(`${today}T00:00:00`);
  const end = Date.parse(`${date}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function DashboardGroup({ title, modules }: { title: string; modules: AdminOverviewItem[] }) {
  if (!modules.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <article
            key={module.key}
            className="flex min-h-40 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#33C3C9] hover:bg-[#F7FEFF]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-[#173C61]">{module.title}</h3>
              <span className="rounded-full bg-[#E6F8F9] px-2 py-1 text-xs font-semibold text-[#173C61]">
                Asignado
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
            <Link
              href={module.href}
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[#173C61] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#218F93]"
            >
              Abrir {module.title}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

async function fetchJsonIf(allowed: boolean, url: string) {
  if (!allowed) return {};
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return {};
  return response.json().catch(() => ({}));
}

function formatRoles(roles: UserRole[]) {
  return roles.map((role) => roleLabels[role] || role).join(", ");
}
