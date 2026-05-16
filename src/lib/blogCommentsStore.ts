import "server-only";

import { ObjectId, type Document } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import type { BlogComment, BlogCommentStatus } from "@/types/blog";

const collectionName = "blog_comments";

const publicCommentSchema = z.object({
  postSlug: z.string().min(2, "No se pudo identificar la publicacion.").trim(),
  postTitle: z.string().trim().optional().or(z.literal("")),
  authorName: z.string().min(2, "Ingresa tu nombre.").max(80, "El nombre es demasiado largo.").trim(),
  authorEmail: z.string().email("El correo no es valido.").trim().toLowerCase().optional().or(z.literal("")),
  content: z.string().min(5, "El comentario debe tener al menos 5 caracteres.").max(1200, "El comentario es demasiado largo.").trim(),
});

const statusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewedBy: z.string().trim().optional().or(z.literal("")),
});

type CommentDocument = Omit<BlogComment, "_id" | "createdAt" | "updatedAt" | "reviewedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
};

export async function getApprovedComments(postSlug: string) {
  const db = await getDb();
  const comments = await db
    .collection<CommentDocument>(collectionName)
    .find({ postSlug, status: "approved" })
    .sort({ createdAt: -1 })
    .toArray();
  return comments.map(serializeComment);
}

export async function getAllBlogComments() {
  const db = await getDb();
  const comments = await db.collection<CommentDocument>(collectionName).find().sort({ createdAt: -1 }).toArray();
  return comments.map(serializeComment);
}

export async function createPendingComment(input: unknown) {
  const data = publicCommentSchema.parse(input);
  const db = await getDb();
  const now = new Date();
  const comment: CommentDocument = {
    postSlug: data.postSlug,
    postTitle: data.postTitle || "",
    authorName: data.authorName,
    authorEmail: data.authorEmail || "",
    content: data.content,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<CommentDocument>(collectionName).insertOne(comment);
  await createAdvertisingNotification(comment);
  return serializeComment({ ...comment, _id: result.insertedId });
}

export async function reviewBlogComment(id: string, input: unknown) {
  if (!ObjectId.isValid(id)) return null;
  const data = statusSchema.parse(input);
  const db = await getDb();
  const result = await db.collection<CommentDocument>(collectionName).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: data.status as BlogCommentStatus,
        reviewedBy: data.reviewedBy || "",
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result ? serializeComment(result) : null;
}

export function getBlogCommentErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map((issue) => issue.message).join(" ");
  if (error instanceof Error) return error.message;
  return "No se pudo procesar el comentario.";
}

async function createAdvertisingNotification(comment: CommentDocument) {
  const db = await getDb();
  const now = new Date();
  await db.collection<Document>("notifications").insertOne({
    title: "Nuevo comentario pendiente",
    role: "advertising",
    message: `Nuevo comentario en el blog "${comment.postTitle || comment.postSlug}" de ${comment.authorName}. Revisa Blog institucional para aprobarlo o rechazarlo.`,
    dueDate: now.toISOString().slice(0, 10),
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

function serializeComment(comment: CommentDocument): BlogComment {
  return {
    _id: comment._id?.toString(),
    postSlug: comment.postSlug,
    postTitle: comment.postTitle,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    content: comment.content,
    status: comment.status,
    reviewedAt: comment.reviewedAt?.toISOString(),
    reviewedBy: comment.reviewedBy,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
