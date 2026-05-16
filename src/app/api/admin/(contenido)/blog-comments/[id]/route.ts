import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getBlogCommentErrorMessage, reviewBlogComment } from "@/lib/blogCommentsStore";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("blog"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const comment = await reviewBlogComment(id, await req.json());
    if (!comment) return NextResponse.json({ ok: false, error: "Comentario no encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getBlogCommentErrorMessage(error) }, { status: 400 });
  }
}
