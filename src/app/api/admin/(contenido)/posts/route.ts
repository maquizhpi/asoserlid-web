import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { createPost, getAllPosts, getBlogErrorMessage } from "@/lib/blogStore";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const posts = await getAllPosts();
  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const post = await createPost(body);
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    return NextResponse.json({ ok: false, error: getBlogErrorMessage(error) }, { status: 400 });
  }
}
