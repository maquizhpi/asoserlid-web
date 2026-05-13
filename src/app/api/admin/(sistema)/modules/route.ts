import { NextResponse } from "next/server";
import { adminModules } from "@/lib/adminModules";
import { getCurrentAdminUser } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const user = await getCurrentAdminUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const visibleModules = user.roles.includes("administrator")
      ? adminModules
      : adminModules.filter((module) => user.moduleAccess.includes(module.key));
    const modules = await Promise.all(
      visibleModules.map(async (module) => ({
        key: module.key,
        title: module.title,
        href: module.href,
        description: module.description,
        status: module.status,
        required: module.required,
        count: module.collection ? await db.collection(module.collection).countDocuments() : null,
      }))
    );

    return NextResponse.json({ ok: true, modules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar MongoDB.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
