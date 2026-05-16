import { NextRequest } from "next/server";
import { supplyKitDeliverySchema } from "@/lib/operationsStore";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import type { SupplyKitDelivery } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyKitDelivery>("supply_kit_deliveries", "supply-kits", supplyKitDeliverySchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
