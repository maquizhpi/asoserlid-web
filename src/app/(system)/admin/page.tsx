"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemShell from "@/components/system/SystemShell";
import { roleLabels } from "@/lib/userRoles";
import type { AdminOverviewItem, Client, HiringProcess, Machine, ServiceContract, SupplyKit, SupplyProduct, SupervisorReport, UserRole, Worker, WorkGroup } from "@/types/admin";

type DashboardStats = {
  activeWorkers: number;
  socios: number;
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
  activeContracts: number;
  companyStats: CompanyStats[];
};

type CompanyStats = {
  key: string;
  name: string;
  activeWorkers: number;
  socios: number;
  activeClients: number;
  activeContracts: number;
  todayReports: number;
  pendingApprovals: number;
  absences: number;
  overtimeHours: number;
  fines: number;
  activeMachines: number;
  supplyProducts: number;
  monthlyKits: number;
  activeProcesses: number;
  lateProcesses: number;
  upcomingProcesses: number;
};

type SessionUser = {
  name: string;
  email: string;
  roles: UserRole[];
  moduleAccess: string[];
};

const redirectStorageKey = "asoserlid_admin_redirect_after_login";
const executiveDashboardRoles: UserRole[] = ["administrator", "general_manager", "general_secretary", "general_accountant"];

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async (user: SessionUser, visibleModules: AdminOverviewItem[]) => {
    const visibleKeys = new Set(visibleModules.map((module) => module.key));
    const canAccess = (keys: string[]) => user.roles.includes("administrator") || keys.some((key) => visibleKeys.has(key) || user.moduleAccess.includes(key));
    const [
      workersData,
      workGroupsData,
      clientsData,
      contractsData,
      reportsData,
      processesData,
      machinesData,
      supplyProductsData,
      supplyKitsData,
      notificationsData,
    ] = await Promise.all([
      fetchJsonIf(canAccess(["workers", "labor-history"]), "/api/admin/workers"),
      fetchJsonIf(canAccess(["work-groups"]), "/api/admin/work-groups"),
      fetchJsonIf(canAccess(["clients", "contracts-shifts"]), "/api/admin/clients"),
      fetchJsonIf(canAccess(["contracts-shifts"]), "/api/admin/contracts"),
      fetchJsonIf(canAccess(["supervisor-daily-report", "report-approvals", "dashboard-supervisor", "dashboard-accounting", "accounting", "payment-calculation", "exports"]), "/api/admin/supervisor-reports"),
      fetchJsonIf(canAccess(["hiring-processes", "process-calendar", "notifications"]), "/api/admin/hiring-processes"),
      fetchJsonIf(canAccess(["machines"]), "/api/admin/machines"),
      fetchJsonIf(canAccess(["supply-products", "supply-control"]), "/api/admin/supply-products"),
      fetchJsonIf(canAccess(["supply-kits", "supply-control"]), "/api/admin/supply-kits"),
      fetchJsonIf(canAccess(["notifications"]), "/api/admin/notifications"),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const workers: Worker[] = workersData.items || [];
    const workGroups: WorkGroup[] = workGroupsData.items || [];
    const clients: Client[] = clientsData.items || [];
    const contracts: ServiceContract[] = contractsData.items || [];
    const reports: SupervisorReport[] = reportsData.items || [];
    const processes: HiringProcess[] = processesData.items || [];
    const machines: Machine[] = machinesData.items || machinesData.machines || [];
    const supplyProducts: SupplyProduct[] = supplyProductsData.items || [];
    const supplyKits: SupplyKit[] = supplyKitsData.items || [];
    const activeProcesses = processes.filter((process) => !["completed", "cancelled"].includes(process.status));
    const areaMap = new Map<string, { area: string; total: number; late: number; upcoming: number }>();
    const companyStats = buildCompanyStats({
      workGroups,
      workers,
      clients,
      contracts,
      reports,
      processes: activeProcesses,
      machines,
      supplyProducts,
      supplyKits,
      today,
    });

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
      activeWorkers: workers.filter((worker) => worker.status === "active").length,
      socios: workers.filter((worker) => worker.socio === "Si").length,
      activeClients: clients.filter((client) => client.status === "active").length,
      activeContracts: contracts.filter((contract) => contract.status === "active").length,
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
      activeMachines: machines.filter((machine) => machine.status !== "inactive").length,
      supplyProducts: supplyProducts.length,
      monthlyKits: supplyKits.length,
      activeNotifications: (notificationsData.items || []).filter((notification: { status?: string }) => notification.status === "active").length,
      areaIndicators: Array.from(areaMap.values()).sort((a, b) => b.total - a.total),
      companyStats,
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

  const canViewExecutiveDashboard = Boolean(sessionUser?.roles.some((role) => executiveDashboardRoles.includes(role)));

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

      {dashboardStats && canViewExecutiveDashboard && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Trabajadores activos" value={String(dashboardStats.activeWorkers)} tone="blue" />
          <StatCard label="Socios" value={String(dashboardStats.socios)} tone="green" />
          <StatCard label="Clientes activos" value={String(dashboardStats.activeClients)} tone="green" />
          <StatCard label="Contratos activos" value={String(dashboardStats.activeContracts)} tone="blue" />
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

      {dashboardStats && canViewExecutiveDashboard && (
        <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_24rem]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Procesos activos" value={String(dashboardStats.activeProcesses)} />
              <StatCard label="Procesos vencidos" value={String(dashboardStats.lateProcesses)} tone={dashboardStats.lateProcesses ? "danger" : "normal"} />
              <StatCard label="Vencen en 7 dias" value={String(dashboardStats.upcomingProcesses)} tone={dashboardStats.upcomingProcesses ? "warning" : "normal"} />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <MetricBars
                title="Trabajadores por empresa"
                rows={dashboardStats.companyStats.map((company) => ({ key: company.key, label: company.name, value: company.activeWorkers }))}
              />
              <MetricBars
                title="Reportes pendientes por empresa"
                rows={dashboardStats.companyStats.map((company) => ({ key: company.key, label: company.name, value: company.pendingApprovals }))}
                tone="warning"
              />
            </div>
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

      {dashboardStats && canViewExecutiveDashboard && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#173C61]">Metricas por empresa</h2>
              <p className="mt-1 text-sm text-slate-500">Cada empresa creada en el submodulo Empresas aparece automaticamente aqui.</p>
            </div>
            <span className="rounded-full bg-[#E6F8F9] px-3 py-1 text-xs font-bold text-[#173C61]">
              {dashboardStats.companyStats.length} empresa(s)
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {dashboardStats.companyStats.map((company, index) => (
              <CompanyMetrics key={`${company.key}-${index}`} company={company} />
            ))}
            {dashboardStats.companyStats.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">Sin empresas registradas.</p>}
          </div>
        </section>
      )}

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

function CompanyMetrics({ company }: { company: CompanyStats }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-[#173C61]">{company.name}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {company.activeWorkers} trabajadores | {company.activeClients} clientes | {company.activeContracts} contratos
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Abrir metricas</span>
        </div>
      </summary>
      <div className="border-t border-slate-100 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Trabajadores activos" value={String(company.activeWorkers)} tone="blue" />
          <StatCard label="Socios" value={String(company.socios)} tone="green" />
          <StatCard label="Clientes activos" value={String(company.activeClients)} tone="green" />
          <StatCard label="Contratos activos" value={String(company.activeContracts)} tone="blue" />
          <StatCard label="Asistencia hoy" value={String(company.todayReports)} tone="cyan" />
          <StatCard label="Pendientes aprobacion" value={String(company.pendingApprovals)} tone={company.pendingApprovals ? "warning" : "green"} />
          <StatCard label="Faltas" value={String(company.absences)} tone={company.absences ? "danger" : "normal"} />
          <StatCard label="Horas extras" value={company.overtimeHours.toFixed(2)} tone="green" />
          <StatCard label="Multas" value={`$ ${company.fines.toFixed(2)}`} tone={company.fines ? "danger" : "normal"} />
          <StatCard label="Equipos activos" value={String(company.activeMachines)} tone="blue" />
          <StatCard label="Productos insumos" value={String(company.supplyProducts)} tone="green" />
          <StatCard label="Kits mensuales" value={String(company.monthlyKits)} tone="cyan" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Procesos activos" value={String(company.activeProcesses)} />
          <StatCard label="Procesos vencidos" value={String(company.lateProcesses)} tone={company.lateProcesses ? "danger" : "normal"} />
          <StatCard label="Vencen en 7 dias" value={String(company.upcomingProcesses)} tone={company.upcomingProcesses ? "warning" : "normal"} />
        </div>
      </div>
    </details>
  );
}

function MetricBars({ title, rows, tone = "blue" }: { title: string; rows: { key: string; label: string; value: number }[]; tone?: "blue" | "warning" }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const barClass = tone === "warning" ? "bg-amber-500" : "bg-[#218F93]";
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">
        {rows.slice(0, 8).map((row, index) => (
          <div key={`${row.key}-${index}`} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-semibold text-[#173C61]">{row.label}</span>
              <span className="font-bold text-slate-600">{row.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-500">Sin datos.</p>}
      </div>
    </section>
  );
}

function buildCompanyStats({
  workGroups,
  workers,
  clients,
  contracts,
  reports,
  processes,
  machines,
  supplyProducts,
  supplyKits,
  today,
}: {
  workGroups: WorkGroup[];
  workers: Worker[];
  clients: Client[];
  contracts: ServiceContract[];
  reports: SupervisorReport[];
  processes: HiringProcess[];
  machines: Machine[];
  supplyProducts: SupplyProduct[];
  supplyKits: SupplyKit[];
  today: string;
}) {
  const companies = new Map<string, CompanyStats>();
  const clientCompanyKeys = new Map<string, string>();
  const contractCompanyKeys = new Map<string, string>();

  const ensureCompany = (key: string, name: string) => {
    const normalizedKey = key || normalizeCompanyKey(name) || "sin-empresa";
    const normalizedName = name || "Sin empresa";
    const current = companies.get(normalizedKey);
    if (current) return current;

    const next: CompanyStats = {
      key: normalizedKey,
      name: normalizedName,
      activeWorkers: 0,
      socios: 0,
      activeClients: 0,
      activeContracts: 0,
      todayReports: 0,
      pendingApprovals: 0,
      absences: 0,
      overtimeHours: 0,
      fines: 0,
      activeMachines: 0,
      supplyProducts: 0,
      monthlyKits: 0,
      activeProcesses: 0,
      lateProcesses: 0,
      upcomingProcesses: 0,
    };
    companies.set(normalizedKey, next);
    return next;
  };

  workGroups.forEach((group) => {
    ensureCompany(companyKey(group._id, group.name), group.commercialName || group.name || "Sin empresa");
  });

  clients.forEach((client) => {
    const company = ensureCompany(companyKey(client.workGroupId, client.workGroupName), client.workGroupName || "Sin empresa");
    if (client._id) clientCompanyKeys.set(client._id, company.key);
    if (client.name) clientCompanyKeys.set(client.name, company.key);
    if (client.status === "active") company.activeClients += 1;
  });

  contracts.forEach((contract) => {
    const company = ensureCompany(companyKey(contract.workGroupId, contract.workGroupName), contract.workGroupName || "Sin empresa");
    if (contract._id) contractCompanyKeys.set(contract._id, company.key);
    if (contract.clientName) clientCompanyKeys.set(contract.clientName, company.key);
    if (contract.status === "active") company.activeContracts += 1;
  });

  workers.forEach((worker) => {
    const company = ensureCompany(companyKey(worker.workGroupId, worker.workGroupName), worker.workGroupName || "Sin empresa");
    if (worker.status === "active") company.activeWorkers += 1;
    if (worker.socio === "Si") company.socios += 1;
  });

  reports.forEach((report) => {
    const company = ensureCompany(companyKey(report.workGroupId, report.workGroupName), report.workGroupName || "Sin empresa");
    if (report.date === today) company.todayReports += 1;
    if (["draft", "submitted", "observed"].includes(report.reportStatus || "draft")) company.pendingApprovals += 1;
    if (report.attendanceStatus === "absent") company.absences += 1;
    company.overtimeHours += Number(report.overtimeHours || 0);
    company.fines += Number(report.fineAmount || 0);
  });

  machines.forEach((machine) => {
    const company = ensureCompany(companyKey(machine.ownerWorkGroupId, machine.ownerWorkGroupName), machine.ownerWorkGroupName || "Sin empresa");
    if (machine.status !== "inactive") company.activeMachines += 1;
  });

  supplyProducts.forEach((product) => {
    const company = ensureCompany(companyKey(product.workGroupId, product.workGroupName), product.workGroupName || "Sin empresa");
    company.supplyProducts += 1;
  });

  supplyKits.forEach((kit) => {
    const key = kit.contractId ? contractCompanyKeys.get(kit.contractId) : undefined;
    const fallbackKey = key || clientCompanyKeys.get(kit.clientName);
    const company = fallbackKey ? companies.get(fallbackKey) || ensureCompany(fallbackKey, kit.clientName) : ensureCompany("", kit.clientName || "Sin empresa");
    company.monthlyKits += 1;
  });

  processes.forEach((process) => {
    const processCompanyKeys = process.workGroups?.length
      ? process.workGroups.map((group) => companyKey(group.id, group.name))
      : [companyKey(process.workGroupId, process.workGroupName)];
    const uniqueKeys = Array.from(new Set(processCompanyKeys.filter(Boolean)));
    const keys = uniqueKeys.length ? uniqueKeys : ["sin-empresa"];
    const days = daysUntil(process.dueDate, today);

    keys.forEach((key) => {
      const name = process.workGroups?.find((group) => companyKey(group.id, group.name) === key)?.name || process.workGroupName || "Sin empresa";
      const company = ensureCompany(key, name);
      company.activeProcesses += 1;
      company.lateProcesses += days < 0 ? 1 : 0;
      company.upcomingProcesses += days >= 0 && days <= 7 ? 1 : 0;
    });
  });

  return Array.from(companies.values()).sort((a, b) => b.activeWorkers + b.activeClients + b.activeContracts - (a.activeWorkers + a.activeClients + a.activeContracts));
}

function companyKey(id?: string, name?: string) {
  return id || normalizeCompanyKey(name || "");
}

function normalizeCompanyKey(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function daysUntil(date: string, today: string) {
  const start = Date.parse(`${today}T00:00:00`);
  const end = Date.parse(`${date}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

async function fetchJsonIf(allowed: boolean, url: string) {
  if (!allowed) return {};
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return {};
  return response.json().catch(() => ({}));
}

function formatRoles(roles: UserRole[]) {
  return roles.map((role) => roleLabels[role] || role).join(", ");
}
