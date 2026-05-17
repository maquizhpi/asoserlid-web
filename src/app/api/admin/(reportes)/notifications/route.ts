import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { notificationSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { InternalNotification } from "@/types/admin";

const handlers = createAdminCrudHandlers<InternalNotification>("notifications", "notifications", notificationSchema);

export async function GET() {
  const scope = await getWorkGroupScope();
  if (!scope || scope.global) return handlers.list();
  const scoped = scopedWorkGroupQuery(scope);
  return handlers.list({
    $or: [
      { workGroupId: { $exists: false }, workGroupName: { $exists: false } },
      ...("$or" in scoped && Array.isArray(scoped.$or) ? scoped.$or : []),
    ],
  });
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
