import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { supplyProductSchema } from "@/lib/operationsStore";
import type { SupplyProduct } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyProduct>("supply_products", "supply-products", supplyProductSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
