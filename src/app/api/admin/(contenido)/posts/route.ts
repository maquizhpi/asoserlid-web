import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { auditSummary, recordAuditLog } from "@/lib/auditStore";
import { createPost, getAllPosts, getBlogErrorMessage } from "@/lib/blogStore";

export async function GET() {
  if (!(await hasModuleAccess("blog"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const posts = await getAllPosts();
  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("blog"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const post = await createPost(body);
    await recordAuditLog({
      action: "create",
      moduleKey: "blog",
      collection: "blog_posts",
      recordId: post.slug,
      recordLabel: post.title,
      summary: auditSummary("create", `publicacion ${post.title}`),
    });
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    return NextResponse.json({ ok: false, error: getBlogErrorMessage(error) }, { status: 400 });
  }
}
