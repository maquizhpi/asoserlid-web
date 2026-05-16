"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import { confirmSystem, notifySystem } from "@/components/system/SystemNotifier";
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
import type { AgendaActividad, CronogramaFecha, HiringProcess, HiringProcessStatus, WorkGroup } from "@/types/admin";

type TabKey = "main" | "timeline" | "agenda" | "files";
type AgendaView = "list" | "calendar";
type ImportModalType = "process" | "timeline" | null;

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
  workGroupId: "",
  workGroupName: "",
  processOwner: "",
  estadoProceso: "Planificado",
  winningCompany: "",
  winningPrice: 0,
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

const agendaTemplateStorageKey = "asoserlid_hiring_agenda_template";

function createEmptyProcess() {
  const today = new Date().toISOString().slice(0, 10);
  return syncHiringAliases({
    ...emptyProcess,
    fechaInicio: today,
    fechaVencimiento: today,
    startDate: today,
    dueDate: today,
    cronograma: [],
    agendaOperacional: [],
    archivos: [],
  });
}

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
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<HiringProcess>(createEmptyProcess());
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("main");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<CronogramaFecha>(emptyScheduleDate);
  const [activityForm, setActivityForm] = useState<AgendaActividad>(emptyActivity);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [importModal, setImportModal] = useState<ImportModalType>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
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

  const processSummary = useMemo(() => {
    const active = items.filter((item) => !["Finalizado", "Cancelado", "Desierto"].includes(item.estadoProceso));
    const overdue = items.filter((item) => item.estadoProceso === "Vencido").length;
    const soon = items.filter((item) => item.estadoProceso === "Por vencer" || (proximaFechaImportante(item) && diasRestantes(proximaFechaImportante(item)!.fechaHora) <= 7)).length;
    const awarded = items.filter((item) => item.estadoProceso === "Adjudicado" || item.estadoProceso === "Finalizado").length;
    return [
      { label: "Procesos activos", value: active.length },
      { label: "Fechas proximas", value: soon },
      { label: "Vencidos", value: overdue },
      { label: "Adjudicados / finalizados", value: awarded },
    ];
  }, [items]);

  useEffect(() => {
    loadItems();
    fetch("/api/admin/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdministrator(Boolean(data?.user?.roles?.includes("administrator"))))
      .catch(() => setIsAdministrator(false));
  }, []);

  useEffect(() => {
    if (selected) {
      setIsCreatingNew(false);
      setForm(syncHiringAliases(selected));
    }
  }, [selected]);

  useEffect(() => {
    if (!isCreatingNew && !selected && items[0]?._id) setSelectedId(items[0]._id);
  }, [items, selected, isCreatingNew]);

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
    const groupsRes = await fetch("/api/admin/work-groups", { cache: "no-store" }).catch(() => null);
    const groupsData = await groupsRes?.json().catch(() => ({}));
    if (groupsRes?.ok) setWorkGroups(groupsData.items || []);
  }

  function startNew() {
    setIsCreatingNew(true);
    setSelectedId(null);
    setForm(createEmptyProcess());
    setTab("main");
    setStatus(null);
    notifySystem("Formulario listo para registrar un nuevo proceso.", { title: "Nuevo proceso", tone: "info" });
  }

  async function saveProcess(e?: FormEvent) {
    e?.preventDefault();
    if (!form.numeroProceso.trim()) return setStatus("El numero de proceso es obligatorio.");
    if (!form.objetoProceso.trim()) return setStatus("El objeto del proceso es obligatorio.");
    if (!form.entidadCliente.trim()) return setStatus("La entidad o cliente es obligatoria.");
    if ((form.estadoProceso === "Adjudicado" || form.estadoProceso === "Finalizado") && (!form.winningCompany?.trim() || !Number(form.winningPrice || 0))) {
      const message = "Para cerrar o adjudicar el proceso registra la empresa ganadora y el precio adjudicado.";
      notifySystem(message, { title: "Datos de adjudicacion", tone: "warning" });
      return setStatus(message);
    }
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
      notifySystem(data.error || "No se pudo guardar el proceso.", { title: "Proceso no guardado", tone: "error" });
      return;
    }

    setStatus(isNew ? "Proceso creado correctamente." : "Proceso actualizado correctamente.");
    notifySystem(isNew ? "Proceso creado correctamente." : "Proceso actualizado correctamente.", { title: "Proceso guardado", tone: "success" });
    await loadItems();
    setIsCreatingNew(false);
    setSelectedId(data.item?._id || payload._id || null);
  }

  async function deleteProcess() {
    if (!form._id) return;
    if (!isAdministrator) {
      notifySystem("Solo el administrador puede eliminar procesos de contratacion.", { title: "Permiso restringido", tone: "warning" });
      return;
    }
    if (!(await confirmSystem("Eliminar este proceso de contratacion?", { title: "Confirmar eliminacion", tone: "warning", confirmLabel: "Eliminar" }))) return;
    const res = await fetch(`/api/admin/hiring-processes/${form._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar.");
      notifySystem(data.error || "No se pudo eliminar.", { title: "No se pudo eliminar", tone: "error" });
      return;
    }
    setStatus("Proceso eliminado.");
    notifySystem("Proceso eliminado correctamente.", { title: "Proceso eliminado", tone: "success" });
    setIsCreatingNew(true);
    setSelectedId(null);
    setForm(createEmptyProcess());
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
    notifySystem("Fecha agregada al cronograma. Guarda el proceso para conservar cambios.", { title: "Cronograma actualizado", tone: "info" });
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
    setActivityModalOpen(false);
    setStatus("Actividad agregada. Guarda el proceso para conservar cambios.");
    notifySystem("Actividad agregada. Guarda el proceso para conservar cambios.", { title: "Agenda actualizada", tone: "info" });
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
    setActivityModalOpen(true);
  }

  function deleteActivity(id: string) {
    setForm(syncHiringAliases({ ...form, agendaOperacional: form.agendaOperacional.filter((actividad) => actividad.id !== id) }));
  }

  async function importProcessFile(file?: File) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setStatus("Importando proceso...");
    const res = await fetch("/api/admin/hiring-processes/import", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo importar el proceso.", { title: "Importacion fallida", tone: "error" });
      return setStatus(data.error || "No se pudo importar el proceso.");
    }
    notifySystem(`Importacion lista: ${data.created || 0} creado(s), ${data.updated || 0} actualizado(s).`, { title: "Proceso importado", tone: "success" });
    await loadItems();
    setSelectedId(data.items?.[0]?._id || null);
    setIsCreatingNew(false);
    setImportFile(null);
    setImportModal(null);
  }

  async function importTimelineFile(file?: File) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    if (form._id) formData.append("processId", form._id);
    setStatus("Importando cronograma...");
    const res = await fetch("/api/admin/hiring-processes/import-cronograma", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo importar el cronograma.", { title: "Importacion fallida", tone: "error" });
      return setStatus(data.error || "No se pudo importar el cronograma.");
    }
    notifySystem(`Cronograma importado con ${data.count || 0} fecha(s).`, { title: "Cronograma actualizado", tone: "success" });
    if (data.item) {
      await loadItems();
      setForm(syncHiringAliases(data.item));
    } else if (data.cronograma) {
      const next = syncHiringAliases({
        ...form,
        cronograma: data.cronograma,
        agendaOperacional: generarAgendaAutomatica({ ...form, cronograma: data.cronograma }),
        fechaInicio: data.cronograma[0]?.fechaHora?.slice(0, 10) || form.fechaInicio,
        fechaVencimiento: data.cronograma[data.cronograma.length - 1]?.fechaHora?.slice(0, 10) || form.fechaVencimiento,
      });
      setForm(next);
      setTab("timeline");
    }
    setImportFile(null);
    setImportModal(null);
  }

  function openImportModal(type: Exclude<ImportModalType, null>) {
    setImportFile(null);
    setImportModal(type);
  }

  function submitImportModal() {
    if (!importFile) {
      notifySystem("Selecciona un archivo Excel antes de importar.", { title: "Archivo requerido", tone: "warning" });
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(importFile.name)) {
      notifySystem("El archivo debe ser Excel (.xlsx o .xls).", { title: "Formato invalido", tone: "warning" });
      return;
    }
    if (importModal === "process") void importProcessFile(importFile);
    if (importModal === "timeline") void importTimelineFile(importFile);
  }

  function saveAgendaTemplate() {
    if (!form.agendaOperacional.length) return notifySystem("No hay actividades para guardar como plantilla.", { title: "Plantilla de agenda", tone: "warning" });
    localStorage.setItem(agendaTemplateStorageKey, JSON.stringify(form.agendaOperacional.map((activity) => ({ ...activity, id: "", fechaCumplimiento: "" }))));
    notifySystem("Plantilla de agenda guardada para nuevos procesos.", { title: "Plantilla guardada", tone: "success" });
  }

  function applyAgendaTemplate() {
    const raw = localStorage.getItem(agendaTemplateStorageKey);
    if (!raw) return notifySystem("Todavia no existe una plantilla guardada.", { title: "Sin plantilla", tone: "warning" });
    const template = JSON.parse(raw) as AgendaActividad[];
    setForm(syncHiringAliases({
      ...form,
      agendaOperacional: template.map((activity) => ({
        ...activity,
        id: createId(),
        responsable: activity.responsable || form.funcionarioEncargado || "",
        origen: activity.origen || "Manual",
      })),
    }));
    notifySystem("Plantilla aplicada al proceso. Guarda para conservar los cambios.", { title: "Plantilla aplicada", tone: "info" });
  }

  return (
    <SystemModulePage moduleKey="hiring-processes">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        {processSummary.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#173C61]">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={startNew} className="mb-3 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">Nuevo proceso</button>
          <input className={inputClass} placeholder="Buscar por numero, entidad u objeto..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="mt-4 space-y-2">
            {filteredItems.map((item) => {
              const nextDate = proximaFechaImportante(item);
              const days = nextDate ? diasRestantes(nextDate.fechaHora) : diasRestantes(item.fechaVencimiento);
              return (
                <button key={item._id} onClick={() => { setIsCreatingNew(false); setSelectedId(item._id || null); }} className={`w-full rounded-md border px-4 py-3 text-left transition ${selectedId === item._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"}`}>
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
              <button type="button" onClick={() => openImportModal("process")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-50">Importar proceso</button>
              <button type="button" onClick={() => openImportModal("timeline")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-50">Importar cronograma</button>
              <button onClick={() => saveProcess()} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">{form._id ? "Actualizar proceso" : "Guardar proceso"}</button>
              {form._id && isAdministrator && <button onClick={deleteProcess} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Eliminar proceso</button>}
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

          {tab === "main" && <MainTab form={form} workGroups={workGroups} onChange={(next) => setForm(syncHiringAliases(next))} onSubmit={saveProcess} />}
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
              onViewChange={setAgendaView}
              onFiltersChange={setAgendaFilters}
              onOpenActivityModal={() => { setActivityForm(emptyActivity); setActivityModalOpen(true); }}
              onGenerateAgenda={generateAgenda}
              onApplyTemplate={applyAgendaTemplate}
              onSaveTemplate={saveAgendaTemplate}
              onMarkDone={markActivityDone}
              onReprogram={reprogramActivity}
              onDeleteActivity={deleteActivity}
            />
          )}
          {tab === "files" && <FilesTab />}
        </section>
      </section>
      {activityModalOpen && (
        <ActivityModal
          activityForm={activityForm}
          onActivityChange={setActivityForm}
          onSaveActivity={saveActivity}
          onClose={() => { setActivityModalOpen(false); setActivityForm(emptyActivity); }}
        />
      )}
      {importModal && (
        <ImportProcessModal
          type={importModal}
          file={importFile}
          onFileChange={setImportFile}
          onImport={submitImportModal}
          onClose={() => { setImportModal(null); setImportFile(null); }}
        />
      )}
    </SystemModulePage>
  );
}

function MainTab({ form, workGroups, onChange, onSubmit }: { form: HiringProcess; workGroups: WorkGroup[]; onChange: (form: HiringProcess) => void; onSubmit: (e: FormEvent) => void }) {
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
      <Field label="Grupo de trabajo">
        <select
          className={inputClass}
          value={form.workGroupId || ""}
          onChange={(e) => {
            const group = workGroups.find((item) => item._id === e.target.value);
            onChange({ ...form, workGroupId: group?._id || "", workGroupName: group?.name || "" });
          }}
        >
          <option value="">Sin grupo asignado</option>
          {workGroups.map((group) => <option key={group._id || group.name} value={group._id}>{group.name}</option>)}
        </select>
      </Field>
      <Field label="Responsable interno"><input className={inputClass} value={form.processOwner || ""} onChange={(e) => onChange({ ...form, processOwner: e.target.value })} /></Field>
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
      {(form.estadoProceso === "Adjudicado" || form.estadoProceso === "Finalizado") && (
        <>
          <Field label="Empresa ganadora"><input className={inputClass} value={form.winningCompany || ""} onChange={(e) => onChange({ ...form, winningCompany: e.target.value })} /></Field>
          <Field label="Precio adjudicado"><input type="number" step="0.01" className={inputClass} value={form.winningPrice || 0} onChange={(e) => onChange({ ...form, winningPrice: Number(e.target.value) })} /></Field>
        </>
      )}
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

function AgendaTab({ visibleAgenda, agendaView, filters, onViewChange, onFiltersChange, onOpenActivityModal, onGenerateAgenda, onApplyTemplate, onSaveTemplate, onMarkDone, onReprogram, onDeleteActivity }: {
  visibleAgenda: AgendaActividad[];
  agendaView: AgendaView;
  filters: { estado: string; prioridad: string; responsable: string; proceso: string; desde: string; hasta: string };
  onViewChange: (view: AgendaView) => void;
  onFiltersChange: (filters: { estado: string; prioridad: string; responsable: string; proceso: string; desde: string; hasta: string }) => void;
  onOpenActivityModal: () => void;
  onGenerateAgenda: () => void;
  onApplyTemplate: () => void;
  onSaveTemplate: () => void;
  onMarkDone: (activity: AgendaActividad) => void;
  onReprogram: (activity: AgendaActividad) => void;
  onDeleteActivity: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={onGenerateAgenda} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Generar agenda automatica</button>
        <button type="button" onClick={onOpenActivityModal} className="rounded-md border border-[#173C61] px-4 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-50">Agregar actividad manual</button>
        <button type="button" onClick={onApplyTemplate} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Aplicar plantilla</button>
        <button type="button" onClick={onSaveTemplate} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Guardar plantilla</button>
        <button type="button" onClick={() => onViewChange("list")} className={`rounded-md px-4 py-2 text-sm font-semibold ${agendaView === "list" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Lista</button>
        <button type="button" onClick={() => onViewChange("calendar")} className={`rounded-md px-4 py-2 text-sm font-semibold ${agendaView === "calendar" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Calendario</button>
      </div>

      <div className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
        <select className={inputClass} value={filters.estado} onChange={(e) => onFiltersChange({ ...filters, estado: e.target.value })}><option value="">Todos los estados</option>{["Pendiente", "En proceso", "Cumplido", "Vencido", "Reprogramado"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select className={inputClass} value={filters.prioridad} onChange={(e) => onFiltersChange({ ...filters, prioridad: e.target.value })}><option value="">Todas las prioridades</option>{["Alta", "Media", "Baja"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <input className={inputClass} placeholder="Responsable" value={filters.responsable} onChange={(e) => onFiltersChange({ ...filters, responsable: e.target.value })} />
        <input className={inputClass} placeholder="Proceso relacionado" value={filters.proceso} onChange={(e) => onFiltersChange({ ...filters, proceso: e.target.value })} />
        <input type="date" className={inputClass} value={filters.desde} onChange={(e) => onFiltersChange({ ...filters, desde: e.target.value })} />
        <input type="date" className={inputClass} value={filters.hasta} onChange={(e) => onFiltersChange({ ...filters, hasta: e.target.value })} />
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

function ActivityModal({ activityForm, onActivityChange, onSaveActivity, onClose }: {
  activityForm: AgendaActividad;
  onActivityChange: (activity: AgendaActividad) => void;
  onSaveActivity: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#173C61]">{activityForm.id ? "Actualizar actividad" : "Agregar actividad manual"}</h3>
            <p className="text-sm text-slate-500">Registra o reprograma la actividad de la agenda operacional.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cerrar</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
      </section>
    </div>
  );
}

function ImportProcessModal({ type, file, onFileChange, onImport, onClose }: {
  type: Exclude<ImportModalType, null>;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onImport: () => void;
  onClose: () => void;
}) {
  const isProcess = type === "process";
  const title = isProcess ? "Importar proceso" : "Importar cronograma";
  const formatUrl = isProcess ? "/api/admin/hiring-processes/import" : "/api/admin/hiring-processes/import-cronograma";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <section className="w-full max-w-xl rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#173C61]">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {isProcess
                ? "Carga el Excel del proceso para validar y registrar los datos principales."
                : "Carga el Excel del cronograma para validar fechas, llenar el cronograma y generar la agenda."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cerrar</button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Archivo Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className={inputClass}
              onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            />
          </label>
          {file && (
            <p className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-[#173C61]">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => { window.location.href = formatUrl; }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-50">
            Descargar formato
          </button>
          <button type="button" onClick={onImport} className="rounded-md bg-[#173C61] px-5 py-2 text-sm font-bold text-white hover:bg-[#218F93]">
            Validar e importar
          </button>
        </div>
      </section>
    </div>
  );
}

function CalendarView({ activities }: { activities: AgendaActividad[] }) {
  const initialDate = useMemo(() => getActivityDate(activities[0]) || new Date(), [activities]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const grouped = useMemo(() => {
    return activities.reduce((map, activity) => {
      const date = activity.fechaHoraInicio.slice(0, 10);
      map.set(date, [...(map.get(date) || []), activity]);
      return map;
    }, new Map<string, AgendaActividad[]>());
  }, [activities]);

  const monthLabel = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(visibleMonth);

  function moveMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-full border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50" aria-label="Mes anterior">‹</button>
          <button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-full border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50" aria-label="Mes siguiente">›</button>
          <button type="button" onClick={() => setVisibleMonth(new Date())} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hoy</button>
        </div>
        <h3 className="text-lg font-bold capitalize text-[#173C61]">{monthLabel}</h3>
        <p className="text-sm font-semibold text-slate-500">{activities.length} actividad(es)</p>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => <div key={day} className="px-2 py-3">{day}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {monthCells.map((day) => {
          const key = toDateKey(day);
          const dayActivities = grouped.get(key) || [];
          const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
          const isToday = key === toDateKey(new Date());
          return (
            <div key={key} className={`min-h-32 border-b border-r border-slate-100 p-2 ${outsideMonth ? "bg-slate-50/70 text-slate-400" : "bg-white text-slate-800"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${isToday ? "bg-[#173C61] text-white" : ""}`}>{day.getDate()}</span>
                {dayActivities.length > 0 && <span className="text-[11px] font-bold text-slate-400">{dayActivities.length}</span>}
              </div>
              <div className="space-y-1.5">
                {dayActivities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className={`rounded-md border-l-4 px-2 py-1.5 text-xs shadow-sm ${calendarActivityClass(activity)}`}>
                    <p className="truncate font-bold">{activity.titulo}</p>
                    <p className="mt-0.5 font-semibold opacity-80">{activity.fechaHoraInicio.slice(11, 16) || "--:--"}</p>
                  </div>
                ))}
                {dayActivities.length > 3 && <p className="px-1 text-xs font-bold text-slate-500">+{dayActivities.length - 3} mas</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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

function calendarActivityClass(activity: AgendaActividad) {
  const state = obtenerEstadoActividad(activity);
  if (state === "Cumplido") return "border-l-emerald-500 bg-emerald-50 text-emerald-900";
  if (state === "Vencido") return "border-l-red-500 bg-red-50 text-red-900";
  if (activity.prioridad === "Alta") return "border-l-amber-500 bg-amber-50 text-amber-900";
  return "border-l-[#218F93] bg-cyan-50 text-[#173C61]";
}

function buildMonthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getActivityDate(activity?: AgendaActividad) {
  if (!activity?.fechaHoraInicio) return null;
  const date = new Date(activity.fechaHoraInicio.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}
