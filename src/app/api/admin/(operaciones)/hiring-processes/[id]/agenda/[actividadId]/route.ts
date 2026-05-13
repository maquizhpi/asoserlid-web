import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { z } from "zod";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage } from "@/lib/operationsStore";
import { serializeProcess } from "../../../route";

const collection = "hiring_processes";
type RouteContext = { params: Promise<{ id: string; actividadId: string }> };

const agendaUpdateSchema = z.object({
  titulo: z.string().min(2).trim().optional(),
  descripcion: z.string().trim().optional().or(z.literal("")),
  fechaHoraInicio: z.string().min(10).trim().optional(),
  fechaHoraFin: z.string().trim().optional().or(z.literal("")),
  responsable: z.string().trim().optional().or(z.literal("")),
  prioridad: z.enum(["Alta", "Media", "Baja"]).optional(),
  estado: z.enum(["Pendiente", "En proceso", "Cumplido", "Vencido", "Reprogramado"]).optional(),
  origen: z.enum(["Automatico", "Manual"]).optional(),
  procesoRelacionado: z.string().trim().optional().or(z.literal("")),
  observaciones: z.string().trim().optional().or(z.literal("")),
  fechaCumplimiento: z.string().trim().optional().or(z.literal("")),
}).strip();

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id, actividadId } = await context.params;
    const patch = agendaUpdateSchema.parse(await req.json());
    const db = await getDb();
    const current = await db.collection<Document>(collection).findOne({ _id: new ObjectId(id) });
    if (!current) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

    const process = serializeProcess(current);
    const agendaOperacional = process.agendaOperacional.map((actividad) =>
      actividad.id === actividadId ? { ...actividad, ...patch } : actividad
    );
    const updated = await db
      .collection<Document>(collection)
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { agendaOperacional, updatedAt: new Date() } }, { returnDocument: "after" });
    return updated ? NextResponse.json({ ok: true, item: serializeProcess(updated) }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const { id, actividadId } = await context.params;
  const db = await getDb();
  const current = await db.collection<Document>(collection).findOne({ _id: new ObjectId(id) });
  if (!current) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  const process = serializeProcess(current);
  const agendaOperacional = process.agendaOperacional.filter((actividad) => actividad.id !== actividadId);
  const updated = await db
    .collection<Document>(collection)
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { agendaOperacional, updatedAt: new Date() } }, { returnDocument: "after" });
  return updated ? NextResponse.json({ ok: true, item: serializeProcess(updated) }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
}
