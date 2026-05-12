import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { supplyMovementSchema } from "@/lib/operationsStore";
import type { SupplyMovement } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyMovement>("supply_movements", "supply-control", supplyMovementSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
