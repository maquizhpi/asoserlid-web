import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { validateUserCredentials } from "@/lib/userStore";
import type { AdminUser } from "@/types/admin";

const cookieName = "asoserlid_admin";
const sessionMaxAge = 60 * 60 * 8;

type AdminSession = {
  userId: string;
  email: string;
  roles: string[];
  moduleAccess: string[];
  exp: number;
};

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function hasModuleAccess(moduleKey: string) {
  const session = await getAdminSession();
  if (!session) return false;
  return session.roles.includes("administrator") || session.moduleAccess.includes(moduleKey);
}

export async function hasAnyRole(roles: string[]) {
  const session = await getAdminSession();
  if (!session) return false;
  return roles.some((role) => session.roles.includes(role));
}

export async function setAdminSession(user: AdminUser) {
  const cookieStore = await cookies();
  const session: AdminSession = {
    userId: user._id || "",
    email: user.email,
    roles: user.roles,
    moduleAccess: user.moduleAccess,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAge,
  };

  cookieStore.set(cookieName, signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAge,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function validateAdminCredentials(email: string, password: string) {
  return validateUserCredentials(email, password);
}

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  const session = verifySession(token);
  if (!session || session.exp < Math.floor(Date.now() / 1000)) return null;

  return session;
}

function signSession(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  if (!safeCompare(signature, expectedSignature)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
  } catch {
    return null;
  }
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "asoserlid-local-admin";
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
