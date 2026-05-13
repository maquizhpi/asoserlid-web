import type { Metadata } from "next";
import BlogPostCard from "@/components/BlogPostCard";
import { getPublishedPosts } from "@/lib/blogStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | ASOSERLID",
  description: "Artículos y buenas prácticas de limpieza profesional y bioseguridad.",
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#218F93]">
            Blog institucional
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#173C61] md:text-5xl">
            Blog de ASOSERLID
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Experiencias, guías y aprendizajes en limpieza hospitalaria, oficinas, bioseguridad y mantenimiento profesional.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        {posts.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
            No hay publicaciones todavía.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
