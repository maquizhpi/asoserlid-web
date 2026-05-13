import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getGoogleDriveOAuthUrl } from "@/lib/googleDrive";

const stateCookie = "asoserlid_google_drive_oauth_state";

export async function GET(req: NextRequest) {
  const canConfigure = (await hasModuleAccess("worker-documents")) || (await hasModuleAccess("worker-intake"));
  if (!canConfigure) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(stateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });

  return NextResponse.redirect(getGoogleDriveOAuthUrl(req.nextUrl.origin, state));
}
