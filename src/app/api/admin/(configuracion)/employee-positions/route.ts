import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { ensureDefaultEmployeePositions, employeePositionSchema } from "@/lib/operationsStore";
import type { EmployeePosition } from "@/types/admin";

const handlers = createAdminCrudHandlers<EmployeePosition>("employee_positions", "catalogs", employeePositionSchema);

export async function GET() {
  await ensureDefaultEmployeePositions();
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
