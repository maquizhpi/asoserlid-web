"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/types/blog";

const emptyPost: Post = {
  slug: "",
  title: "",
  excerpt: "",
  cover: "/blog/oficinas.jpg",
  date: new Date().toISOString().slice(0, 10),
  author: "Equipo ASOSERLID",
  tags: [],
  content: "<p></p>",
};

export default function BlogAdminPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("new");
  const [form, setForm] = useState<Post>(emptyPost);
  const [tagText, setTagText] = useState("");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  const selectedPost = useMemo(
    () => posts.find((post) => post.slug === selectedSlug),
    [posts, selectedSlug]
  );

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const nextPost = selectedPost || emptyPost;
    setForm(nextPost);
    setTagText(nextPost.tags?.join(", ") || "");
    setShowHtml(false);

    window.setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = nextPost.content || "<p></p>";
      }
    }, 0);
  }, [selectedPost]);

  async function loadPosts() {
    setLoading(true);
    const res = await fetch("/api/admin/posts");
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }
    setLoading(false);
  }

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login),
    });

    if (!res.ok) {
      setStatus("Usuario o contraseña incorrectos.");
      return;
    }

    setLogin({ email: "", password: "" });
    await loadPosts();
  }

  async function savePost(e: FormEvent) {
    e.preventDefault();
    const content = editorRef.current?.innerHTML.trim() || "";
    setStatus("Guardando publicación...");

    const payload = {
      ...form,
      content,
      tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean),
    };

    const isNew = selectedSlug === "new";
    const res = await fetch(isNew ? "/api/admin/posts" : `/api/admin/posts/${selectedSlug}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar la publicación.");
      return;
    }

    setStatus("Publicación guardada correctamente.");
    await loadPosts();
    setSelectedSlug(data.post.slug);
  }

  async function deleteSelectedPost() {
    if (selectedSlug === "new") return;
    const confirmed = window.confirm("¿Eliminar esta publicación?");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/posts/${selectedSlug}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus("No se pudo eliminar la publicación.");
      return;
    }

    setStatus("Publicación eliminada.");
    setSelectedSlug("new");
    await loadPosts();
  }

  async function uploadImage(file: File, target: "cover" | "content") {
    setUploading(true);
    setStatus("Guardando imagen seleccionada...");

    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/admin/uploads", {
      method: "POST",
      body,
    });
    const data = await res.json().catch(() => ({}));

    setUploading(false);

    if (!res.ok) {
      setStatus(data.error || "No se pudo subir la imagen.");
      return;
    }

    if (target === "cover") {
      setForm((current) => ({ ...current, cover: data.imageUrl }));
      setStatus("Imagen seleccionada y vinculada como portada.");
    } else {
      insertImageInEditor(data.imageUrl);
      setStatus("Imagen seleccionada e insertada en el contenido.");
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setPosts([]);
  }

  function applyCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  function applyBlock(block: "P" | "H2" | "H3") {
    applyCommand("formatBlock", block);
  }

  function addLink() {
    const url = window.prompt("Pega el enlace");
    if (!url) return;
    applyCommand("createLink", url);
  }

  function insertImageInEditor(src: string) {
    editorRef.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<figure><img src="${src}" alt="Imagen del blog" /><figcaption>Describe esta imagen</figcaption></figure><p><br></p>`
    );
    syncEditorContent();
  }

  function syncEditorContent() {
    setForm((current) => ({
      ...current,
      content: editorRef.current?.innerHTML || "",
    }));
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-slate-600">Cargando panel...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <form onSubmit={submitLogin} className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#173C61]">Acceso de publicidad</h1>
          <p className="mt-2 text-sm text-slate-600">Ingresa para crear y editar publicaciones del blog.</p>

          <Field label="Correo" className="mt-6">
            <input
              required
              type="email"
              className={inputClass}
              value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })}
            />
          </Field>

          <Field label="Contraseña" className="mt-4">
            <input
              required
              type="password"
              className={inputClass}
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
            />
          </Field>

          <button className="mt-6 w-full rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">
            Ingresar
          </button>

          {status && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{status}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#173C61]">Administrar blog</h1>
            <p className="mt-2 text-slate-600">Crea publicaciones con texto enriquecido, portada y contenido HTML generado.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/blog" className="rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100">
              Ver blog
            </Link>
            <button onClick={logout} className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700">
              Salir
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <button
              onClick={() => setSelectedSlug("new")}
              className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]"
            >
              Nueva publicación
            </button>

            <div className="space-y-2">
              {posts.map((post) => (
                <button
                  key={post.slug}
                  onClick={() => setSelectedSlug(post.slug)}
                  className={`w-full rounded-md border px-4 py-3 text-left transition ${
                    selectedSlug === post.slug
                      ? "border-[#33C3C9] bg-[#E6F8F9]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-semibold text-[#173C61]">{post.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{post.date}</span>
                </button>
              ))}
            </div>
          </aside>

          <form onSubmit={savePost} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título">
                <input
                  required
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Slug">
                <input
                  className={inputClass}
                  placeholder="se-genera-automaticamente"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Fecha">
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Autor">
                <input
                  className={inputClass}
                  value={form.author || ""}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </Field>
            </div>

            <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-slate-200 bg-white md:w-56">
                  {form.cover ? (
                    <Image src={form.cover} alt="Portada del blog" fill sizes="224px" className="object-cover" unoptimized />
                  ) : null}
                </div>
                <div className="flex-1">
                  <Field label="Imagen de portada">
                    <input
                      required
                      className={inputClass}
                      placeholder="/blog/oficinas.jpg"
                      value={form.cover}
                      onChange={(e) => setForm({ ...form, cover: e.target.value })}
                    />
                  </Field>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file, "cover");
                        e.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => coverInputRef.current?.click()}
                      className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93] disabled:opacity-60"
                    >
                      {uploading ? "Guardando..." : "Seleccionar imagen"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <Field label="Resumen" className="mt-4">
              <textarea
                required
                className={`${inputClass} min-h-24`}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </Field>

            <Field label="Etiquetas separadas por coma" className="mt-4">
              <input
                className={inputClass}
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
              />
            </Field>

            <section className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
                <ToolbarButton onClick={() => applyBlock("P")}>Párrafo</ToolbarButton>
                <ToolbarButton onClick={() => applyBlock("H2")}>Título</ToolbarButton>
                <ToolbarButton onClick={() => applyBlock("H3")}>Subtítulo</ToolbarButton>
                <ToolbarButton onClick={() => applyCommand("bold")}>B</ToolbarButton>
                <ToolbarButton onClick={() => applyCommand("italic")}>I</ToolbarButton>
                <ToolbarButton onClick={() => applyCommand("underline")}>U</ToolbarButton>
                <ToolbarButton onClick={() => applyCommand("insertUnorderedList")}>Lista</ToolbarButton>
                <ToolbarButton onClick={() => applyCommand("insertOrderedList")}>1. Lista</ToolbarButton>
                <ToolbarButton onClick={addLink}>Enlace</ToolbarButton>
                <ToolbarButton onClick={() => contentImageInputRef.current?.click()}>Imagen</ToolbarButton>
                <ToolbarButton onClick={() => setShowHtml((value) => !value)}>
                  {showHtml ? "Ocultar HTML" : "Ver HTML"}
                </ToolbarButton>
              </div>
              <input
                ref={contentImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file, "content");
                  e.currentTarget.value = "";
                }}
              />

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorContent}
                className="blog-editor min-h-80 bg-white p-5 text-slate-700 outline-none"
              />
            </section>

            {showHtml && (
              <Field label="HTML generado" className="mt-4">
                <textarea
                  readOnly
                  className={`${inputClass} min-h-48 font-mono text-xs`}
                  value={form.content}
                />
              </Field>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">
                Guardar publicación
              </button>
              {selectedSlug !== "new" && (
                <>
                  <Link
                    href={`/blog/${selectedSlug}`}
                    className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ver detalle
                  </Link>
                  <button
                    type="button"
                    onClick={deleteSelectedPost}
                    className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>

            {status && <p className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p>}
          </form>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-2 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function ToolbarButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
