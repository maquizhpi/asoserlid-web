"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import {
  areaOptions,
  createId,
  dateTypes,
  diasRestantes,
  formatHiringDateTime,
  fromDateTimeInput,
  generarAgendaAutomatica,
  hiringProcessStatuses,
  obtenerEstadoActividad,
  obtenerEstadoFecha,
  proximaFechaImportante,
  syncHiringAliases,
  toDateTimeInput,
} from "@/lib/hiringProcessUtils";
import type { AgendaActividad, CronogramaFecha, HiringProcess, HiringProcessStatus } from "@/types/admin";

type TabKey = "main" | "timeline" | "agenda" | "files";
type AgendaView = "list" | "calendar";

const emptyProcess: HiringProcess = syncHiringAliases({
  numeroProceso: "",
  entidadCliente: "",
  objetoProceso: "",
  tipoCompra: "",
  presupuestoReferencialSinIva: 0,
  tipoContratacion: "",
  formaPago: "",
  tipoAdjudicacion: "",
  plazoEntregaDias: 0,
  vigenciaOfertaDias: 0,
  funcionarioEncargado: "",
  areaResponsable: "Sin area",
  estadoProceso: "Planificado",
  descripcion: "",
  notas: "",
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaVencimiento: new Date().toISOString().slice(0, 10),
  cronograma: [],
  agendaOperacional: [],
  archivos: [],
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  status: "planned",
});

const emptyScheduleDate: CronogramaFecha = {
  id: "",
  tipoFecha: "Fecha de publicacion",
  fechaHora: "",
  descripcion: "",
  estado: "Pendiente",
  observacion: "",
};

const emptyActivity: AgendaActividad = {
  id: "",
  titulo: "",
  descripcion: "",
  fechaHoraInicio: "",
  fechaHoraFin: "",
  responsable: "",
  prioridad: "Media",
  estado: "Pendiente",
  origen: "Manual",
  procesoRelacionado: "",
  observaciones: "",
  fechaCumplimiento: "",
};

