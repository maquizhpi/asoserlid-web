import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveOAuthClient, saveGoogleDriveRefreshToken } from "@/lib/googleDrive";

const stateCookie = "asoserlid_google_drive_oauth_state";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(stateCookie)?.value;
  cookieStore.delete(stateCookie);

  if (!code || !state || !expectedState || state !== expectedState) {
    return html("No se pudo validar la autorizacion de Google Drive.", false);
  }

  try {
    const redirectUri = `${url.origin}/api/admin/google-drive/oauth/callback`;
    const client = getGoogleDriveOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return html("Google no devolvio refresh token. Vuelve a iniciar la autorizacion con prompt=consent.", false);
    }

    client.setCredentials(tokens);
    const oauth2 = await client.getTokenInfo(tokens.access_token || "");
    await saveGoogleDriveRefreshToken(tokens.refresh_token, oauth2.email);

    return html(`Google Drive autorizado correctamente para ${oauth2.email || "la cuenta seleccionada"}. Ya puedes cerrar esta ventana.`, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar OAuth.";
    return html(message, false);
  }
}

function html(message: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Google Drive</title></head><body style="font-family:Arial;padding:32px;background:#f4f7fb;color:#173C61"><main style="max-width:680px;margin:auto;background:white;border:1px solid #d7e0ea;border-radius:10px;padding:24px"><h1>${ok ? "Autorizacion completa" : "Error de autorizacion"}</h1><p>${escapeHtml(message)}</p><a href="/admin/documentos-trabajadores" style="display:inline-block;margin-top:16px;background:#173C61;color:white;padding:12px 16px;border-radius:8px;text-decoration:none">Volver al sistema</a></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: ok ? 200 : 400 }
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}
