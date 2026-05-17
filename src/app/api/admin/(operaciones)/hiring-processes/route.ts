import { NextRequest, NextResponse } from "next/server";
import { type Document, type Filter } from "mongodb";
import { getAdminSession, hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, hiringProcessSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery, type WorkGroupScope } from "@/lib/workGroupScope";
import { createId, obtenerEstadoProceso, syncHiringAliases } from "@/lib/hiringProcessUtils";
import type { AgendaActividad, CronogramaFecha, HiringProcess, HiringProcessFile } from "@/types/admin";

const collection = "hiring_processes";
const readableModules = ["hiring-processes", "process-calendar", "process-tracking", "notifications"];
const processUploaderRoles = ["administrator", "general_manager", "general_supervisor", "general_secretary"];

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
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    const db = await getDb();
    const items = await db.collection<Document>(collection).find(scopedHiringProcessQuery(scope)).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ ok: true, items: items.map(serializeProcess) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const session = await getAdminSession();
  if (!session?.roles.some((role) => processUploaderRoles.includes(role))) {
    return NextResponse.json({ ok: false, error: "Solo gerencia, administracion, supervision general o secretaria general pueden subir procesos." }, { status: 403 });
  }
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
  const workGroups = normalizeProcessWorkGroups(input);
  const primaryGroup = workGroups[0];
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
    workGroupId: input.workGroupId || primaryGroup?.id || "",
    workGroupName: input.workGroupName || primaryGroup?.name || "",
    workGroups,
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
      workGroupId: actividad.workGroupId || "",
      workGroupName: actividad.workGroupName || "",
      workGroupLogoUrl: actividad.workGroupLogoUrl || "",
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

export function scopedHiringProcessQuery(scope: WorkGroupScope): Filter<Document> {
  if (scope.global) return {};

  const legacy = scopedWorkGroupQuery(scope);
  const clauses: Filter<Document>[] = [];
  if ("$or" in legacy && Array.isArray(legacy.$or)) clauses.push(...legacy.$or as Filter<Document>[]);
  if (scope.workGroupIds.length) clauses.push({ "workGroups.id": { $in: scope.workGroupIds } });
  if (scope.workGroupNames.length) clauses.push({ "workGroups.name": { $in: scope.workGroupNames } });
  if (!clauses.length) return { _id: { $exists: false } };
  return { $or: clauses };
}

export async function createHiringProcessNotifications(db: Awaited<ReturnType<typeof getDb>>, process: HiringProcess, date = new Date()) {
  const roles = ["supervisor", "operations", "general_manager", "general_secretary", "general_supervisor", "administrator"];
  const dueDate = date.toISOString().slice(0, 10);
  const title = "Nuevo proceso de contratacion";
  const identifier = process._id || process.numeroProceso;
  const groupNames = getAssignedProcessGroups(process).map((group) => group.name).filter(Boolean).join(", ");
  const group = groupNames ? ` Empresas asignadas: ${groupNames}.` : "";
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

  for (const assignedGroup of getAssignedProcessGroups(process)) {
    const representativeMessage = `${identifier} | ${process.numeroProceso} - ${process.entidadCliente}. Empresa: ${assignedGroup.name}. Ya esta disponible para gestionar el avance de elaboracion del proceso.`;
    const existing = await db.collection("notifications").findOne({
      title,
      role: "legal_representative",
      workGroupId: assignedGroup.id || "",
      workGroupName: assignedGroup.name,
      message: { $regex: escapeRegex(identifier) },
    });
    if (existing) continue;
    await db.collection("notifications").insertOne({
      title,
      role: "legal_representative",
      message: representativeMessage,
      workGroupId: assignedGroup.id || "",
      workGroupName: assignedGroup.name,
      dueDate,
      status: "active",
      createdAt: date,
      updatedAt: date,
    });
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeProcessWorkGroups(input: ParsedHiringProcess) {
  const map = new Map<string, { id?: string; name: string; logoUrl?: string }>();
  for (const group of input.workGroups || []) {
    const id = String(group.id || "").trim();
    const name = String(group.name || "").trim();
    if (!id && !name) continue;
    map.set(id || name, { id, name, logoUrl: group.logoUrl || undefined });
  }
  if (!map.size && (input.workGroupId || input.workGroupName)) {
    const id = String(input.workGroupId || "").trim();
    const name = String(input.workGroupName || "").trim();
    map.set(id || name, { id, name });
  }
  return Array.from(map.values()).map((group) => ({ ...group, name: group.name || "Sin nombre" }));
}

function getAssignedProcessGroups(process: HiringProcess) {
  const groups = normalizeProcessWorkGroups(process);
  return groups.length ? groups : [];
}
