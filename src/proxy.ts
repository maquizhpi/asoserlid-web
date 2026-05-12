import { NextRequest, NextResponse } from "next/server";

type AdminSession = {
  roles?: string[];
  moduleAccess?: string[];
  exp?: number;
};

const protectedRoutes: Record<string, string[]> = {
  "/admin/configuraciones": ["roles", "users"],
  "/admin/catalogos": ["roles", "users"],
  "/admin/tipos-servicios": ["roles", "users"],
  "/admin/roles": ["roles"],
  "/admin/usuarios": ["users"],
  "/admin/trabajadores": ["workers"],
  "/admin/dashboard-supervisor": ["dashboard-supervisor"],
  "/admin/dashboard-contabilidad": ["dashboard-accounting"],
  "/admin/nuevos-trabajadores": ["worker-intake"],
  "/admin/documentos-trabajadores": ["worker-documents"],
  "/admin/historial-laboral": ["labor-history"],
  "/admin/grupos-trabajo": ["work-groups"],
  "/admin/clientes": ["clients"],
  "/admin/contratos-turnos": ["contracts-shifts"],
  "/admin/reporte-supervisor": ["supervisor-daily-report"],
  "/admin/aprobacion-reportes": ["report-approvals"],
  "/admin/contabilidad": ["accounting"],
  "/admin/calculo-pagos": ["payment-calculation"],
  "/admin/reportes": ["exports"],
  "/admin/equipos": ["machines"],
  "/admin/productos-insumos": ["supply-products"],
  "/admin/kits-insumos": ["supply-kits"],
  "/admin/control-insumos": ["supply-control"],
  "/admin/procesos-contratacion": ["hiring-processes"],
  "/admin/calendario-procesos": ["process-calendar"],
  "/admin/notificaciones": ["notifications"],
  "/admin/blog": ["roles", "users"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin") {
    return NextResponse.next();
  }

  const requiredModules = getRequiredModules(pathname);
  if (!requiredModules) {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get("asoserlid_admin")?.value);
  if (!session) {
    return redirectToAdmin(req);
  }

  const isAdmin = session.roles?.includes("administrator");
  const hasAccess = requiredModules.some((moduleKey) => session.moduleAccess?.includes(moduleKey));

  if (!isAdmin && !hasAccess) {
    return redirectToAdmin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

function getRequiredModules(pathname: string) {
  const route = Object.keys(protectedRoutes).find((path) => pathname === path || pathname.startsWith(`${path}/`));
  return route ? protectedRoutes[route] : null;
}

function redirectToAdmin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  url.search = "";
  return NextResponse.redirect(url);
}

async function verifySession(token?: string) {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await signPayload(payload);
  if (signature !== expectedSignature) return null;

  try {
    const session = JSON.parse(atob(base64UrlToBase64(payload))) as AdminSession;
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return arrayBufferToBase64Url(signature);
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "asoserlid-local-admin";
}

function base64UrlToBase64(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
