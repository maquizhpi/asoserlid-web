import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { supplyKitDeliverySchema } from "@/lib/operationsStore";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { getDb } from "@/lib/mongodb";
import type { SupplyKitDelivery } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyKitDelivery>("supply_kit_deliveries", "supply-kits", supplyKitDeliverySchema);

export async function GET() {
  return handlers.list();
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("supply-kits"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const input = supplyKitDeliverySchema.parse(await req.json());
    const db = await getDb();
    const existing = await db.collection("supply_kit_deliveries").findOne({ kitId: input.kitId, period: input.period });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Ya existe un registro mensual para este kit y periodo." }, { status: 400 });
    }
    const now = new Date();
    const document = { ...input, createdAt: now, updatedAt: now };
    const result = await db.collection("supply_kit_deliveries").insertOne(document);
    return NextResponse.json({
      ok: true,
      item: { ...document, _id: result.insertedId.toString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el registro mensual.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
