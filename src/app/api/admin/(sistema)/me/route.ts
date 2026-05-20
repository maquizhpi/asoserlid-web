import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/adminAuth";

export async function GET() {
  const user = await getCurrentAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  return NextResponse.json({
    ok: true,
    user: {
      name: user.name || user.email,
      email: user.email,
      roles: user.roles,
      moduleAccess: user.moduleAccess,
    },
  });
}
