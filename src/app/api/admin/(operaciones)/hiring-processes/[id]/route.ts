import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { hiringProcessSchema } from "@/lib/operationsStore";
import type { HiringProcess } from "@/types/admin";

const handlers = createAdminCrudHandlers<HiringProcess>("hiring_processes", "hiring-processes", hiringProcessSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
