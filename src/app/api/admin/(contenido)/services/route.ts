import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { serviceSchema } from "@/lib/contentStore";
import type { ServiceType } from "@/types/admin";

const handlers = createAdminCrudHandlers<ServiceType>("services", "services", serviceSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