export default function HiringProcessesPage() {
  const [items, setItems] = useState<HiringProcess[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<HiringProcess>(emptyProcess);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("main");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<CronogramaFecha>(emptyScheduleDate);
  const [activityForm, setActivityForm] = useState<AgendaActividad>(emptyActivity);
  const [agendaView, setAgendaView] = useState<AgendaView>("list");
  const [agendaFilters, setAgendaFilters] = useState({ estado: "", prioridad: "", responsable: "", proceso: "", desde: "", hasta: "" });

  const selected = useMemo(() => items.find((item) => item._id === selectedId), [items, selectedId]);
  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const text = [item.numeroProceso, item.entidadCliente, item.objetoProceso].join(" ").toLowerCase();
      return !term || text.includes(term);
    });
  }, [items, query]);

  const visibleAgenda = useMemo(() => {
    return (form.agendaOperacional || []).filter((actividad) => {
      const start = actividad.fechaHoraInicio.slice(0, 10);
      if (agendaFilters.estado && obtenerEstadoActividad(actividad) !== agendaFilters.estado) return false;
      if (agendaFilters.prioridad && actividad.prioridad !== agendaFilters.prioridad) return false;
      if (agendaFilters.responsable && !actividad.responsable?.toLowerCase().includes(agendaFilters.responsable.toLowerCase())) return false;
      if (agendaFilters.proceso && !actividad.procesoRelacionado?.toLowerCase().includes(agendaFilters.proceso.toLowerCase())) return false;
      if (agendaFilters.desde && start < agendaFilters.desde) return false;
      if (agendaFilters.hasta && start > agendaFilters.hasta) return false;
      return true;
    }).sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
  }, [agendaFilters, form.agendaOperacional]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (selected) setForm(syncHiringAliases(selected));
  }, [selected]);

  useEffect(() => {
    if (!selected && items[0]?._id) setSelectedId(items[0]._id);
  }, [items, selected]);

  async function loadItems() {
    setLoading(true);
    const res = await fetch("/api/admin/hiring-processes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar procesos.");
      return;
    }
    setItems((data.items || []).map(syncHiringAliases));
  }

  function startNew() {
    setSelectedId(null);
    setForm(emptyProcess);
    setTab("main");
    setStatus(null);
  }

  async function saveProcess(e?: FormEvent) {
    e?.preventDefault();
    if (!form.numeroProceso.trim()) return setStatus("El numero de proceso es obligatorio.");
    if (!form.objetoProceso.trim()) return setStatus("El objeto del proceso es obligatorio.");
    if (!form.entidadCliente.trim()) return setStatus("La entidad o cliente es obligatoria.");
    if (!form.cronograma.length) setStatus("Agregue al menos una fecha importante del proceso.");
    else setStatus("Guardando proceso...");

    const payload = syncHiringAliases(form);
    const isNew = !payload._id;
    const res = await fetch(isNew ? "/api/admin/hiring-processes" : `/api/admin/hiring-processes/${payload._id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el proceso.");
      return;
    }

    setStatus(isNew ? "Proceso creado correctamente." : "Proceso actualizado correctamente.");
    await loadItems();
    setSelectedId(data.item?._id || payload._id || null);
  }

  async function deleteProcess() {
    if (!form._id) return;
    if (!window.confirm("Eliminar este proceso de contratacion?")) return;
    const res = await fetch(`/api/admin/hiring-processes/${form._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar.");
      return;
    }
    setStatus("Proceso eliminado.");
    setSelectedId(null);
    setForm(emptyProcess);
    await loadItems();
  }

  function saveScheduleDate() {
    if (!scheduleForm.fechaHora) return setStatus("La fecha y hora del cronograma es obligatoria.");
    const item = {
      ...scheduleForm,
      id: scheduleForm.id || createId(),
      estado: obtenerEstadoFecha(scheduleForm.fechaHora, scheduleForm.estado === "Cumplida"),
    };
    const cronograma = form.cronograma.some((fecha) => fecha.id === item.id)
      ? form.cronograma.map((fecha) => (fecha.id === item.id ? item : fecha))
      : [...form.cronograma, item];
    const sorted = cronograma.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    setForm(syncHiringAliases({ ...form, cronograma: sorted }));
    setScheduleForm(emptyScheduleDate);
    setStatus("Fecha del cronograma agregada. Guarda el proceso para conservar cambios.");
  }

  function editScheduleDate(item: CronogramaFecha) {
    setScheduleForm(item);
  }

  function deleteScheduleDate(id: string) {
    setForm(syncHiringAliases({ ...form, cronograma: form.cronograma.filter((fecha) => fecha.id !== id) }));
  }

  async function generateAgenda() {
    if (form._id) {
      setStatus("Generando agenda automatica...");
      const res = await fetch(`/api/admin/hiring-processes/${form._id}/generar-agenda`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setStatus(data.error || "No se pudo generar la agenda.");
      setForm(syncHiringAliases(data.item));
      await loadItems();
      setStatus("Agenda automatica generada.");
      return;
    }

    setForm(syncHiringAliases({ ...form, agendaOperacional: generarAgendaAutomatica(form) }));
    setStatus("Agenda automatica generada. Guarda el proceso para conservar cambios.");
  }

  function saveActivity() {
    if (!activityForm.titulo.trim()) return setStatus("No se puede guardar una actividad sin titulo.");
    if (!activityForm.fechaHoraInicio) return setStatus("La fecha de inicio de la actividad es obligatoria.");
    const item = { ...activityForm, id: activityForm.id || createId(), origen: activityForm.origen || "Manual" };
    const agendaOperacional = form.agendaOperacional.some((actividad) => actividad.id === item.id)
      ? form.agendaOperacional.map((actividad) => (actividad.id === item.id ? item : actividad))
      : [...form.agendaOperacional, item];
    setForm(syncHiringAliases({ ...form, agendaOperacional }));
    setActivityForm(emptyActivity);
    setStatus("Actividad agregada. Guarda el proceso para conservar cambios.");
  }

  function markActivityDone(item: AgendaActividad) {
    setForm(syncHiringAliases({
      ...form,
      agendaOperacional: form.agendaOperacional.map((actividad) =>
        actividad.id === item.id ? { ...actividad, estado: "Cumplido", fechaCumplimiento: new Date().toISOString().slice(0, 16).replace("T", " ") } : actividad
      ),
    }));
  }

  function reprogramActivity(item: AgendaActividad) {
    setActivityForm({ ...item, estado: "Reprogramado" });
  }

  function deleteActivity(id: string) {
    setForm(syncHiringAliases({ ...form, agendaOperacional: form.agendaOperacional.filter((actividad) => actividad.id !== id) }));
  }

  return (
    <SystemModulePage moduleKey="hiring-processes">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={startNew} className="mb-3 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">Nuevo proceso</button>
          <input className={inputClass} placeholder="Buscar por numero, entidad u objeto..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="mt-4 space-y-2">
            {filteredItems.map((item) => {
              const nextDate = proximaFechaImportante(item);
              const days = nextDate ? diasRestantes(nextDate.fechaHora) : diasRestantes(item.fechaVencimiento);
              return (
                <button key={item._id} onClick={() => setSelectedId(item._id || null)} className={`w-full rounded-md border px-4 py-3 text-left transition ${selectedId === item._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"}`}>
                  <span className="block font-bold text-[#173C61]">{item.numeroProceso}</span>
                  <span className="mt-1 line-clamp-2 block text-sm font-semibold text-slate-800">{item.objetoProceso}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.entidadCliente}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.estadoProceso} />
                    <span className="text-xs font-semibold text-slate-500">{nextDate ? nextDate.tipoFecha : "Sin proxima fecha"}: {days} dias</span>
                  </span>
                </button>
              );
            })}
            {!loading && filteredItems.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">No hay procesos para mostrar.</p>}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-xl font-bold text-[#173C61]">{form._id ? form.numeroProceso : "Nuevo proceso de contratacion publica"}</h2>
              <p className="mt-1 text-sm text-slate-600">{form.objetoProceso || "Registra los datos principales, cronograma y agenda operacional."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => saveProcess()} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">{form._id ? "Actualizar proceso" : "Guardar proceso"}</button>
              {form._id && <button onClick={deleteProcess} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Eliminar proceso</button>}
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              ["main", "Datos principales"],
              ["timeline", "Cronograma"],
              ["agenda", "Agenda operacional"],
              ["files", "Archivos / documentos"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as TabKey)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === key ? "bg-[#173C61] text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{label}</button>
            ))}
          </div>

          {tab === "main" && <MainTab form={form} onChange={(next) => setForm(syncHiringAliases(next))} onSubmit={saveProcess} />}
          {tab === "timeline" && (
            <TimelineTab
              form={form}
              scheduleForm={scheduleForm}
              onScheduleChange={setScheduleForm}
              onSaveDate={saveScheduleDate}
              onEditDate={editScheduleDate}
              onDeleteDate={deleteScheduleDate}
            />
          )}
          {tab === "agenda" && (
            <AgendaTab
              visibleAgenda={visibleAgenda}
              agendaView={agendaView}
              filters={agendaFilters}
              activityForm={activityForm}
              onViewChange={setAgendaView}
              onFiltersChange={setAgendaFilters}
              onActivityChange={setActivityForm}
              onSaveActivity={saveActivity}
              onGenerateAgenda={generateAgenda}
              onMarkDone={markActivityDone}
              onReprogram={reprogramActivity}
              onDeleteActivity={deleteActivity}
            />
          )}
          {tab === "files" && <FilesTab />}
        </section>
      </section>
    </SystemModulePage>
  );
}

