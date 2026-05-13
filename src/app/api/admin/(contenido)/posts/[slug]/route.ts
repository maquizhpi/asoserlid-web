import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { auditSummary, recordAuditLog } from "@/lib/auditStore";
import { deletePost, getBlogErrorMessage, updatePost } from "@/lib/blogStore";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function PUT(req: NextRequest, { params }: Context) {
  if (!(await hasModuleAccess("blog"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await req.json();
    const post = await updatePost(slug, body);

    if (!post) {
      return NextResponse.json({ ok: false, error: "Publicación no encontrada." }, { status: 404 });
    }

    await recordAuditLog({
      action: "update",
      moduleKey: "blog",
      collection: "blog_posts",
      recordId: post.slug,
      recordLabel: post.title,
      summary: auditSummary("update", `publicacion ${post.title}`),
    });
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    return NextResponse.json({ ok: false, error: getBlogErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  if (!(await hasModuleAccess("blog"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const { slug } = await params;
  const deleted = await deletePost(slug);

  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Publicación no encontrada." }, { status: 404 });
  }

  await recordAuditLog({
    action: "delete",
    moduleKey: "blog",
    collection: "blog_posts",
    recordId: slug,
    recordLabel: slug,
    summary: auditSummary("delete", `publicacion ${slug}`),
  });
  return NextResponse.json({ ok: true });
}
