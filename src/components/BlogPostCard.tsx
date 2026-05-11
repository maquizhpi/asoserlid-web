import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/blog";

type Props = {
  post: Post;
  className?: string;
};

export default function BlogPostCard({ post, className = "" }: Props) {
  return (
    <article className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${className}`}>
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            priority={false}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-2 transition duration-300 hover:scale-105"
            unoptimized={post.cover.startsWith("http")}
          />
        </div>
      </Link>

      <div className="p-5">
        <div className="text-sm text-slate-500">
          {formatDate(post.date)} {post.author ? `• ${post.author}` : ""}
        </div>

        <Link href={`/blog/${post.slug}`} className="block">
          <h2 className="mt-3 text-xl font-bold tracking-tight text-[#173C61] hover:text-[#218F93]">
            {post.title}
          </h2>
        </Link>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/blog/${post.slug}`}
          className="mt-5 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Leer más
        </Link>
      </div>
    </article>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });
}
