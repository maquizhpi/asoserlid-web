import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/adminAuth";
import { getWorkGroupScope } from "@/lib/workGroupScope";

export async function GET() {
  const user = await getCurrentAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const scope = await getWorkGroupScope();
  const workGroups = scope?.workGroups || [];

  return NextResponse.json({
    ok: true,
    user: {
      name: user.name || user.email,
      email: user.email,
      roles: user.roles,
      moduleAccess: user.moduleAccess,
      workGroups,
      primaryWorkGroupName: scope?.global ? "Todas las empresas" : workGroups[0]?.name || "",
      primaryWorkGroupLogo: scope?.global ? "" : workGroups[0]?.logoUrl || "",
    },
  });
}
