import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createCrudStore, getOperationsErrorMessage, validateWorkerIntakeDocumentId, workerIntakeSchema } from "@/lib/operationsStore";
import type { WorkerIntake } from "@/types/admin";

const store = createCrudStore<WorkerIntake>("worker_intakes", workerIntakeSchema);

export async function GET() {
  if (!(await hasModuleAccess("worker-intake"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, items: await store.list() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("worker-intake"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const input = workerIntakeSchema.parse(await req.json());
    await validateWorkerIntakeDocumentId(input.documentId);
    return NextResponse.json({ ok: true, item: await store.create(input) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
