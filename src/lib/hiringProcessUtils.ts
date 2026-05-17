import type { AgendaActividad, CronogramaFecha, HiringProcess, HiringProcessStatus } from "@/types/admin";

export const hiringProcessStatuses = [
  "Planificado",
  "En seguimiento",
  "Por vencer",
  "Vencido",
  "Adjudicado",
  "Desierto",
  "Cancelado",
  "Finalizado",
] as const satisfies readonly HiringProcessStatus[];

export const protectedManualStatuses: HiringProcessStatus[] = ["Desierto", "Adjudicado", "Cancelado"];

export const dateTypes = [
  "Fecha de publicacion",
  "Fecha limite de preguntas",
  "Fecha limite de respuestas",
  "Fecha limite de propuestas",
  "Fecha apertura de ofertas",
  "Fecha limite solicitar convalidacion",
  "Fecha limite respuesta convalidacion",
  "Fecha estimada de adjudicacion",
  "Otra fecha importante",
];

export const areaOptions = ["Sin area", "Administracion", "Operaciones", "Recursos humanos", "Contabilidad", "Compras", "Legal"];

const agendaTemplates: Record<string, string[]> = {
  "Fecha de publicacion": ["Revisar publicacion del proceso"],
  "Fecha limite de preguntas": ["Preparar preguntas o aclaraciones"],
  "Fecha limite de respuestas": ["Revisar respuestas de la entidad"],
  "Fecha limite de propuestas": [
    "Preparar oferta tecnica, economica y documentos habilitantes",
    "Verificar carga de propuesta en el portal",
  ],
  "Fecha apertura de ofertas": ["Dar seguimiento a la apertura de ofertas"],
  "Fecha limite solicitar convalidacion": ["Revisar solicitud de convalidacion"],
  "Fecha limite respuesta convalidacion": ["Preparar y cargar respuesta de convalidacion"],
  "Fecha estimada de adjudicacion": ["Verificar adjudicacion o estado final del proceso"],
};

export function diasRestantes(fecha: string) {
  const target = parseHiringDate(fecha);
  if (!target) return 0;
  const today = getEcuadorTodayStart();
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);
  return Math.ceil((targetDay.getTime() - today.getTime()) / 86400000);
}

export function obtenerEstadoFecha(fecha: string, cumplida?: boolean): CronogramaFecha["estado"] {
  if (cumplida) return "Cumplida";
  const remaining = diasRestantes(fecha);
  const target = parseHiringDate(fecha);
  if (!target) return "Pendiente";
  if (target.getTime() < Date.now() && remaining < 0) return "Vencida";
  if (remaining === 0) return "Hoy";
  if (remaining > 0 && remaining <= 3) return "Proxima";
  return "Pendiente";
}

export function obtenerEstadoProceso(proceso: HiringProcess): HiringProcessStatus {
  if (protectedManualStatuses.includes(proceso.estadoProceso)) return proceso.estadoProceso;
  const agenda = proceso.agendaOperacional || [];
  if (agenda.length && agenda.every((actividad) => actividad.estado === "Cumplido")) return "Finalizado";
  if (agenda.some((actividad) => obtenerEstadoActividad(actividad) === "Vencido")) return "Vencido";
  if (agenda.some((actividad) => isSoon(actividad.fechaHoraFin || actividad.fechaHoraInicio))) return "Por vencer";

  const cronograma = proceso.cronograma || [];
  if (cronograma.some((fecha) => obtenerEstadoFecha(fecha.fechaHora, fecha.estado === "Cumplida") === "Vencida")) return "Vencido";
  if (cronograma.some((fecha) => obtenerEstadoFecha(fecha.fechaHora, fecha.estado === "Cumplida") === "Proxima")) return "Por vencer";
  return "En seguimiento";
}

export function obtenerEstadoActividad(actividad: AgendaActividad): AgendaActividad["estado"] {
  if (actividad.estado === "Cumplido" || actividad.estado === "Reprogramado") return actividad.estado;
  const end = actividad.fechaHoraFin || actividad.fechaHoraInicio;
  if (!end) return actividad.estado;
  const date = parseHiringDate(end);
  if (date && date.getTime() < Date.now()) return "Vencido";
  return actividad.estado;
}

