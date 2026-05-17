import { NextRequest, NextResponse } from "next/server";
import { type Document } from "mongodb";
import { getAdminSession, hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { createCrudStore, getOperationsErrorMessage, supervisorReportSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { SupervisorReport, UserRole } from "@/types/admin";

const store = createCrudStore<SupervisorReport>("supervisor_reports", supervisorReportSchema);
const allowedReportModules = ["supervisor-daily-report", "report-approvals", "accounting", "payment-calculation", "exports"];

async function canUseReports() {
  return (await Promise.all(allowedReportModules.map((module) => hasModuleAccess(module)))).some(Boolean);
}

export async function GET() {
  if (!(await canUseReports())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    return NextResponse.json({ ok: true, items: await store.list(scopedWorkGroupQuery(scope)) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("supervisor-daily-report"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const session = await getAdminSession();
  if (!session?.roles.some((role) => ["administrator", "general_manager", "general_supervisor", "supervisor", "operations"].includes(role))) {
    return NextResponse.json({ ok: false, error: "Tu rol puede revisar la informacion, pero no enviar asistencia." }, { status: 403 });
  }
  try {
    const input = supervisorReportSchema.parse(await req.json());
    const db = await getDb();
    const existing = await db.collection<Document>("supervisor_reports").findOne({
      date: input.date,
      contractId: input.contractId,
      workplaceId: input.workplaceId,
      areaId: input.areaId,
      shiftId: input.shiftId,
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "La asistencia de este contrato, lugar, area y turno ya fue registrada para este dia." }, { status: 400 });
    }
    const item = await store.create(input) as SupervisorReport;
    if (item.reportStatus === "submitted") await createSupervisorReportNotifications(db, item);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function createSupervisorReportNotifications(db: Awaited<ReturnType<typeof getDb>>, report: SupervisorReport) {
  const roles: Array<UserRole | "all"> = ["administrator", "general_manager", "general_supervisor", "operations", "supervisor"];
  const title = "Reporte diario enviado";
  const message = [
    `${report.supervisor || "Supervisor"} envio un reporte diario para revision.`,
    `Contrato: ${report.contractName || report.clientName}`,
    `Lugar: ${report.workplaceName || "Sin lugar"} | Area: ${report.areaName || "Sin area"} | Turno: ${report.shiftName || "Sin turno"}`,
    `Fecha: ${report.date}`,
  ].join("\n");
  const now = new Date();

  for (const role of roles) {
    const existing = await db.collection("notifications").findOne({ title, role, message, status: "active" });
    if (existing) continue;
    await db.collection("notifications").insertOne({
      title,
      role,
      message,
      dueDate: report.date,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }
}
