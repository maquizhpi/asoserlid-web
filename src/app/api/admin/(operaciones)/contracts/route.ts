import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { contractSchema, createCrudStore, getOperationsErrorMessage, validateContractStaffAvailability } from "@/lib/operationsStore";
import type { ServiceContract } from "@/types/admin";

const store = createCrudStore<ServiceContract>("contracts", contractSchema);

export async function GET() {
  if (!(await hasModuleAccess("contracts-shifts"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, items: await store.list() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("contracts-shifts"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const input = contractSchema.parse(await req.json());
    await validateContractStaffAvailability(input);
    return NextResponse.json({ ok: true, item: await store.create(input) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
