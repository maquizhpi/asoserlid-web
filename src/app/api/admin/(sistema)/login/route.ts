import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession, setAdminSession, validateAdminCredentials } from "@/lib/adminAuth";
import { getMongoConnectionErrorMessage } from "@/lib/mongodb";
import { getClientIp, checkRateLimit, rateLimitHeaders } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limited = checkRateLimit(`login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Intenta nuevamente en unos minutos." },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || body?.username || "");
  const password = String(body?.password || "");

  try {
    const user = await validateAdminCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Correo o contrasena incorrectos." },
        { status: 401, headers: rateLimitHeaders(limited) }
      );
    }

    await setAdminSession(user);
    return NextResponse.json({ ok: true, user }, { headers: rateLimitHeaders(limited) });
  } catch (error) {
    const message = getMongoConnectionErrorMessage(error);
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
