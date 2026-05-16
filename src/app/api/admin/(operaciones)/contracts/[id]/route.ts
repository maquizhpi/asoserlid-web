import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { contractSchema, createCrudStore, getOperationsErrorMessage, validateContractStaffAvailability } from "@/lib/operationsStore";
import { getWorkGroupScope, isRecordInWorkGroupScope } from "@/lib/workGroupScope";
import type { ServiceContract } from "@/types/admin";

const store = createCrudStore<ServiceContract>("contracts", contractSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("contracts-shifts"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const input = contractSchema.parse(await req.json());
    const scope = await getWorkGroupScope();
    if (!scope || !isRecordInWorkGroupScope(input, scope)) return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    await validateContractStaffAvailability(input, id);
    const item = await store.update(id, input);
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("contracts-shifts"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const db = await getDb();
    const existing = await db.collection("contracts").findOne({ _id: new ObjectId(id) });
    const scope = await getWorkGroupScope();
    if (!scope || !isRecordInWorkGroupScope(existing, scope)) return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    const hasHierarchy = Array.isArray(existing?.workplaces) && existing.workplaces.some((workplace) =>
      workplace?.areas?.some((area: { shifts?: { assignedStaff?: unknown[] }[] }) =>
        area.shifts?.some((shift) => (shift.assignedStaff || []).length > 0)
      ) || (workplace?.areas || []).length > 0
    );
    if (hasHierarchy) {
      return NextResponse.json({ ok: false, error: "No se puede eliminar un contrato con lugares, areas, turnos o personal asignado. Elimina primero su estructura." }, { status: 400 });
    }
    const deleted = await store.remove(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
