import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { serviceTypeSchema } from "@/lib/operationsStore";
import type { ServiceType } from "@/types/admin";

const handlers = createAdminCrudHandlers<ServiceType>("service_types", "service-types", serviceTypeSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
