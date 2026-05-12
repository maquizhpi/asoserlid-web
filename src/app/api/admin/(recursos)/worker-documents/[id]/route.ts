import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { workerDocumentSchema } from "@/lib/operationsStore";
import type { WorkerDocument } from "@/types/admin";

const handlers = createAdminCrudHandlers<WorkerDocument>("worker_documents", "worker-documents", workerDocumentSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
