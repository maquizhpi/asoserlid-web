// /app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/data/posts";

type Params = { slug: string };

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
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

export default function PostPage({ params }: { params: Params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <article>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{post.title}</h1>
        <div className="mt-2 text-sm text-gray-500">
          {formatDate(post.date)} {post.author ? `• ${post.author}` : ""}
        </div>

        <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Render simple y seguro (contenido proviene de tu propio array) */}
        <div
          className="prose prose-slate mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </main>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });
}
