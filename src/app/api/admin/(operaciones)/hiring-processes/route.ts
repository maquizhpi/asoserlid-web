import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { hiringProcessSchema } from "@/lib/operationsStore";
import type { HiringProcess } from "@/types/admin";

const handlers = createAdminCrudHandlers<HiringProcess>("hiring_processes", "hiring-processes", hiringProcessSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
