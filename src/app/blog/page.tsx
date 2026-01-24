// /app/blog/page.tsx
import type { Metadata } from "next";
import BlogPostCard from "@/components/BlogPostCard";
import { getAllPosts } from "@/data/posts";

export const metadata: Metadata = {
  title: "Blog | ASOSERLID",
  description: "Artículos y buenas prácticas de limpieza profesional y bioseguridad.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Blog de ASOSERLID
        </h1>
        <p className="mt-2 text-gray-600">
          Experiencias, guías y aprendizajes en limpieza hospitalaria, oficinas y más.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-gray-600">No hay publicaciones todavía.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
