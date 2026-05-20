import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { recordAuditLog } from "@/lib/auditStore";
import { getWebDb } from "@/lib/mongodb";

const collections = [
  "users",
  "courses",
  "services",
  "blog_comments",
  "gallery_images",
  "certifications",
  "audit_logs",
];

export async function GET() {
  if (!(await hasModuleAccess("backups"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getWebDb();
    const data = Object.fromEntries(
      await Promise.all(collections.map(async (collection) => [collection, await db.collection(collection).find().toArray()]))
    );

    await recordAuditLog({
      action: "create",
      moduleKey: "backups",
      collection: "system_backup",
      recordLabel: "Respaldo manual",
      summary: "Genero respaldo manual del sistema",
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      collections,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el respaldo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
