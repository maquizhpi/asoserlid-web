import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getAuditLogs } from "@/lib/auditStore";

export async function GET() {
  if (!(await hasModuleAccess("audits"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, items: await getAuditLogs() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar auditorias.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
