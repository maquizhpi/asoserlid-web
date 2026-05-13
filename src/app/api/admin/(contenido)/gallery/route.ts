import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { galleryImageSchema } from "@/lib/operationsStore";
import type { GalleryImage } from "@/types/admin";

const handlers = createAdminCrudHandlers<GalleryImage>("gallery_images", "gallery", galleryImageSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
