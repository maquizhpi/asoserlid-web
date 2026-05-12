import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession, setAdminSession, validateAdminCredentials } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || body?.username || "");
  const password = String(body?.password || "");

  try {
    const user = await validateAdminCredentials(email, password);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Correo o contrasena incorrectos." }, { status: 401 });
    }

    await setAdminSession(user);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar con MongoDB.";
    return NextResponse.json(
      { ok: false, error: `No se pudo conectar con MongoDB: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
