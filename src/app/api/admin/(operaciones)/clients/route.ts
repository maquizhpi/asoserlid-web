import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { clientSchema, createCrudStore, getOperationsErrorMessage } from "@/lib/operationsStore";
import type { Client } from "@/types/admin";

const store = createCrudStore<Client>("clients", clientSchema);

export async function GET() {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, items: await store.list() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, item: await store.create(await req.json()) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

