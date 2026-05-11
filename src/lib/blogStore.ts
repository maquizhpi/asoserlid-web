import "server-only";

import { head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import type { Post, PostInput } from "@/types/blog";

const postsFile = path.join(process.cwd(), "src", "data", "blog-posts.json");
const blobPostsPath = "blog/blog-posts.json";

const postSchema = z.object({
  slug: z.string().min(1, "El slug es obligatorio."),
  title: z.string().min(3, "El título debe tener al menos 3 caracteres."),
  excerpt: z.string().min(5, "El resumen debe tener al menos 5 caracteres."),
  cover: z.string().min(1, "La imagen de portada es obligatoria."),
  date: z.string().min(10, "La fecha es obligatoria."),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().min(5, "El contenido debe tener al menos 5 caracteres."),
});

const postInputSchema = postSchema.omit({ slug: true }).extend({
  slug: z.string().optional(),
});

export async function getAllPosts() {
  const posts = await readPosts();
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string) {
  const posts = await readPosts();
  return posts.find((p) => p.slug === slug);
}

export async function createPost(input: PostInput) {
  const data = postInputSchema.parse(normalizeInput(input));
  const posts = await readPosts();
  const slug = uniqueSlug(data.slug || slugify(data.title), posts);
  const post: Post = { ...data, slug };

  posts.push(post);
  await writePosts(posts);
  return post;
}

export async function updatePost(slug: string, input: PostInput) {
  const data = postInputSchema.parse(normalizeInput(input));
  const posts = await readPosts();
  const index = posts.findIndex((p) => p.slug === slug);

  if (index === -1) return null;

  const nextSlug = data.slug && data.slug !== slug ? uniqueSlug(data.slug, posts.filter((p) => p.slug !== slug)) : slug;
  const post: Post = { ...data, slug: nextSlug };

  posts[index] = post;
  await writePosts(posts);
  return post;
}

export async function deletePost(slug: string) {
  const posts = await readPosts();
  const nextPosts = posts.filter((p) => p.slug !== slug);
  if (nextPosts.length === posts.length) return false;

  await writePosts(nextPosts);
  return true;
}

export function getBlogErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo guardar la publicación.";
}

async function readPosts() {
  if (shouldUseBlobStore()) {
    return readPostsFromBlob();
  }

  const raw = await fs.readFile(postsFile, "utf8");
  const json = JSON.parse(raw);
  return z.array(postSchema).parse(json) as Post[];
}

async function writePosts(posts: Post[]) {
  const sorted = posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  if (shouldUseBlobStore()) {
    await writePostsToBlob(sorted);
    return;
  }

  if (process.env.VERCEL === "1") {
    throw new Error(
      "Vercel no permite guardar blogs en archivos del proyecto. Conecta Vercel Blob y configura BLOB_READ_WRITE_TOKEN."
    );
  }

  await fs.writeFile(postsFile, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

async function readPostsFromBlob() {
  try {
    const blob = await head(blobPostsPath);
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo leer el archivo de blogs en Vercel Blob.");
    const json = await res.json();
    return z.array(postSchema).parse(json) as Post[];
  } catch (error) {
    if (isBlobNotFound(error)) {
      const initialPosts = await readInitialPostsFromFile();
      await writePostsToBlob(initialPosts);
      return initialPosts;
    }

    throw error;
  }
}

async function readInitialPostsFromFile() {
  const raw = await fs.readFile(postsFile, "utf8");
  const json = JSON.parse(raw);
  return z.array(postSchema).parse(json) as Post[];
}

async function writePostsToBlob(posts: Post[]) {
  await put(blobPostsPath, JSON.stringify(posts, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

function shouldUseBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isBlobNotFound(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("requested blob does not exist")
  );
}

function normalizeInput(input: PostInput) {
  return {
    ...input,
    slug: input.slug ? slugify(input.slug) : undefined,
    title: input.title?.trim(),
    excerpt: input.excerpt?.trim(),
    cover: input.cover?.trim(),
    date: input.date?.trim(),
    author: input.author?.trim() || "Equipo ASOSERLID",
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    content: input.content?.trim(),
  };
}

function uniqueSlug(baseSlug: string, posts: Post[]) {
  const cleanBase = slugify(baseSlug) || "publicacion";
  let slug = cleanBase;
  let count = 2;

  while (posts.some((p) => p.slug === slug)) {
    slug = `${cleanBase}-${count}`;
    count += 1;
  }

  return slug;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
