"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemShell from "@/components/system/SystemShell";
import type { AdminOverviewItem, HiringProcess } from "@/types/admin";

type DashboardStats = {
  activeWorkers: number;
  todayReports: number;
  absences: number;
  overtimeHours: number;
  fines: number;
  activeClients: number;
  activeProcesses: number;
  lateProcesses: number;
  upcomingProcesses: number;
  areaIndicators: { area: string; total: number; late: number; upcoming: number }[];
};

const redirectStorageKey = "asoserlid_admin_redirect_after_login";

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [modules, setModules] = useState<AdminOverviewItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async () => {
    const [workersRes, clientsRes, reportsRes, processesRes] = await Promise.all([
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/supervisor-reports", { cache: "no-store" }),
      fetch("/api/admin/hiring-processes", { cache: "no-store" }),
    ]);
    const workersData = await workersRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const reportsData = await reportsRes.json().catch(() => ({}));
    const processesData = await processesRes.json().catch(() => ({}));
    const today = new Date().toISOString().slice(0, 10);
    const reports = reportsRes.ok ? reportsData.items || [] : [];
    const processes: HiringProcess[] = processesRes.ok ? processesData.items || [] : [];
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
      activeWorkers: workersRes.ok ? (workersData.items || []).filter((worker: { status?: string }) => worker.status === "active").length : 0,
      activeClients: clientsRes.ok ? (clientsData.items || []).filter((client: { status?: string }) => client.status === "active").length : 0,
      todayReports: reports.filter((report: { date?: string }) => report.date === today).length,
      absences: reports.filter((report: { attendanceStatus?: string }) => report.attendanceStatus === "absent").length,
      overtimeHours: reports.reduce((sum: number, report: { overtimeHours?: number }) => sum + Number(report.overtimeHours || 0), 0),
      fines: reports.reduce((sum: number, report: { fineAmount?: number }) => sum + Number(report.fineAmount || 0), 0),
      activeProcesses: activeProcesses.length,
      lateProcesses: activeProcesses.filter((process) => daysUntil(process.dueDate, today) < 0).length,
      upcomingProcesses: activeProcesses.filter((process) => {
        const days = daysUntil(process.dueDate, today);
        return days >= 0 && days <= 7;
      }).length,
      areaIndicators: Array.from(areaMap.values()).sort((a, b) => b.total - a.total),
    });
  }, []);

  const loadModules = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const res = await fetch("/api/admin/modules", { cache: "no-store" });
    if (res.status === 401) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar el sistema.");
      setLoading(false);
      return;
    }

    setModules(data.modules || []);
    setAuthenticated(true);
    await loadDashboardStats();
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
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-16">
        <form onSubmit={submitLogin} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#218F93]">Sistema interno</p>
          <h1 className="mt-1 text-2xl font-bold text-[#173C61]">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-slate-600">Acceso para administracion y operacion de ASOSERLID.</p>

          <label className="mt-6 grid gap-2 text-sm font-semibold text-slate-700">
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

          <button className="mt-6 w-full rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">
            Ingresar
          </button>

          {status && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{status}</p>}
          <Link href="/" className="mt-4 block text-center text-sm font-semibold text-[#173C61] hover:text-[#218F93]">
            Volver al sitio web
          </Link>
        </form>
      </main>
    );
  }

  return (
    <SystemShell title="Sistema administrativo" subtitle="Modulos internos obligatorios para operacion, control y reportes.">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      {dashboardStats && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Trabajadores activos" value={String(dashboardStats.activeWorkers)} />
          <StatCard label="Asistencia diaria" value={String(dashboardStats.todayReports)} />
          <StatCard label="Faltas" value={String(dashboardStats.absences)} />
          <StatCard label="Horas extras" value={dashboardStats.overtimeHours.toFixed(2)} />
          <StatCard label="Multas" value={`$ ${dashboardStats.fines.toFixed(2)}`} />
          <StatCard label="Clientes activos" value={String(dashboardStats.activeClients)} />
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

function StatCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-[#173C61]";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
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
          <Link
            key={module.key}
            href={module.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#33C3C9] hover:bg-[#F7FEFF]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-[#173C61]">{module.title}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {module.required ? "Obligatorio" : "Opcional"}
              </span>
            </div>
            <p className="mt-2 min-h-10 text-sm text-slate-600">{module.description}</p>
            <p className="mt-4 text-sm font-semibold text-[#218F93]">Abrir modulo</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
