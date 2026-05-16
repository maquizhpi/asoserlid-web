import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const canUpload = await Promise.all(["machines", "workers", "worker-documents", "worker-intake", "service-types", "catalogs", "blog", "gallery", "certifications", "work-groups"].map((module) => hasModuleAccess(module)));
  if (!canUpload.some(Boolean)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "asoserlid/multimedia");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no recibido." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudinary = getCloudinary();

    const result = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          use_filename: true,
          unique_filename: true,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error || new Error("No se pudo subir el archivo a Cloudinary."));
            return;
          }

          resolve({
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            resource_type: uploadResult.resource_type,
          });
        }
      );

      stream.end(buffer);
    });

    return NextResponse.json({
      ok: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
