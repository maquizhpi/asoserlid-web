"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SystemModulePage from "@/components/system/SystemModulePage";
import { obtenerEstadoActividad, obtenerEstadoFecha, proximaFechaImportante } from "@/lib/hiringProcessUtils";
import type { AgendaActividad, HiringProcess, HiringProcessWorkGroup } from "@/types/admin";

type FilterState = {
  query: string;
  company: string;
  status: string;
};

type ProcessProgress = {
  process: HiringProcess;
  groups: HiringProcessWorkGroup[];
  progress: number;
  timelineDone: number;
  timelineTotal: number;
  agendaDone: number;
  agendaTotal: number;
  overdueItems: number;
  nextLabel: string;
};

type CompanyMetric = {
  id: string;
  name: string;
  logoUrl?: string;
  processes: CompanyProcessProgress[];
  total: number;
  active: number;
  completed: number;
  overdue: number;
  averageProgress: number;
};

type CompanyProcessProgress = {
  process: HiringProcess;
  group: HiringProcessWorkGroup;
  progress: number;
  agendaDone: number;
  agendaTotal: number;
  overdueItems: number;
};

const finalStatuses = ["Adjudicado", "Desierto", "Cancelado", "Finalizado"];

export default function ProcessTrackingPage() {
  const [processes, setProcesses] = useState<HiringProcess[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ query: "", company: "", status: "" });

  useEffect(() => {
    loadProcesses();
  }, []);

  async function loadProcesses() {
    const res = await fetch("/api/admin/hiring-processes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar el seguimiento de procesos.");
      return;
    }
    setProcesses(data.items || []);
  }

  const progressItems = useMemo(() => processes.map(buildProcessProgress), [processes]);
  const filteredItems = useMemo(() => {
    return progressItems.filter((item) => {
      const searchable = [
        item.process.numeroProceso,
        item.process.entidadCliente,
        item.process.objetoProceso,
        item.groups.map((group) => group.name).join(" "),
      ].join(" ").toLowerCase();
      if (filters.query && !searchable.includes(filters.query.toLowerCase())) return false;
      if (filters.status && item.process.estadoProceso !== filters.status) return false;
      if (filters.company && !item.groups.some((group) => companyKey(group) === filters.company)) return false;
      return true;
    });
  }, [filters, progressItems]);

  const companyMetrics = useMemo(() => buildCompanyMetrics(filteredItems), [filteredItems]);
  const allCompanies = useMemo(() => buildCompanyMetrics(progressItems).map((company) => ({ key: company.id, name: company.name })), [progressItems]);
  const summary = useMemo(() => {
    const total = filteredItems.length;
    const average = total ? Math.round(filteredItems.reduce((sum, item) => sum + item.progress, 0) / total) : 0;
    const overdue = filteredItems.filter((item) => item.overdueItems > 0 || item.process.estadoProceso === "Vencido").length;
    const completed = filteredItems.filter((item) => finalStatuses.includes(item.process.estadoProceso)).length;
    return { total, average, overdue, completed };
  }, [filteredItems]);

  return (
    <SystemModulePage moduleKey="process-tracking">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Procesos visibles" value={String(summary.total)} />
        <Summary label="Avance promedio" value={`${summary.average}%`} tone={summary.average >= 70 ? "success" : summary.average >= 35 ? "warning" : "normal"} />
        <Summary label="Con atrasos" value={String(summary.overdue)} tone={summary.overdue ? "danger" : "success"} />
        <Summary label="Cerrados" value={String(summary.completed)} />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_16rem_14rem]">
          <input
            className={inputClass}
            placeholder="Buscar proceso, entidad o empresa..."
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          />
          <select className={inputClass} value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })}>
            <option value="">Todas las empresas</option>
            {allCompanies.map((company) => <option key={company.key} value={company.key}>{company.name}</option>)}
          </select>
          <select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Todos los estados</option>
            {["Planificado", "En seguimiento", "Por vencer", "Vencido", "Adjudicado", "Desierto", "Cancelado", "Finalizado"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Avance por empresa participante</h2>
            <p className="mt-1 text-sm text-slate-600">Cada edificio representa el promedio de avance de los procesos asignados.</p>
          </div>
          <span className="text-sm font-bold text-slate-500">{companyMetrics.length} empresa(s)</span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {companyMetrics.map((company) => <CompanyBuilding key={company.id} company={company} />)}
          {companyMetrics.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay procesos para los filtros seleccionados.</p>}
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {filteredItems.map((item) => <ProcessCard key={item.process._id || item.process.numeroProceso} item={item} />)}
        {filteredItems.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay procesos en seguimiento.</p>}
      </section>
    </SystemModulePage>
  );
}

