import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getAllBlogComments, getBlogCommentErrorMessage } from "@/lib/blogCommentsStore";

export async function GET() {
  if (!(await hasModuleAccess("blog"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const comments = await getAllBlogComments();
    return NextResponse.json({ ok: true, comments });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getBlogCommentErrorMessage(error) }, { status: 500 });
  }
}
