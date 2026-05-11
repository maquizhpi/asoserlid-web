import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession, setAdminSession, validateAdminCredentials } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username || "");
  const password = String(body?.password || "");

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
