import { NextRequest, NextResponse } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { ensureDefaultServiceTypes, serviceTypeSchema } from "@/lib/operationsStore";
import type { ServiceType } from "@/types/admin";

const handlers = createAdminCrudHandlers<ServiceType>("service_types", "service-types", serviceTypeSchema);

export async function GET() {
  await ensureDefaultServiceTypes();
  if (await hasModuleAccess("service-types")) return handlers.list();
  if (!(await hasModuleAccess("contracts-shifts"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const db = await getDb();
  const items = await db.collection("service_types").find().sort({ name: 1 }).toArray();
  return NextResponse.json({
    ok: true,
    items: items.map((item) => ({
      ...item,
      _id: item._id?.toString(),
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
