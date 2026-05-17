import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { clientSchema, createCrudStore, getOperationsErrorMessage } from "@/lib/operationsStore";
import { getWorkGroupScope, isRecordInWorkGroupScope } from "@/lib/workGroupScope";
import type { Client } from "@/types/admin";

const store = createCrudStore<Client>("clients", clientSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const input = clientSchema.parse(await req.json());
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    const scopedInput = scope.global || input.workGroupId ? input : { ...input, workGroupId: scope.workGroupIds[0] || "", workGroupName: scope.workGroupNames[0] || "" };
    if (!isRecordInWorkGroupScope(scopedInput, scope)) return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    const item = await store.update(id, scopedInput);
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const db = await getDb();
    const existing = ObjectId.isValid(id) ? await db.collection("clients").findOne({ _id: new ObjectId(id) }) : null;
    const scope = await getWorkGroupScope();
    if (!scope || !isRecordInWorkGroupScope(existing, scope)) return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    const deleted = await store.remove(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
