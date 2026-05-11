import "server-only";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

const cookieName = "asoserlid_admin";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  return Boolean(token && safeCompare(token, getExpectedToken()));
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, getExpectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export function validateAdminCredentials(username: string, password: string) {
  return (
    safeCompare(username, process.env.BLOG_ADMIN_USER || "publicidad") &&
    safeCompare(password, process.env.BLOG_ADMIN_PASSWORD || "Asoserlid2026!")
  );
}

function getExpectedToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.BLOG_ADMIN_PASSWORD || "asoserlid-local-admin";
  return createHash("sha256").update(`asoserlid:${secret}`).digest("hex");
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
