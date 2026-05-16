import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { getAdminSession, hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { createCrudStore, getOperationsErrorMessage, supervisorReportSchema } from "@/lib/operationsStore";
import type { SupervisorReport } from "@/types/admin";
import { createSupervisorReportNotifications } from "../route";

const store = createCrudStore<SupervisorReport>("supervisor_reports", supervisorReportSchema);
type RouteContext = { params: Promise<{ id: string }> };
const editableReportModules = ["supervisor-daily-report", "report-approvals"];

async function canEditReports() {
  const session = await getAdminSession();
  if (!session) return false;
  if (session.roles.some((role) => ["administrator", "supervisor", "operations"].includes(role))) return true;
  return (await Promise.all(editableReportModules.map((module) => hasModuleAccess(module)))).some(Boolean);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await canEditReports())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const session = await getAdminSession();
    const db = await getDb();
    const current = await db.collection<Document>("supervisor_reports").findOne({ _id: new ObjectId(id) });
    if (current?.reportStatus === "approved" && !session?.roles.includes("administrator")) {
      return NextResponse.json({ ok: false, error: "Este reporte ya esta aprobado. Solo el administrador puede modificarlo." }, { status: 403 });
    }
    const input = supervisorReportSchema.parse(await req.json());
    const duplicate = await db.collection<Document>("supervisor_reports").findOne({
      _id: { $ne: new ObjectId(id) },
      date: input.date,
      contractId: input.contractId,
      workplaceId: input.workplaceId,
      areaId: input.areaId,
      shiftId: input.shiftId,
    });
    if (duplicate) {
      return NextResponse.json({ ok: false, error: "La asistencia de este contrato, lugar, area y turno ya fue registrada para este dia." }, { status: 400 });
    }
    const item = await store.update(id, input) as SupervisorReport | null;
    if (item && input.reportStatus === "submitted" && current?.reportStatus !== "submitted") {
      await createSupervisorReportNotifications(db, item);
    }
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("supervisor-daily-report"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const session = await getAdminSession();
  if (!session?.roles.some((role) => ["administrator", "supervisor", "operations"].includes(role))) {
    return NextResponse.json({ ok: false, error: "Tu rol puede revisar la informacion, pero no eliminar asistencia." }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const db = await getDb();
    const current = await db.collection<Document>("supervisor_reports").findOne({ _id: new ObjectId(id) });
    if (current?.reportStatus === "approved" && !session?.roles.includes("administrator")) {
      return NextResponse.json({ ok: false, error: "Este reporte ya esta aprobado. Solo el administrador puede eliminarlo." }, { status: 403 });
    }
    const deleted = await store.remove(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
