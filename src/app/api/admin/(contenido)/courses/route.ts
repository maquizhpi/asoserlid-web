import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { courseSchema } from "@/lib/contentStore";
import type { CourseItem } from "@/types/admin";

const handlers = createAdminCrudHandlers<CourseItem>("courses", "courses", courseSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
