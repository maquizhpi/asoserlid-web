import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getGoogleDriveRefreshToken, hasGoogleDriveOAuthClientConfig } from "@/lib/googleDrive";

export async function GET() {
  const canRead = (await hasModuleAccess("worker-documents")) || (await hasModuleAccess("worker-intake"));
  if (!canRead) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  return NextResponse.json({
    ok: true,
    oauthClientConfigured: hasGoogleDriveOAuthClientConfig(),
    refreshTokenConfigured: Boolean(await getGoogleDriveRefreshToken()),
    folderConfigured: Boolean(process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID),
  });
}
