import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createCrudStore, getOperationsErrorMessage, supervisorReportSchema } from "@/lib/operationsStore";
import type { SupervisorReport } from "@/types/admin";

const store = createCrudStore<SupervisorReport>("supervisor_reports", supervisorReportSchema);
type RouteContext = { params: Promise<{ id: string }> };
const editableReportModules = ["supervisor-daily-report", "report-approvals"];

async function canEditReports() {
  return (await Promise.all(editableReportModules.map((module) => hasModuleAccess(module)))).some(Boolean);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await canEditReports())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const item = await store.update(id, await req.json());
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("supervisor-daily-report"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const deleted = await store.remove(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
