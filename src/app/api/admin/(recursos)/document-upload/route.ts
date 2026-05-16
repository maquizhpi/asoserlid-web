import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDriveClient } from "@/lib/googleDrive";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const canUpload = await Promise.all(["worker-intake", "worker-documents", "supervisor-daily-report"].map((module) => hasModuleAccess(module)));
  if (!canUpload.some(Boolean)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folderName = String(formData.get("folderName") || "documentos-trabajadores");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no recibido." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Solo se permiten PDF o imagenes JPG, PNG y WEBP." }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json(
        { ok: false, error: "Configura GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID o GOOGLE_DRIVE_FOLDER_ID para guardar documentos." },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const drive = await getDriveClient(new URL(req.url).origin + "/api/admin/google-drive/oauth/callback");
    const safeName = sanitizeFileName(file.name);
    const name = `${folderName}-${Date.now()}-${safeName}`;

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name,
        parents: [folderId],
        mimeType: file.type,
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id,name,mimeType,webViewLink",
    });

    const fileId = created.data.id;
    if (!fileId) throw new Error("Google Drive no devolvio el ID del archivo.");

    return NextResponse.json({
      ok: true,
      storage: "drive",
      fileId,
      publicId: fileId,
      name: created.data.name,
      mimeType: created.data.mimeType,
      driveUrl: created.data.webViewLink,
      url: `/api/drive-file/${fileId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el documento a Google Drive.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function sanitizeFileName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "documento.pdf"
  );
}
