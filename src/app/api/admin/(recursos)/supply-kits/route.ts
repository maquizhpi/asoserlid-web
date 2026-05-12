import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { supplyKitSchema } from "@/lib/operationsStore";
import type { SupplyKit } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyKit>("supply_kits", "supply-kits", supplyKitSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
