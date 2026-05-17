import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { deleteMachine, getStoreErrorMessage, updateMachine } from "@/lib/machineStore";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const input = await req.json();
    const machine = await updateMachine(id, input);
    if (!machine) {
      return NextResponse.json({ ok: false, error: "Maquina no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, machine });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteMachine(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Maquina no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 400 });
  }
}
