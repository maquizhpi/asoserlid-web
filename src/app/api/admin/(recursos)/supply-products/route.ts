import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { supplyProductSchema } from "@/lib/operationsStore";
import type { SupplyProduct } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyProduct>("supply_products", "supply-products", supplyProductSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
