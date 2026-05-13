import { NextRequest } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { certificationSchema } from "@/lib/operationsStore";
import type { CertificationItem } from "@/types/admin";

const handlers = createAdminCrudHandlers<CertificationItem>("certifications", "certifications", certificationSchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
