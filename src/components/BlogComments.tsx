"use client";

import { FormEvent, useEffect, useState } from "react";
import type { BlogComment } from "@/types/blog";

export default function BlogComments({ postSlug, postTitle }: { postSlug: string; postTitle: string }) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", content: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/comments?slug=${encodeURIComponent(postSlug)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
      .catch(() => undefined);
  }, [postSlug]);

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("Enviando comentario...");
    const res = await fetch("/api/blog/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, postSlug, postTitle }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "No se pudo enviar el comentario.");
      return;
    }
    setForm({ authorName: "", authorEmail: "", content: "" });
    setStatus("Comentario enviado. Se publicara despues de la aprobacion.");
  }

  return (
    <section className="mt-12 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#218F93]">Comentarios</p>
        <h2 className="mt-2 text-2xl font-bold text-[#173C61]">Participa en esta publicacion</h2>
      </div>

      <form onSubmit={submitComment} className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <input required className={inputClass} placeholder="Tu nombre" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
          <input type="email" className={inputClass} placeholder="Correo opcional" value={form.authorEmail} onChange={(e) => setForm({ ...form, authorEmail: e.target.value })} />
        </div>
        <textarea required className={`${inputClass} min-h-28`} placeholder="Escribe tu comentario..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={saving} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93] disabled:opacity-60">
            {saving ? "Enviando" : "Publicar comentario"}
          </button>
          {status && <p className="text-sm font-medium text-slate-600">{status}</p>}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {comments.map((comment) => (
          <article key={comment._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-700">{comment.content}</p>
            <p className="mt-3 text-sm font-bold text-[#173C61]">{comment.authorName}</p>
          </article>
        ))}
        {comments.length === 0 && <p className="text-sm text-slate-500">Aun no hay comentarios aprobados.</p>}
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
