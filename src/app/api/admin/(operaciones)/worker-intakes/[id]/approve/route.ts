import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, validateWorkerDocumentId, workerSchema } from "@/lib/operationsStore";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const canApprove = (await hasModuleAccess("worker-intake")) && (await hasModuleAccess("workers"));
  if (!canApprove) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, error: "Ingreso no valido." }, { status: 400 });

    const db = await getDb();
    const intake = await db.collection<Document>("worker_intakes").findOne({ _id: new ObjectId(id) });
    if (!intake) return NextResponse.json({ ok: false, error: "Ingreso no encontrado." }, { status: 404 });
    if (intake.approvedWorkerId) return NextResponse.json({ ok: false, error: "Este ingreso ya fue convertido a trabajador." }, { status: 400 });

    const assignment = await req.json();
    const workerInput = workerSchema.parse({
      documentId: intake.documentId,
      firstName: getFirstName(String(intake.fullName || "")),
      lastName: getLastName(String(intake.fullName || "")),
      position: intake.position,
      phone: intake.phone,
      email: intake.email,
      status: "active",
      documents: intake.resumeUrl ? `Hoja de vida: ${intake.resumeUrl}` : "Ingreso aprobado desde formulario de nuevos trabajadores.",
      assignedClientId: assignment.assignedClientId,
      assignedClient: assignment.assignedClient,
      assignedContractId: assignment.assignedContractId,
      assignedContract: assignment.assignedContract,
      assignedArea: assignment.assignedArea,
      assignedSchedule: assignment.assignedSchedule,
      workGroupId: assignment.workGroupId,
      workGroupName: assignment.workGroupName,
      supervisor: "",
    });

    await validateWorkerDocumentId(workerInput.documentId);

    const now = new Date();
    const result = await db.collection<Document>("workers").insertOne({ ...workerInput, createdAt: now, updatedAt: now });
    await db.collection<Document>("worker_intakes").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "accepted", approvedWorkerId: result.insertedId.toString(), approvedAt: now.toISOString(), updatedAt: now } }
    );

    return NextResponse.json({ ok: true, workerId: result.insertedId.toString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

function getFirstName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return parts[0] || fullName;
  return parts.slice(0, Math.ceil(parts.length / 2)).join(" ");
}

function getLastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return "Sin apellido";
  if (parts.length === 2) return parts[1];
  return parts.slice(Math.ceil(parts.length / 2)).join(" ");
}