function MainTab({ form, onChange, onSubmit }: { form: HiringProcess; onChange: (form: HiringProcess) => void; onSubmit: (e: FormEvent) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Numero de proceso"><input required className={inputClass} value={form.numeroProceso} onChange={(e) => onChange({ ...form, numeroProceso: e.target.value })} /></Field>
      <Field label="Entidad / cliente"><input required className={inputClass} value={form.entidadCliente} onChange={(e) => onChange({ ...form, entidadCliente: e.target.value })} /></Field>
      <Field label="Objeto del proceso"><textarea required className={`${inputClass} min-h-28`} value={form.objetoProceso} onChange={(e) => onChange({ ...form, objetoProceso: e.target.value })} /></Field>
      <Field label="Descripcion"><textarea className={`${inputClass} min-h-28`} value={form.descripcion || ""} onChange={(e) => onChange({ ...form, descripcion: e.target.value })} /></Field>
      <Field label="Tipo compra"><input className={inputClass} value={form.tipoCompra || ""} onChange={(e) => onChange({ ...form, tipoCompra: e.target.value })} /></Field>
      <Field label="Tipo contratacion"><input className={inputClass} value={form.tipoContratacion || ""} onChange={(e) => onChange({ ...form, tipoContratacion: e.target.value })} /></Field>
      <Field label="Presupuesto referencial sin IVA"><input type="number" step="0.01" className={inputClass} value={form.presupuestoReferencialSinIva || 0} onChange={(e) => onChange({ ...form, presupuestoReferencialSinIva: Number(e.target.value) })} /></Field>
      <Field label="Forma de pago"><input className={inputClass} value={form.formaPago || ""} onChange={(e) => onChange({ ...form, formaPago: e.target.value })} /></Field>
      <Field label="Tipo adjudicacion"><input className={inputClass} value={form.tipoAdjudicacion || ""} onChange={(e) => onChange({ ...form, tipoAdjudicacion: e.target.value })} /></Field>
      <Field label="Plazo entrega dias"><input type="number" className={inputClass} value={form.plazoEntregaDias || 0} onChange={(e) => onChange({ ...form, plazoEntregaDias: Number(e.target.value) })} /></Field>
      <Field label="Vigencia oferta dias"><input type="number" className={inputClass} value={form.vigenciaOfertaDias || 0} onChange={(e) => onChange({ ...form, vigenciaOfertaDias: Number(e.target.value) })} /></Field>
      <Field label="Funcionario encargado"><input type="email" className={inputClass} value={form.funcionarioEncargado || ""} onChange={(e) => onChange({ ...form, funcionarioEncargado: e.target.value })} /></Field>
      <Field label="Area responsable">
        <select className={inputClass} value={form.areaResponsable || "Sin area"} onChange={(e) => onChange({ ...form, areaResponsable: e.target.value })}>
          {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
        </select>
      </Field>
      <Field label="Estado proceso">
        <select className={inputClass} value={form.estadoProceso} onChange={(e) => onChange({ ...form, estadoProceso: e.target.value as HiringProcessStatus })}>
          {hiringProcessStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </Field>
      <Field label="Fecha inicio"><input type="date" className={inputClass} value={form.fechaInicio?.slice(0, 10) || ""} onChange={(e) => onChange({ ...form, fechaInicio: e.target.value })} /></Field>
      <Field label="Fecha vencimiento"><input type="date" className={inputClass} value={form.fechaVencimiento?.slice(0, 10) || ""} onChange={(e) => onChange({ ...form, fechaVencimiento: e.target.value })} /></Field>
      <Field label="Notas"><textarea className={`${inputClass} min-h-28`} value={form.notas || ""} onChange={(e) => onChange({ ...form, notas: e.target.value })} /></Field>
      <div className="sm:col-span-2">
        <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar proceso</button>
      </div>
    </form>
  );
}

function TimelineTab({ form, scheduleForm, onScheduleChange, onSaveDate, onEditDate, onDeleteDate }: {
  form: HiringProcess;
  scheduleForm: CronogramaFecha;
  onScheduleChange: (item: CronogramaFecha) => void;
  onSaveDate: () => void;
  onEditDate: (item: CronogramaFecha) => void;
  onDeleteDate: (id: string) => void;
}) {
  return (
    <div>
      {!form.cronograma.length && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Agregue al menos una fecha importante del proceso.</p>}
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <Field label="Tipo de fecha">
          <select className={inputClass} value={scheduleForm.tipoFecha} onChange={(e) => onScheduleChange({ ...scheduleForm, tipoFecha: e.target.value })}>
            {dateTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Fecha y hora"><input type="datetime-local" className={inputClass} value={toDateTimeInput(scheduleForm.fechaHora)} onChange={(e) => onScheduleChange({ ...scheduleForm, fechaHora: fromDateTimeInput(e.target.value) })} /></Field>
        <Field label="Descripcion"><textarea className={`${inputClass} min-h-24`} value={scheduleForm.descripcion} onChange={(e) => onScheduleChange({ ...scheduleForm, descripcion: e.target.value })} /></Field>
        <Field label="Observacion"><textarea className={`${inputClass} min-h-24`} value={scheduleForm.observacion || ""} onChange={(e) => onScheduleChange({ ...scheduleForm, observacion: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <button type="button" onClick={onSaveDate} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">{scheduleForm.id ? "Actualizar fecha" : "Agregar fecha"}</button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr><th className="p-3">Tipo</th><th className="p-3">Fecha</th><th className="p-3">Descripcion</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {form.cronograma.map((fecha) => (
              <tr key={fecha.id}>
                <td className="p-3 font-semibold text-[#173C61]">{fecha.tipoFecha}</td>
                <td className="p-3">{formatHiringDateTime(fecha.fechaHora)}</td>
                <td className="p-3">{fecha.descripcion}</td>
                <td className="p-3"><ScheduleBadge status={obtenerEstadoFecha(fecha.fechaHora, fecha.estado === "Cumplida")} /></td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEditDate(fecha)} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">Editar</button>
                    <button type="button" onClick={() => onDeleteDate(fecha.id)} className="rounded-md border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgendaTab({ visibleAgenda, agendaView, filters, activityForm, onViewChange, onFiltersChange, onActivityChange, onSaveActivity, onGenerateAgenda, onMarkDone, onReprogram, onDeleteActivity }: {
  visibleAgenda: AgendaActividad[];
  agendaView: AgendaView;
  filters: { estado: string; prioridad: string; responsable: string; proceso: string; desde: string; hasta: string };
  activityForm: AgendaActividad;
  onViewChange: (view: AgendaView) => void;
  onFiltersChange: (filters: { estado: string; prioridad: string; responsable: string; proceso: string; desde: string; hasta: string }) => void;
  onActivityChange: (activity: AgendaActividad) => void;
  onSaveActivity: () => void;
  onGenerateAgenda: () => void;
  onMarkDone: (activity: AgendaActividad) => void;
  onReprogram: (activity: AgendaActividad) => void;
  onDeleteActivity: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={onGenerateAgenda} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Generar agenda automatica</button>
        <button type="button" onClick={() => onViewChange("list")} className={`rounded-md px-4 py-2 text-sm font-semibold ${agendaView === "list" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Lista</button>
        <button type="button" onClick={() => onViewChange("calendar")} className={`rounded-md px-4 py-2 text-sm font-semibold ${agendaView === "calendar" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Calendario simple</button>
      </div>

      <div className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
        <select className={inputClass} value={filters.estado} onChange={(e) => onFiltersChange({ ...filters, estado: e.target.value })}><option value="">Todos los estados</option>{["Pendiente", "En proceso", "Cumplido", "Vencido", "Reprogramado"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select className={inputClass} value={filters.prioridad} onChange={(e) => onFiltersChange({ ...filters, prioridad: e.target.value })}><option value="">Todas las prioridades</option>{["Alta", "Media", "Baja"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <input className={inputClass} placeholder="Responsable" value={filters.responsable} onChange={(e) => onFiltersChange({ ...filters, responsable: e.target.value })} />
        <input className={inputClass} placeholder="Proceso relacionado" value={filters.proceso} onChange={(e) => onFiltersChange({ ...filters, proceso: e.target.value })} />
        <input type="date" className={inputClass} value={filters.desde} onChange={(e) => onFiltersChange({ ...filters, desde: e.target.value })} />
        <input type="date" className={inputClass} value={filters.hasta} onChange={(e) => onFiltersChange({ ...filters, hasta: e.target.value })} />
      </div>

      <div className="mb-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <Field label="Titulo"><input className={inputClass} value={activityForm.titulo} onChange={(e) => onActivityChange({ ...activityForm, titulo: e.target.value })} /></Field>
        <Field label="Responsable"><input className={inputClass} value={activityForm.responsable || ""} onChange={(e) => onActivityChange({ ...activityForm, responsable: e.target.value })} /></Field>
        <Field label="Inicio"><input type="datetime-local" className={inputClass} value={toDateTimeInput(activityForm.fechaHoraInicio)} onChange={(e) => onActivityChange({ ...activityForm, fechaHoraInicio: fromDateTimeInput(e.target.value) })} /></Field>
        <Field label="Fin"><input type="datetime-local" className={inputClass} value={toDateTimeInput(activityForm.fechaHoraFin)} onChange={(e) => onActivityChange({ ...activityForm, fechaHoraFin: fromDateTimeInput(e.target.value) })} /></Field>
        <Field label="Prioridad"><select className={inputClass} value={activityForm.prioridad} onChange={(e) => onActivityChange({ ...activityForm, prioridad: e.target.value as AgendaActividad["prioridad"] })}>{["Alta", "Media", "Baja"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Estado"><select className={inputClass} value={activityForm.estado} onChange={(e) => onActivityChange({ ...activityForm, estado: e.target.value as AgendaActividad["estado"] })}>{["Pendiente", "En proceso", "Cumplido", "Vencido", "Reprogramado"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Descripcion"><textarea className={`${inputClass} min-h-24`} value={activityForm.descripcion || ""} onChange={(e) => onActivityChange({ ...activityForm, descripcion: e.target.value })} /></Field>
        <Field label="Observaciones"><textarea className={`${inputClass} min-h-24`} value={activityForm.observaciones || ""} onChange={(e) => onActivityChange({ ...activityForm, observaciones: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <button type="button" onClick={onSaveActivity} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">{activityForm.id ? "Actualizar actividad" : "Agregar actividad manual"}</button>
        </div>
      </div>

      {agendaView === "calendar" ? <CalendarView activities={visibleAgenda} /> : (
        <div className="grid gap-3">
          {visibleAgenda.map((actividad) => (
            <article key={actividad.id} className={`rounded-lg border p-4 ${activityTone(actividad)}`}>
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <p className="font-bold text-[#173C61]">{actividad.titulo}</p>
                  <p className="mt-1 text-sm text-slate-600">{actividad.descripcion}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{formatHiringDateTime(actividad.fechaHoraInicio)} | {actividad.responsable || "Sin responsable"} | {actividad.origen}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActivityBadge activity={actividad} />
                  <button type="button" onClick={() => onMarkDone(actividad)} className="rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Marcar cumplida</button>
                  <button type="button" onClick={() => onReprogram(actividad)} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reprogramar</button>
                  <button type="button" onClick={() => onDeleteActivity(actividad.id)} className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">Eliminar</button>
                </div>
              </div>
            </article>
          ))}
          {visibleAgenda.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">No hay actividades para mostrar.</p>}
        </div>
      )}
    </div>
  );
}

function CalendarView({ activities }: { activities: AgendaActividad[] }) {
  const grouped = activities.reduce((map, activity) => {
    const date = activity.fechaHoraInicio.slice(0, 10) || "Sin fecha";
    map.set(date, [...(map.get(date) || []), activity]);
    return map;
  }, new Map<string, AgendaActividad[]>());

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from(grouped.entries()).map(([date, items]) => (
        <section key={date} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-bold text-[#173C61]">{date}</p>
          <div className="mt-3 space-y-2">
            {items.map((item) => <div key={item.id} className={`rounded-md border px-3 py-2 text-sm ${activityTone(item)}`}><p className="font-semibold">{item.titulo}</p><p className="text-xs">{formatHiringDateTime(item.fechaHoraInicio)}</p></div>)}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilesTab() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
      <p className="font-semibold text-[#173C61]">Archivos / documentos</p>
      <p className="mt-2 text-sm">Estructura preparada para adjuntar pliegos, ofertas, convalidaciones y actas. La carga de archivos se conectara al almacenamiento documental del sistema.</p>
    </div>
  );
}

function StatusBadge({ status }: { status: HiringProcessStatus }) {
  const color = status === "Vencido" ? "bg-red-50 text-red-700" : status === "Por vencer" ? "bg-amber-50 text-amber-700" : status === "Finalizado" || status === "Adjudicado" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span>;
}

function ScheduleBadge({ status }: { status: CronogramaFecha["estado"] }) {
  const color = status === "Vencida" ? "bg-red-50 text-red-700" : status === "Proxima" || status === "Hoy" ? "bg-amber-50 text-amber-700" : status === "Cumplida" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span>;
}

function ActivityBadge({ activity }: { activity: AgendaActividad }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${activityTone(activity)}`}>{obtenerEstadoActividad(activity)} | {activity.prioridad}</span>;
}

function activityTone(activity: AgendaActividad) {
  const state = obtenerEstadoActividad(activity);
  if (state === "Cumplido") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "Vencido") return "border-red-200 bg-red-50 text-red-800";
  const days = diasRestantes(activity.fechaHoraFin || activity.fechaHoraInicio);
  if (days >= 0 && days <= 3) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-white text-slate-700";
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}
