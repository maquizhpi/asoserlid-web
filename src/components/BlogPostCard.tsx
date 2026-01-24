// /components/BlogPostCard.tsx
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/data/posts";

type Props = {
  post: Post;
  className?: string;
};

export default function BlogPostCard({ post, className = "" }: Props) {
  return (
    <article className={`rounded-2xl border p-4 md:p-5 hover:shadow-sm transition ${className}`}>
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            priority={false}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">{post.title}</h2>
      </Link>

      <div className="mt-1 text-sm text-gray-500">
        {formatDate(post.date)} {post.author ? `• ${post.author}` : ""}
      </div>

      <p className="mt-3 text-gray-700">{post.excerpt}</p>

      {post.tags && post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="text-xs rounded-full bg-gray-100 px-3 py-1 text-gray-700"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Leer más
        </Link>
      </div>
    </article>
  );
}

function formatDate(iso: string) {
  // Ajusta a tu preferencia/localización
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });
}
