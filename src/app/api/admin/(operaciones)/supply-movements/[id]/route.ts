import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { supplyMovementSchema } from "@/lib/operationsStore";
import type { SupplyMovement } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyMovement>("supply_movements", "supply-control", supplyMovementSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
