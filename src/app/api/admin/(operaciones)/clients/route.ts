import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { clientSchema, createCrudStore, getOperationsErrorMessage } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { Client } from "@/types/admin";

const store = createCrudStore<Client>("clients", clientSchema);

export async function GET() {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    if (scope.global) return NextResponse.json({ ok: true, items: await store.list() });

    const db = await getDb();
    const contracts = await db.collection("contracts").find(scopedWorkGroupQuery(scope), { projection: { clientId: 1, clientName: 1 } }).toArray();
    const clientIds = contracts.map((contract) => String(contract.clientId || "")).filter(ObjectId.isValid).map((id) => new ObjectId(id));
    const clientNames = contracts.map((contract) => String(contract.clientName || "")).filter(Boolean);
    const query = clientIds.length || clientNames.length
      ? { $or: [{ _id: { $in: clientIds } }, { name: { $in: clientNames } }, scopedWorkGroupQuery(scope)] }
      : scopedWorkGroupQuery(scope);
    return NextResponse.json({ ok: true, items: await store.list(query) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    const input = clientSchema.parse(await req.json());
    const scopedInput = scope.global || input.workGroupId ? input : { ...input, workGroupId: scope.workGroupIds[0] || "", workGroupName: scope.workGroupNames[0] || "" };
    if (!scope.global && !scope.workGroupIds.includes(scopedInput.workGroupId || "")) {
      return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, item: await store.create(scopedInput) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
