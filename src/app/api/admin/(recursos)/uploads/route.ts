import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getDriveClient } from "@/lib/googleDrive";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Debes seleccionar una imagen." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "El archivo debe ser una imagen." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (hasDriveConfig()) {
      return uploadToDrive(file, buffer);
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      return uploadToBlob(file, buffer);
    }

    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Vercel no permite guardar imagenes en public/blog/uploads. Conecta Vercel Blob y configura BLOB_READ_WRITE_TOKEN.",
        },
        { status: 500 }
      );
    }

    return uploadToLocalPublic(file, buffer);
  } catch (error) {
    console.error("IMAGE UPLOAD ERROR:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar la imagen seleccionada." },
      { status: 500 }
    );
  }
}

async function uploadToBlob(file: File, buffer: Buffer) {
  const safeName = sanitizeFileName(file.name);
  const extension = path.extname(safeName) || extensionFromMime(file.type);
  const baseName = path.basename(safeName, extension);
  const finalName = `${Date.now()}-${baseName}${extension}`;

  const blob = await put(`blog/uploads/${finalName}`, buffer, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({
    ok: true,
    storage: "blob",
    name: finalName,
    imageUrl: blob.url,
  });
}

async function uploadToLocalPublic(file: File, buffer: Buffer) {
  const uploadsDir = path.join(process.cwd(), "public", "blog", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName = sanitizeFileName(file.name);
  const extension = path.extname(safeName) || extensionFromMime(file.type);
  const baseName = path.basename(safeName, extension);
  const finalName = `${Date.now()}-${baseName}${extension}`;
  const finalPath = path.join(uploadsDir, finalName);

  await fs.writeFile(finalPath, buffer);

  return NextResponse.json({
    ok: true,
    storage: "local",
    name: finalName,
    imageUrl: `/blog/uploads/${finalName}`,
  });
}

async function uploadToDrive(file: File, buffer: Buffer) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID.");
  }

  const drive = await getDriveClient();
  const safeName = sanitizeFileName(file.name);

  const created = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${safeName}`,
      parents: [folderId],
      mimeType: file.type,
    },
    media: {
      mimeType: file.type,
      body: Readable.from(buffer),
    },
    fields: "id,name,webViewLink",
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("Google Drive did not return a file id.");
  }

  return NextResponse.json({
    ok: true,
    storage: "drive",
    fileId,
    name: created.data.name,
    driveUrl: created.data.webViewLink,
    imageUrl: `/api/drive-image/${fileId}`,
  });
}

function hasDriveConfig() {
  return Boolean(
    process.env.GOOGLE_DRIVE_FOLDER_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "imagen-blog.jpg";
}

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}
