import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { deleteMachine, getStoreErrorMessage, updateMachine } from "@/lib/machineStore";
import { getWorkGroupScope, isRecordInWorkGroupScope } from "@/lib/workGroupScope";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const input = await req.json();
    const scope = await getWorkGroupScope();
    if (!scope || !isRecordInWorkGroupScope(input, scope, ["ownerWorkGroupId"], ["ownerWorkGroupName"])) {
      return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    }
    const machine = await updateMachine(id, input);
    if (!machine) {
      return NextResponse.json({ ok: false, error: "Maquina no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, machine });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = await getDb();
    const existing = ObjectId.isValid(id) ? await db.collection("machines").findOne({ _id: new ObjectId(id) }) : null;
    const scope = await getWorkGroupScope();
    if (!scope || !isRecordInWorkGroupScope(existing, scope, ["ownerWorkGroupId"], ["ownerWorkGroupName"])) {
      return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    }
    const deleted = await deleteMachine(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Maquina no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 400 });
  }
}
