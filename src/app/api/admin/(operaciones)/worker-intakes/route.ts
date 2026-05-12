import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { workerIntakeSchema } from "@/lib/operationsStore";
import type { WorkerIntake } from "@/types/admin";

const handlers = createAdminCrudHandlers<WorkerIntake>("worker_intakes", "worker-intake", workerIntakeSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
