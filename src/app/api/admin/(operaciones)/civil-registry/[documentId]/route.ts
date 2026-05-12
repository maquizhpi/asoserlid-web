import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { lookupCivilRegistryPerson } from "@/lib/civilRegistry";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  if (!(await hasModuleAccess("workers"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { documentId } = await context.params;
    const person = await lookupCivilRegistryPerson(documentId);
    return NextResponse.json({ ok: true, person });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar la cedula.";
    const status = message.includes("CIVIL_REGISTRY_API_URL") ? 501 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

