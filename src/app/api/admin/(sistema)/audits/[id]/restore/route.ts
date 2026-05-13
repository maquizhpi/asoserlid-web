import { NextResponse } from "next/server";
import { restoreAuditLog } from "@/lib/auditStore";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await restoreAuditLog(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo restaurar la auditoria.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
