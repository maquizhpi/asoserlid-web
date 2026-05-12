import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { addMachineCustodyReceipt, getStoreErrorMessage } from "@/lib/machineStore";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const machine = await addMachineCustodyReceipt(id, await req.json());
    if (!machine) {
      return NextResponse.json({ ok: false, error: "Equipo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, machine }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getStoreErrorMessage(error) }, { status: 400 });
  }
}

