import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { contractSchema, createCrudStore, getOperationsErrorMessage, validateContractStaffAvailability } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { ServiceContract } from "@/types/admin";

const store = createCrudStore<ServiceContract>("contracts", contractSchema);

export async function GET() {
  const canReadContracts = await Promise.all(["contracts-shifts", "machines"].map((module) => hasModuleAccess(module)));
  if (!canReadContracts.some(Boolean)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    return NextResponse.json({ ok: true, items: await store.list(scopedWorkGroupQuery(scope)) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("contracts-shifts"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const input = contractSchema.parse(await req.json());
    const scope = await getWorkGroupScope();
    if (!scope || !scope.global && !scope.workGroupIds.includes(input.workGroupId || "")) {
      return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    }
    await validateContractStaffAvailability(input);
    return NextResponse.json({ ok: true, item: await store.create(input) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
