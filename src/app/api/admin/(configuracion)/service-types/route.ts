import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { ensureDefaultServiceTypes, serviceTypeSchema } from "@/lib/operationsStore";
import type { ServiceType } from "@/types/admin";

const handlers = createAdminCrudHandlers<ServiceType>("service_types", "service-types", serviceTypeSchema);

export async function GET() {
  await ensureDefaultServiceTypes();
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
