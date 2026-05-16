import { NextRequest, NextResponse } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { getDb } from "@/lib/mongodb";
import { supplyMovementSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { SupplyMovement } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyMovement>("supply_movements", "supply-control", supplyMovementSchema);

export async function GET() {
  const scope = await getWorkGroupScope();
  if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (scope.global) return handlers.list();

  const db = await getDb();
  const contracts = await db.collection("contracts").find(scopedWorkGroupQuery(scope), { projection: { clientId: 1, clientName: 1 } }).toArray();
  const clientIds = contracts.map((contract) => String(contract.clientId || "")).filter(Boolean);
  const clientNames = contracts.map((contract) => String(contract.clientName || "")).filter(Boolean);
  const query = clientIds.length || clientNames.length
    ? { $or: [{ clientId: { $in: clientIds } }, { clientName: { $in: clientNames } }] }
    : { _id: { $exists: false } };
  return handlers.list(query);
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