export function generarAgendaAutomatica(proceso: HiringProcess): AgendaActividad[] {
  const existing = proceso.agendaOperacional || [];
  const manual = existing.filter((actividad) => actividad.origen === "Manual");
  const groups = getProcessGroups(proceso);
  const automatic = (proceso.cronograma || []).flatMap((fecha) => {
    const titles = agendaTemplates[fecha.tipoFecha] || [`Dar seguimiento a ${fecha.tipoFecha.toLowerCase()}`];
    return groups.flatMap((group) =>
      titles.map((titulo) => ({
        id: createId(),
        titulo,
        descripcion: fecha.descripcion || `Seguimiento operativo: ${fecha.tipoFecha}`,
        fechaHoraInicio: fecha.fechaHora,
        fechaHoraFin: fecha.fechaHora,
        responsable: proceso.funcionarioEncargado || "",
        workGroupId: group.id || "",
        workGroupName: group.name || "",
        workGroupLogoUrl: group.logoUrl || "",
        prioridad: titulo.includes("propuesta") || titulo.includes("convalidacion") ? "Alta" : "Media",
        estado: "Pendiente",
        origen: "Automatico",
        procesoRelacionado: fecha.tipoFecha,
        observaciones: "",
        fechaCumplimiento: "",
      } satisfies AgendaActividad))
    );
  });

  return [...manual, ...automatic].sort((a, b) => compareDateTime(a.fechaHoraInicio, b.fechaHoraInicio));
}

export function ordenarCronograma(cronograma: CronogramaFecha[]) {
  return [...cronograma]
    .map((fecha) => ({ ...fecha, estado: obtenerEstadoFecha(fecha.fechaHora, fecha.estado === "Cumplida") }))
    .sort((a, b) => compareDateTime(a.fechaHora, b.fechaHora));
}

export function proximaFechaImportante(proceso: HiringProcess) {
  const now = Date.now();
  return ordenarCronograma(proceso.cronograma || []).find((fecha) => {
    const date = parseHiringDate(fecha.fechaHora);
    return date && date.getTime() >= now && fecha.estado !== "Cumplida";
  });
}

export function formatHiringDateTime(value?: string) {
  const date = value ? parseHiringDate(value) : null;
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function toDateTimeInput(value?: string) {
  return (value || "").replace(" ", "T").slice(0, 16);
}

export function fromDateTimeInput(value: string) {
  return value ? `${value.replace("T", " ")}:00`.slice(0, 19) : "";
}

export function syncHiringAliases(input: HiringProcess): HiringProcess {
  const cronograma = ordenarCronograma(input.cronograma || []);
  const fechaInicio = input.fechaInicio || cronograma[0]?.fechaHora?.slice(0, 10) || input.startDate || "";
  const fechaVencimiento = input.fechaVencimiento || cronograma[cronograma.length - 1]?.fechaHora?.slice(0, 10) || input.dueDate || "";
  const estadoProceso = input.estadoProceso || legacyStatusToProcessStatus(input.status) || "Planificado";

  return {
    ...input,
    cronograma,
    agendaOperacional: input.agendaOperacional || [],
    numeroProceso: input.numeroProceso || input.processNumber || "",
    entidadCliente: input.entidadCliente || input.clientName || "",
    objetoProceso: input.objetoProceso || input.title || "",
    areaResponsable: input.areaResponsable || input.area || "Sin area",
    estadoProceso,
    fechaInicio,
    fechaVencimiento,
    processNumber: input.numeroProceso || input.processNumber || "",
    title: input.objetoProceso || input.title || "",
    clientName: input.entidadCliente || input.clientName || "",
    area: input.areaResponsable || input.area || "Sin area",
    startDate: fechaInicio.slice(0, 10),
    dueDate: fechaVencimiento.slice(0, 10),
    status: processStatusToLegacyStatus(estadoProceso),
    timeline: cronograma.map((fecha) => `${fecha.tipoFecha}: ${formatHiringDateTime(fecha.fechaHora)}`).join("\n") || input.timeline || "",
  };
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isSoon(fecha: string) {
  const remaining = diasRestantes(fecha);
  return remaining >= 0 && remaining <= 3;
}

function compareDateTime(a: string, b: string) {
  return (parseHiringDate(a)?.getTime() || 0) - (parseHiringDate(b)?.getTime() || 0);
}

function parseHiringDate(value: string) {
  if (!value) return null;
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEcuadorTodayStart() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(new Date()).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function processStatusToLegacyStatus(status: HiringProcessStatus) {
  if (status === "Planificado") return "planned";
  if (status === "Cancelado") return "cancelled";
  if (status === "Finalizado" || status === "Adjudicado" || status === "Desierto") return "completed";
  return "in_progress";
}

function legacyStatusToProcessStatus(status?: HiringProcess["status"]): HiringProcessStatus | undefined {
  if (status === "planned") return "Planificado";
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  if (status === "in_progress" || status === "paused") return "En seguimiento";
  return undefined;
}

function getProcessGroups(process: HiringProcess) {
  if (process.workGroups?.length) return process.workGroups.filter((group) => group.id || group.name);
  if (process.workGroupId || process.workGroupName) return [{ id: process.workGroupId || "", name: process.workGroupName || "", logoUrl: "" }];
  return [{ id: "", name: "", logoUrl: "" }];
}
