import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientComments from "@/components/ClientComments";
import ShareButtons from "@/components/ShareButtons";
import { getPostBySlug } from "@/lib/blogStore";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Artículo no encontrado | ASOSERLID" };

  return {
    title: `${post.title} | ASOSERLID`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.cover }],
      type: "article",
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  return (
    <main className="bg-white">
      <article>
        <header className="border-b border-slate-200 bg-slate-50 px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <Link href="/blog" className="text-sm font-semibold text-[#218F93] hover:text-[#173C61]">
              Volver al blog
            </Link>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#173C61] md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
              <span>{formatDate(post.date)}</span>
              {post.author && <span>• {post.author}</span>}
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="relative flex min-h-[320px] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm md:min-h-[480px]">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-contain"
              priority
              unoptimized={post.cover.startsWith("http")}
            />
          </div>

          <div
            className="blog-content mt-10 max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-12">
            <ShareButtons title={post.title} slug={post.slug} />
          </div>

          <ClientComments />
        </div>
      </article>
    </main>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });
}
