import "server-only";

import { google } from "googleapis";
import { getDb } from "@/lib/mongodb";

const settingsCollection = "app_settings";
const driveOAuthTokenKey = "google_drive_oauth_refresh_token";
const driveScope = "https://www.googleapis.com/auth/drive";

export async function getDriveClient(redirectUri?: string) {
  const oauthClient = await getAuthorizedOAuthClient(redirectUri);
  if (oauthClient) return google.drive({ version: "v3", auth: oauthClient });

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Drive service account environment variables.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [driveScope],
  });

  return google.drive({ version: "v3", auth });
}

export function hasGoogleDriveOAuthClientConfig() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function getGoogleDriveOAuthClient(redirectUri: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleDriveOAuthUrl(origin: string, state: string) {
  const redirectUri = `${origin}/api/admin/google-drive/oauth/callback`;
  const client = getGoogleDriveOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [driveScope],
    state,
  });
}

export async function saveGoogleDriveRefreshToken(refreshToken: string, email?: string) {
  const db = await getDb();
  await db.collection(settingsCollection).updateOne(
    { key: driveOAuthTokenKey },
    {
      $set: {
        key: driveOAuthTokenKey,
        refreshToken,
        email,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getGoogleDriveRefreshToken() {
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) return process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const db = await getDb();
  const setting = await db.collection(settingsCollection).findOne({ key: driveOAuthTokenKey });
  return typeof setting?.refreshToken === "string" ? setting.refreshToken : undefined;
}

async function getAuthorizedOAuthClient(redirectUri = "http://localhost:3000/api/admin/google-drive/oauth/callback") {
  if (!hasGoogleDriveOAuthClientConfig()) return null;
  const refreshToken = await getGoogleDriveRefreshToken();
  if (!refreshToken) return null;

  const client = getGoogleDriveOAuthClient(redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