function CompanyBuilding({ company }: { company: CompanyMetric }) {
  const filledFloors = Math.max(0, Math.min(10, Math.round(company.averageProgress / 10)));
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1" />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#173C61] text-sm font-black text-white">{company.name.slice(0, 2).toUpperCase()}</div>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-bold text-[#173C61]">{company.name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{company.total} proceso(s) asignado(s)</p>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div className="grid h-40 w-20 grid-cols-2 gap-1 rounded-t-md border border-[#173C61]/20 bg-white p-2 shadow-inner">
          {Array.from({ length: 10 }, (_, index) => {
            const floor = 10 - index;
            const active = floor <= filledFloors;
            return <span key={floor} className={`rounded-sm ${active ? "bg-[#218F93]" : "bg-slate-200"}`} />;
          })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-black text-[#173C61]">{company.averageProgress}%</p>
          <div className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
            <p>Activos: {company.active}</p>
            <p>Cerrados: {company.completed}</p>
            <p className={company.overdue ? "text-red-700" : ""}>Con atrasos: {company.overdue}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProcessCard({ item }: { item: ProcessProgress }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#173C61]">{item.process.numeroProceso || "Sin numero"}</h3>
            <span className={statusClass(item.process.estadoProceso)}>{item.process.estadoProceso}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-700">{item.process.entidadCliente || "Sin entidad"}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.process.objetoProceso || "Sin objeto registrado."}</p>
        </div>
        <Link href="/admin/procesos-contratacion" className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-50">
          Ver proceso
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="flex items-center justify-between text-sm font-bold text-[#173C61]">
            <span>Avance general</span>
            <span>{item.progress}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${item.progress >= 70 ? "bg-[#218F93]" : item.progress >= 35 ? "bg-amber-500" : "bg-[#173C61]"}`} style={{ width: `${item.progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.groups.map((group) => (
              <span key={companyKey(group)} className="rounded-full bg-[#E6F8F9] px-3 py-1 text-xs font-bold text-[#173C61]">{group.name}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MiniMetric label="Cronograma" value={`${item.timelineDone}/${item.timelineTotal}`} />
          <MiniMetric label="Agenda" value={`${item.agendaDone}/${item.agendaTotal}`} />
          <MiniMetric label="Atrasos" value={String(item.overdueItems)} danger={item.overdueItems > 0} />
          <MiniMetric label="Proxima fecha" value={item.nextLabel} />
        </div>
      </div>
    </article>
  );
}

function Summary({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" | "danger" | "success" }) {
  const styles = {
    normal: "border-slate-200 bg-white text-[#173C61]",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tone];
  return (
    <article className={`rounded-lg border p-4 shadow-sm ${styles}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}

function MiniMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold">{value}</p>
    </div>
  );
}

function buildProcessProgress(process: HiringProcess): ProcessProgress {
  const timeline = process.cronograma || [];
  const agenda = process.agendaOperacional || [];
  const timelineDone = timeline.filter((item) => obtenerEstadoFecha(item.fechaHora, item.estado === "Cumplida") === "Cumplida").length;
  const agendaDone = agenda.filter((item) => obtenerEstadoActividad(item) === "Cumplido").length;
  const overdueTimeline = timeline.filter((item) => obtenerEstadoFecha(item.fechaHora, item.estado === "Cumplida") === "Vencida").length;
  const overdueAgenda = agenda.filter((item) => obtenerEstadoActividad(item) === "Vencido").length;
  const progress = calculateProgress(process, timelineDone, timeline.length, agendaDone, agenda.length);
  const next = proximaFechaImportante(process);
  return {
    process,
    groups: getProcessGroups(process),
    progress,
    timelineDone,
    timelineTotal: timeline.length,
    agendaDone,
    agendaTotal: agenda.length,
    overdueItems: overdueTimeline + overdueAgenda,
    nextLabel: next?.fechaHora?.slice(0, 10) || "Sin fecha",
  };
}

function calculateProgress(process: HiringProcess, timelineDone: number, timelineTotal: number, agendaDone: number, agendaTotal: number) {
  if (["Adjudicado", "Finalizado"].includes(process.estadoProceso)) return 100;
  if (["Desierto", "Cancelado"].includes(process.estadoProceso)) return Math.round(((timelineDone + agendaDone) / Math.max(1, timelineTotal + agendaTotal)) * 100);
  if (!timelineTotal && !agendaTotal) return process.estadoProceso === "Planificado" ? 0 : 10;
  const timelineWeight = timelineTotal ? (timelineDone / timelineTotal) * 60 : 0;
  const agendaWeight = agendaTotal ? (agendaDone / agendaTotal) * 40 : timelineTotal ? 0 : 40;
  return Math.max(0, Math.min(100, Math.round(timelineWeight + agendaWeight)));
}

function buildCompanyMetrics(items: ProcessProgress[]) {
  const metrics = new Map<string, CompanyMetric>();
  for (const item of items) {
    for (const group of item.groups) {
      const key = companyKey(group);
      const companyProcess = buildCompanyProcessProgress(item.process, group);
      const current = metrics.get(key) || {
        id: key,
        name: group.name,
        logoUrl: group.logoUrl,
        processes: [],
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        averageProgress: 0,
      };
      current.processes.push(companyProcess);
      metrics.set(key, current);
    }
  }

  return Array.from(metrics.values())
    .map((company) => {
      const total = company.processes.length;
      const completed = company.processes.filter((item) => finalStatuses.includes(item.process.estadoProceso)).length;
      const overdue = company.processes.filter((item) => item.overdueItems > 0 || item.process.estadoProceso === "Vencido").length;
      return {
        ...company,
        total,
        active: total - completed,
        completed,
        overdue,
        averageProgress: total ? Math.round(company.processes.reduce((sum, item) => sum + item.progress, 0) / total) : 0,
      };
    })
    .sort((a, b) => b.averageProgress - a.averageProgress || b.total - a.total);
}

function buildCompanyProcessProgress(process: HiringProcess, group: HiringProcessWorkGroup): CompanyProcessProgress {
  const agenda = getActivitiesForGroup(process.agendaOperacional || [], group);
  const agendaDone = agenda.filter((item) => obtenerEstadoActividad(item) === "Cumplido").length;
  const overdueItems = agenda.filter((item) => obtenerEstadoActividad(item) === "Vencido").length;
  return {
    process,
    group,
    progress: calculateCompanyProgress(process, agendaDone, agenda.length),
    agendaDone,
    agendaTotal: agenda.length,
    overdueItems,
  };
}

function calculateCompanyProgress(process: HiringProcess, agendaDone: number, agendaTotal: number) {
  if (["Adjudicado", "Finalizado"].includes(process.estadoProceso)) return 100;
  if (!agendaTotal) return 0;
  return Math.max(0, Math.min(100, Math.round((agendaDone / agendaTotal) * 100)));
}

function getActivitiesForGroup(activities: AgendaActividad[], group: HiringProcessWorkGroup) {
  return activities.filter((activity) => activityBelongsToGroup(activity, group));
}

function activityBelongsToGroup(activity: AgendaActividad, group: HiringProcessWorkGroup) {
  if (!activity.workGroupId && !activity.workGroupName) return false;
  return Boolean(
    (activity.workGroupId && group.id && activity.workGroupId === group.id)
    || (activity.workGroupName && activity.workGroupName === group.name)
  );
}

function getProcessGroups(process: HiringProcess): HiringProcessWorkGroup[] {
  if (process.workGroups?.length) return process.workGroups.filter((group) => group.id || group.name);
  if (process.workGroupId || process.workGroupName) return [{ id: process.workGroupId || "", name: process.workGroupName || "Sin empresa asignada" }];
  return [{ id: "unassigned", name: "Sin empresa asignada" }];
}

function companyKey(group: HiringProcessWorkGroup) {
  return group.id || group.name || "unassigned";
}

function statusClass(status: string) {
  if (status === "Vencido") return "rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700";
  if (status === "Por vencer") return "rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700";
  if (finalStatuses.includes(status)) return "rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700";
  return "rounded-full bg-[#E6F8F9] px-2 py-1 text-xs font-bold text-[#173C61]";
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
