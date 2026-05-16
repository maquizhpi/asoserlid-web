import { NextRequest, NextResponse } from "next/server";
import { type Document } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, hiringProcessSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import { createId, obtenerEstadoProceso, syncHiringAliases } from "@/lib/hiringProcessUtils";
import type { AgendaActividad, CronogramaFecha, HiringProcess, HiringProcessFile } from "@/types/admin";

const collection = "hiring_processes";
const readableModules = ["hiring-processes", "process-calendar", "notifications"];

type ParsedHiringProcess = Omit<Partial<HiringProcess>, "cronograma" | "agendaOperacional" | "archivos"> & {
  cronograma?: Partial<CronogramaFecha>[];
  agendaOperacional?: Partial<AgendaActividad>[];
  archivos?: Partial<HiringProcessFile>[];
};

async function canReadProcesses() {
  return (await Promise.all(readableModules.map((module) => hasModuleAccess(module)))).some(Boolean);
}

export async function GET() {
  if (!(await canReadProcesses())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    await ensureDefaultHiringProcess();
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    const db = await getDb();
    const items = await db.collection<Document>(collection).find(scopedWorkGroupQuery(scope)).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ ok: true, items: items.map(serializeProcess) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const input = normalizeProcess(hiringProcessSchema.parse(await req.json()));
    const db = await getDb();
    await db.collection<Document>(collection).createIndex({ numeroProceso: 1 }, { unique: true });

    const existing = await db.collection<Document>(collection).findOne({ numeroProceso: input.numeroProceso });
    if (existing) return NextResponse.json({ ok: false, error: "Ya existe un proceso con ese numero." }, { status: 400 });

    const now = new Date();
    const { _id, ...document } = input;
    void _id;
    const result = await db.collection<Document>(collection).insertOne({ ...document, createdAt: now, updatedAt: now });
    const item = { ...input, _id: result.insertedId.toString(), createdAt: now.toISOString(), updatedAt: now.toISOString() };
    await createHiringProcessNotifications(db, item, now);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export function normalizeProcess(input: ParsedHiringProcess) {
  const withIds: HiringProcess = {
    numeroProceso: input.numeroProceso || input.processNumber || "",
    entidadCliente: input.entidadCliente || input.clientName || "",
    objetoProceso: input.objetoProceso || input.title || "",
    estadoProceso: input.estadoProceso || "Planificado",
    fechaInicio: input.fechaInicio || input.startDate || "",
    fechaVencimiento: input.fechaVencimiento || input.dueDate || "",
    startDate: input.startDate || input.fechaInicio || "",
    dueDate: input.dueDate || input.fechaVencimiento || "",
    status: input.status || "planned",
    ...input,
    areaResponsable: input.areaResponsable || input.area || "Sin area",
    cronograma: ((input.cronograma || []) as Partial<CronogramaFecha>[]).map((fecha) => ({
      id: fecha.id || createId(),
      tipoFecha: fecha.tipoFecha || "Otra fecha importante",
      fechaHora: fecha.fechaHora || "",
      descripcion: fecha.descripcion || "",
      estado: fecha.estado || "Pendiente",
      observacion: fecha.observacion || "",
    })),
    agendaOperacional: ((input.agendaOperacional || []) as Partial<AgendaActividad>[]).map((actividad) => ({
      id: actividad.id || createId(),
      titulo: actividad.titulo || "Actividad sin titulo",
      descripcion: actividad.descripcion || "",
      fechaHoraInicio: actividad.fechaHoraInicio || "",
      fechaHoraFin: actividad.fechaHoraFin || "",
      responsable: actividad.responsable || "",
      prioridad: actividad.prioridad || "Media",
      estado: actividad.estado || "Pendiente",
      origen: actividad.origen || "Manual",
      procesoRelacionado: actividad.procesoRelacionado || "",
      observaciones: actividad.observaciones || "",
      fechaCumplimiento: actividad.fechaCumplimiento || "",
    })),
    archivos: ((input.archivos || []) as Partial<HiringProcessFile>[]).map((archivo) => ({
      id: archivo.id || createId(),
      nombre: archivo.nombre || "Documento",
      url: archivo.url || "",
      tipo: archivo.tipo || "",
      observacion: archivo.observacion || "",
      createdAt: archivo.createdAt || "",
    })),
  };
  const synced = syncHiringAliases(withIds);
  return { ...synced, estadoProceso: obtenerEstadoProceso(synced) };
}

export function serializeProcess(document: Document) {
  const item = {
    ...document,
    _id: document._id?.toString(),
    createdAt: document.createdAt instanceof Date ? document.createdAt.toISOString() : document.createdAt,
    updatedAt: document.updatedAt instanceof Date ? document.updatedAt.toISOString() : document.updatedAt,
  } as HiringProcess;
  return syncHiringAliases(item);
}

export async function createHiringProcessNotifications(db: Awaited<ReturnType<typeof getDb>>, process: HiringProcess, date = new Date()) {
  const roles = ["legal_representative", "supervisor", "operations", "administrator"];
  const dueDate = date.toISOString().slice(0, 10);
  const title = "Nuevo proceso de contratacion";
  const group = process.workGroupName ? ` Grupo responsable: ${process.workGroupName}.` : "";
  const identifier = process._id || process.numeroProceso;
  const message = `${identifier} | ${process.numeroProceso} - ${process.entidadCliente}.${group} Revisa cronograma, agenda y seguimiento del proceso.`;

  for (const role of roles) {
    const existing = await db.collection("notifications").findOne({
      title,
      role,
      message: { $regex: escapeRegex(identifier) },
    });
    if (existing) continue;
    await db.collection("notifications").insertOne({
      title,
      role,
      message,
      dueDate,
      status: "active",
      createdAt: date,
      updatedAt: date,
    });
  }
}

async function ensureDefaultHiringProcess() {
  const db = await getDb();
  await db.collection<Document>(collection).createIndex({ numeroProceso: 1 }, { unique: true });
  const exists = await db.collection<Document>(collection).findOne({ numeroProceso: "LICO-HG-AM-2025-001" });
  if (exists) return;

  const now = new Date();
  const process = normalizeProcess({
    numeroProceso: "LICO-HG-AM-2025-001",
    entidadCliente: "HOSPITAL GENERAL - AMBATO",
    objetoProceso: "CONTRATACION DE LA IMPERMEABILIZACION DE LOSAS Y MANTENIMIENTO DE CUBIERTAS DEL HOSPITAL GENERAL AMBATO HG-AM",
    tipoCompra: "Obra",
    presupuestoReferencialSinIva: 46672.73,
    tipoContratacion: "Licitacion",
    formaPago: "Anticipo: 20% - Saldo: 80%",
    tipoAdjudicacion: "Total",
    plazoEntregaDias: 120,
    vigenciaOfertaDias: 90,
    funcionarioEncargado: "efren.guerrero@iess.gob.ec",
    areaResponsable: "Sin area",
    estadoProceso: "Desierto",
    descripcion: "Proceso de contratacion publica para impermeabilizacion de losas y mantenimiento de cubiertas.",
    notas: "Proceso declarado desierto por inconsistencias entre terminos de referencia y pliego.",
    fechaInicio: "2025-12-19",
    fechaVencimiento: "2026-01-19",
    cronograma: [
      ["Fecha de publicacion", "2025-12-19 16:30:00", "Indicar la fecha real en la cual se publica el proceso."],
      ["Fecha limite de preguntas", "2025-12-26 16:30:00", "Fecha maxima para solicitar aclaraciones respecto al proceso de contratacion."],
      ["Fecha limite de respuestas", "2025-12-30 16:30:00", "Fecha maxima para solventar inquietudes relacionadas al proceso de contratacion."],
      ["Fecha limite de propuestas", "2026-01-09 10:00:00", "Fecha maxima para la entrega de propuestas."],
      ["Fecha apertura de ofertas", "2026-01-09 11:00:00", "Fecha para la apertura de sobres/ofertas."],
      ["Fecha limite solicitar convalidacion", "2026-01-14 16:28:52", "Fecha maxima para que la entidad notifique errores de forma."],
      ["Fecha limite respuesta convalidacion", "2026-01-16 16:30:00", "Fecha maxima para responder la convalidacion de errores."],
      ["Fecha estimada de adjudicacion", "2026-01-19 16:30:00", "Fecha estimada para la adjudicacion."],
    ].map(([tipoFecha, fechaHora, descripcion]) => ({ id: createId(), tipoFecha, fechaHora, descripcion, estado: "Pendiente", observacion: "" })),
    agendaOperacional: [],
    archivos: [],
    startDate: "2025-12-19",
    dueDate: "2026-01-19",
    status: "completed",
  } as HiringProcess);

  const { _id, ...document } = process;
  void _id;
  await db.collection<Document>(collection).insertOne({ ...document, createdAt: now, updatedAt: now });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
