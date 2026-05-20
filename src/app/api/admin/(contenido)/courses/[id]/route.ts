import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { courseSchema } from "@/lib/contentStore";
import type { CourseItem } from "@/types/admin";

type RouteContext = { params: Promise<{ id: string }> };

const handlers = createAdminCrudHandlers<CourseItem>("courses", "courses", courseSchema);

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
