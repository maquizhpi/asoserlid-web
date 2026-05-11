import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getDriveClient } from "@/lib/googleDrive";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const drive = getDriveClient();

    const metadata = await drive.files.get({
      fileId: id,
      fields: "mimeType,name",
    });

    const file = await drive.files.get(
      {
        fileId: id,
        alt: "media",
      },
      { responseType: "stream" }
    );

    const stream = Readable.toWeb(file.data as Readable) as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": metadata.data.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("DRIVE IMAGE ERROR:", error);
    return NextResponse.json({ ok: false, error: "Imagen no encontrada." }, { status: 404 });
  }
}
