import { NextResponse } from "next/server";
import { adminModules } from "@/lib/adminModules";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const modules = await Promise.all(
      adminModules.map(async (module) => ({
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
