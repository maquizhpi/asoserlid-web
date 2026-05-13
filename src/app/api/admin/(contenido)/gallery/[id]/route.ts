import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { galleryImageSchema } from "@/lib/operationsStore";
import type { GalleryImage } from "@/types/admin";

type RouteContext = { params: Promise<{ id: string }> };

const handlers = createAdminCrudHandlers<GalleryImage>("gallery_images", "gallery", galleryImageSchema);

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.update(req, id);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handlers.remove(id);
}
