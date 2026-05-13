import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  return NextResponse.json({
    ok: true,
    user: {
      name: session.name || session.email,
      email: session.email,
      roles: session.roles,
      moduleAccess: session.moduleAccess,
    },
  });
}
