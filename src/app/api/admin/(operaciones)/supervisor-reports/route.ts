import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createCrudStore, getOperationsErrorMessage, supervisorReportSchema } from "@/lib/operationsStore";
import type { SupervisorReport } from "@/types/admin";

const store = createCrudStore<SupervisorReport>("supervisor_reports", supervisorReportSchema);
const allowedReportModules = ["supervisor-daily-report", "report-approvals", "accounting", "payment-calculation", "exports"];

async function canUseReports() {
  return (await Promise.all(allowedReportModules.map((module) => hasModuleAccess(module)))).some(Boolean);
}

export async function GET() {
  if (!(await canUseReports())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, items: await store.list() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("supervisor-daily-report"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, item: await store.create(await req.json()) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
