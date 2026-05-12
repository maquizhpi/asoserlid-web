import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { notificationSchema } from "@/lib/operationsStore";
import type { InternalNotification } from "@/types/admin";

const handlers = createAdminCrudHandlers<InternalNotification>("notifications", "notifications", notificationSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
