import { NextRequest, NextResponse } from "next/server";
import { createPendingComment, getApprovedComments, getBlogCommentErrorMessage } from "@/lib/blogCommentsStore";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ ok: false, error: "Publicacion no encontrada." }, { status: 400 });
  try {
    const comments = await getApprovedComments(slug);
    return NextResponse.json({ ok: true, comments });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getBlogCommentErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const comment = await createPendingComment(await req.json());
    return NextResponse.json({ ok: true, comment, message: "Comentario enviado. Se publicara despues de la aprobacion." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getBlogCommentErrorMessage(error) }, { status: 400 });
  }
}
