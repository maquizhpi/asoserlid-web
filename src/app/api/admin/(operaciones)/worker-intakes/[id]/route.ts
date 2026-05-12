import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { workerIntakeSchema } from "@/lib/operationsStore";
import type { WorkerIntake } from "@/types/admin";

const handlers = createAdminCrudHandlers<WorkerIntake>("worker_intakes", "worker-intake", workerIntakeSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
