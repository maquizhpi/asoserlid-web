"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SystemModulePage from "@/components/system/SystemModulePage";
import { diasRestantes, formatHiringDateTime, obtenerEstadoActividad, obtenerEstadoFecha } from "@/lib/hiringProcessUtils";
import type { AgendaActividad, HiringProcess } from "@/types/admin";

type CalendarView = "month" | "week" | "day" | "list";
type CalendarEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  processId?: string;
  processNumber: string;
  entity: string;
  status: string;
  type: "Cronograma" | "Agenda";
  priority?: AgendaActividad["prioridad"];
};

const weekDays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export default function ProcessCalendarPage() {
  const [processes, setProcesses] = useState<HiringProcess[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [filters, setFilters] = useState({ estado: "", proceso: "", tipo: "" });

  useEffect(() => {
    loadProcesses();
  }, []);

  async function loadProcesses() {
    const res = await fetch("/api/admin/hiring-processes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar procesos.");
      return;
    }
    setProcesses(data.items || []);
  }

  const events = useMemo(() => buildEvents(processes), [processes]);
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.estado && event.status !== filters.estado) return false;
      if (filters.tipo && event.type !== filters.tipo) return false;
      if (filters.proceso) {
        const text = `${event.processNumber} ${event.entity} ${event.title}`.toLowerCase();
        if (!text.includes(filters.proceso.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, filters]);

  const visibleDates = useMemo(() => getVisibleDates(cursor, view), [cursor, view]);
  const visibleEvents = useMemo(() => {
    const dateSet = new Set(visibleDates.map(toDateKey));
    if (view === "list") return [...filteredEvents].sort(sortEvents);
    return filteredEvents.filter((event) => dateSet.has(event.date)).sort(sortEvents);
  }, [filteredEvents, view, visibleDates]);

  const stats = useMemo(() => {
    const overdue = filteredEvents.filter((event) => event.status === "Vencida" || event.status === "Vencido").length;
    const next = filteredEvents.filter((event) => ["Hoy", "Proxima", "Pendiente"].includes(event.status) && diasRestantes(event.date) <= 3 && diasRestantes(event.date) >= 0).length;
    const done = filteredEvents.filter((event) => event.status === "Cumplida" || event.status === "Cumplido").length;
    return { total: filteredEvents.length, overdue, next, done };
  }, [filteredEvents]);

  function move(delta: number) {
    setCursor((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(next.getMonth() + delta);
      else if (view === "week") next.setDate(next.getDate() + delta * 7);
      else next.setDate(next.getDate() + delta);
      return next;
    });
  }

  return (
    <SystemModulePage moduleKey="process-calendar">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-4 sm:grid-cols-4">
        <Summary label="Eventos" value={String(stats.total)} />
        <Summary label="Vencidos" value={String(stats.overdue)} tone={stats.overdue ? "danger" : "normal"} />
        <Summary label="Proximos 3 dias" value={String(stats.next)} tone={stats.next ? "warning" : "normal"} />
        <Summary label="Cumplidos" value={String(stats.done)} tone="success" />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Agenda operacional</h2>
            <p className="mt-1 text-sm text-slate-600">{calendarTitle(cursor, view)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => move(-1)} className={buttonClass}>Anterior</button>
            <button onClick={() => setCursor(new Date())} className={buttonClass}>Hoy</button>
            <button onClick={() => move(1)} className={buttonClass}>Siguiente</button>
            {[
              ["month", "Mes"],
              ["week", "Semana"],
              ["day", "Dia"],
              ["list", "Lista"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setView(key as CalendarView)} className={view === key ? activeButtonClass : buttonClass}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className={inputClass} placeholder="Buscar proceso, entidad o evento..." value={filters.proceso} onChange={(e) => setFilters({ ...filters, proceso: e.target.value })} />
          <select className={inputClass} value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            {["Pendiente", "Hoy", "Proxima", "Vencida", "Cumplida", "En proceso", "Cumplido", "Vencido", "Reprogramado"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className={inputClass} value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}>
            <option value="">Cronograma y agenda</option>
            <option value="Cronograma">Solo cronograma</option>
            <option value="Agenda">Solo agenda</option>
          </select>
        </div>
      </section>

      {view === "list" ? (
        <EventList events={visibleEvents} />
      ) : (
        <CalendarGrid dates={visibleDates} events={visibleEvents} view={view} />
      )}
    </SystemModulePage>
  );
}

function CalendarGrid({ dates, events, view }: { dates: Date[]; events: CalendarEvent[]; view: CalendarView }) {
  const compact = view === "day";
  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`grid bg-slate-50 text-center text-xs font-bold uppercase tracking-[0.08em] text-slate-500 ${compact ? "grid-cols-1" : "grid-cols-7"}`}>
        {dates.map((date) => (
          <div key={toDateKey(date)} className="border-b border-r border-slate-200 px-3 py-3 last:border-r-0">
            <span>{weekDays[date.getDay()]}</span>
            <span className="ml-2 text-[#173C61]">{date.getDate()}</span>
          </div>
        ))}
      </div>
      <div className={`grid ${compact ? "grid-cols-1" : "min-h-[36rem] grid-cols-7"}`}>
        {dates.map((date) => {
          const key = toDateKey(date);
          const dayEvents = events.filter((event) => event.date === key);
          return (
            <div key={key} className="min-h-40 border-r border-slate-200 p-2 last:border-r-0">
              <div className="space-y-2">
                {dayEvents.map((event) => <EventCard key={event.id} event={event} />)}
                {dayEvents.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sin eventos</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventList({ events }: { events: CalendarEvent[] }) {
  return (
    <section className="mt-6 grid gap-3">
      {events.map((event) => <EventCard key={event.id} event={event} large />)}
      {events.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay eventos para mostrar.</p>}
    </section>
  );
}

function EventCard({ event, large = false }: { event: CalendarEvent; large?: boolean }) {
  return (
    <article className={`rounded-md border px-3 py-2 text-sm shadow-sm ${eventTone(event.status)} ${large ? "p-4" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold leading-tight">{event.title}</p>
          <p className="mt-1 text-xs font-semibold">{formatHiringDateTime(`${event.date} ${event.time || "00:00:00"}`)}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold">{event.type}</span>
      </div>
      <p className="mt-2 text-xs">{event.processNumber} | {event.entity}</p>
      {large && <p className="mt-2 text-sm opacity-80">{event.description}</p>}
      {event.processId && <Link href="/admin/procesos-contratacion" className="mt-2 inline-flex text-xs font-bold underline">Ver proceso</Link>}
    </article>
  );
}

function buildEvents(processes: HiringProcess[]): CalendarEvent[] {
  return processes.flatMap((process) => {
    const base = {
      processId: process._id,
      processNumber: process.numeroProceso || process.processNumber || "Sin numero",
      entity: process.entidadCliente || process.clientName || "Sin entidad",
    };
    const timeline = (process.cronograma || []).map((item) => {
      const [date, time = "00:00:00"] = item.fechaHora.split(" ");
      return {
        id: `${process._id}-cronograma-${item.id}`,
        date,
        time,
        title: item.tipoFecha,
        description: item.descripcion || process.objetoProceso || process.title || "",
        status: obtenerEstadoFecha(item.fechaHora, item.estado === "Cumplida"),
        type: "Cronograma" as const,
        ...base,
      };
    });
    const agenda = (process.agendaOperacional || []).map((item) => {
      const [date, time = "00:00:00"] = item.fechaHoraInicio.split(" ");
      return {
        id: `${process._id}-agenda-${item.id}`,
        date,
        time,
        title: item.titulo,
        description: item.descripcion || "",
        status: obtenerEstadoActividad(item),
        priority: item.prioridad,
        type: "Agenda" as const,
        ...base,
      };
    });
    return [...timeline, ...agenda].filter((event) => event.date);
  });
}

function getVisibleDates(cursor: Date, view: CalendarView) {
  if (view === "day") return [startOfDay(cursor)];
  if (view === "week") {
    const start = startOfDay(cursor);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function calendarTitle(cursor: Date, view: CalendarView) {
  if (view === "month") return new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(cursor);
  if (view === "day") return new Intl.DateTimeFormat("es-EC", { dateStyle: "full" }).format(cursor);
  const dates = getVisibleDates(cursor, "week");
  return `${formatShortDate(dates[0])} - ${formatShortDate(dates[6])}`;
}

function Summary({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" | "danger" | "success" }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : tone === "success" ? "text-emerald-700" : "text-[#173C61]";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function eventTone(status: string) {
  if (status === "Vencida" || status === "Vencido") return "border-red-200 bg-red-50 text-red-800";
  if (status === "Hoy" || status === "Proxima") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "Cumplida" || status === "Cumplido") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "En proceso") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
const buttonClass = "rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
const activeButtonClass = "rounded-md border border-[#173C61] bg-[#173C61] px-4 py-2 text-sm font-semibold text-white";
