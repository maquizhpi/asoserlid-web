import { NextRequest, NextResponse } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { getDb } from "@/lib/mongodb";
import { workerDocumentSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { WorkerDocument } from "@/types/admin";

const handlers = createAdminCrudHandlers<WorkerDocument>("worker_documents", "worker-documents", workerDocumentSchema);

export async function GET() {
  const scope = await getWorkGroupScope();
  if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (scope.global) return handlers.list();

  const db = await getDb();
  const workers = await db.collection("workers").find(scopedWorkGroupQuery(scope), { projection: { _id: 1, firstName: 1, lastName: 1 } }).toArray();
  const workerIds = workers.map((worker) => worker._id?.toString()).filter(Boolean);
  const workerNames = workers.map((worker) => `${String(worker.firstName || "")} ${String(worker.lastName || "")}`.trim()).filter(Boolean);
  const query = workerIds.length || workerNames.length
    ? { $or: [{ workerId: { $in: workerIds } }, { workerName: { $in: workerNames } }] }
    : { _id: { $exists: false } };
  return handlers.list(query);
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
