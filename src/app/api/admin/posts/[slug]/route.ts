import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { deletePost, getBlogErrorMessage, updatePost } from "@/lib/blogStore";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function PUT(req: NextRequest, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await req.json();
    const post = await updatePost(slug, body);

    if (!post) {
      return NextResponse.json({ ok: false, error: "Publicación no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    return NextResponse.json({ ok: false, error: getBlogErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const { slug } = await params;
  const deleted = await deletePost(slug);

  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Publicación no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
