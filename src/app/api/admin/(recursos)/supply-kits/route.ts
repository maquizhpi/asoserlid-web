import { NextRequest, NextResponse } from "next/server";
import { createAdminCrudHandlers } from "@/lib/adminCrudRoute";
import { getDb } from "@/lib/mongodb";
import { supplyKitSchema } from "@/lib/operationsStore";
import { getWorkGroupScope, scopedWorkGroupQuery } from "@/lib/workGroupScope";
import type { SupplyKit } from "@/types/admin";

const handlers = createAdminCrudHandlers<SupplyKit>("supply_kits", "supply-kits", supplyKitSchema);

export async function GET() {
  const scope = await getWorkGroupScope();
  if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (scope.global) return handlers.list();

  const db = await getDb();
  const contracts = await db.collection("contracts").find(scopedWorkGroupQuery(scope), { projection: { _id: 1, clientName: 1 } }).toArray();
  const contractIds = contracts.map((contract) => contract._id?.toString()).filter(Boolean);
  const clientNames = contracts.map((contract) => String(contract.clientName || "")).filter(Boolean);
  const query = contractIds.length || clientNames.length
    ? { $or: [{ contractId: { $in: contractIds } }, { clientName: { $in: clientNames } }] }
    : { _id: { $exists: false } };
  return handlers.list(query);
}

export async function POST(req: NextRequest) {
  return handlers.create(req);
}
