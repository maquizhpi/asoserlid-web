import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { workerDocumentSchema } from "@/lib/operationsStore";
import type { WorkerDocument } from "@/types/admin";

const handlers = createAdminCrudHandlers<WorkerDocument>("worker_documents", "worker-documents", workerDocumentSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
