import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { getAdminSession, hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, hiringProcessSchema } from "@/lib/operationsStore";
import { normalizeProcess, serializeProcess } from "../route";

const collection = "hiring_processes";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const db = await getDb();
    const item = await db.collection<Document>(collection).findOne({ _id: new ObjectId(id) });
    return item ? NextResponse.json({ ok: true, item: serializeProcess(item) }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const input = normalizeProcess(hiringProcessSchema.parse(await req.json()));
    const db = await getDb();
    const duplicate = await db.collection<Document>(collection).findOne({ numeroProceso: input.numeroProceso, _id: { $ne: new ObjectId(id) } });
    if (duplicate) return NextResponse.json({ ok: false, error: "Ya existe un proceso con ese numero." }, { status: 400 });

    const result = await db
      .collection<Document>(collection)
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...input, updatedAt: new Date() } }, { returnDocument: "after" });
    return result ? NextResponse.json({ ok: true, item: serializeProcess(result) }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session?.roles.includes("administrator")) return NextResponse.json({ ok: false, error: "Solo el administrador puede eliminar procesos de contratacion." }, { status: 403 });
  try {
    const { id } = await context.params;
    const db = await getDb();
    const deleted = await db.collection<Document>(collection).deleteOne({ _id: new ObjectId(id) });
    return deleted.deletedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
