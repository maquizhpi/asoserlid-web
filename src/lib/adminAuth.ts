import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getServerEnv } from "@/lib/env";
import { getUserById, validateUserCredentials } from "@/lib/userStore";
import type { AdminUser, UserRole } from "@/types/admin";

const cookieName = "asoserlid_admin";
const sessionMaxAge = 60 * 60 * 8;

type AdminSession = {
  userId: string;
  name?: string;
  email: string;
  roles: string[];
  moduleAccess: string[];
  exp: number;
};

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function hasModuleAccess(moduleKey: string) {
  const user = await getCurrentAdminUser();
  if (!user) return false;
  return user.roles.includes("administrator") || user.moduleAccess.includes(moduleKey);
}

export async function hasAnyRole(roles: string[]) {
  const user = await getCurrentAdminUser();
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role as UserRole));
}

export async function setAdminSession(user: AdminUser) {
  const cookieStore = await cookies();
  const session: AdminSession = {
    userId: user._id || "",
    name: user.name,
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

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  const session = verifySession(token);
  if (!session || session.exp < Math.floor(Date.now() / 1000)) return null;

  return session;
}

export async function getCurrentAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;

  if (session.userId) {
    const user = await getUserById(session.userId);
    if (user) return user.active ? user : null;
  }

  return {
    _id: session.userId,
    name: session.name || session.email,
    email: session.email,
    roles: session.roles as UserRole[],
    moduleAccess: session.moduleAccess,
    active: true,
  } satisfies AdminUser;
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
  const env = getServerEnv();
  return env.AUTH_SECRET || env.ADMIN_SESSION_SECRET;
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
