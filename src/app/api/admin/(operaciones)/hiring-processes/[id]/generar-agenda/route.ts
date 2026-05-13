import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { generarAgendaAutomatica } from "@/lib/hiringProcessUtils";
import { serializeProcess } from "../../route";

const collection = "hiring_processes";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const { id } = await context.params;
  const db = await getDb();
  const current = await db.collection<Document>(collection).findOne({ _id: new ObjectId(id) });
  if (!current) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });

  const process = serializeProcess(current);
  const agendaOperacional = generarAgendaAutomatica(process);
  const updated = await db
    .collection<Document>(collection)
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { agendaOperacional, updatedAt: new Date() } }, { returnDocument: "after" });

  return updated ? NextResponse.json({ ok: true, item: serializeProcess(updated) }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
}
