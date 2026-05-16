import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createMachine, getMachines, getStoreErrorMessage } from "@/lib/machineStore";
import { getWorkGroupScope, isRecordInWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";

export async function GET() {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    const machines = await getMachines(scopedWorkGroupQuery(scope, "ownerWorkGroupId", "ownerWorkGroupName"));
    return NextResponse.json({ ok: true, machines });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const input = await req.json();
    const scope = await getWorkGroupScope();
    if (!scope || !isRecordInWorkGroupScope(input, scope, ["ownerWorkGroupId"], ["ownerWorkGroupName"])) {
      return NextResponse.json({ ok: false, error: "No autorizado para este grupo de trabajo." }, { status: 403 });
    }
    const machine = await createMachine(input);
    return NextResponse.json({ ok: true, machine }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 400 });
  }
}
