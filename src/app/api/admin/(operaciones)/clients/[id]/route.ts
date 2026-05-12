import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { clientSchema, createCrudStore, getOperationsErrorMessage } from "@/lib/operationsStore";
import type { Client } from "@/types/admin";

const store = createCrudStore<Client>("clients", clientSchema);
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const item = await store.update(id, await req.json());
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("clients"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const deleted = await store.remove(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

