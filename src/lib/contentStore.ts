import "server-only";

import { ObjectId, type Document, type Filter, type OptionalUnlessRequiredId } from "mongodb";
import { z } from "zod";
import { getWebDb } from "@/lib/mongodb";

type BaseDocument<T> = Omit<T, "_id" | "createdAt" | "updatedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const text = (message: string) => z.string().min(2, message).trim();
const optionalText = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : value),
  z.string().trim().optional().or(z.literal(""))
);

export const galleryImageSchema = z.object({
  title: text("El titulo es obligatorio."),
  category: text("La categoria es obligatoria."),
  imageUrl: text("La imagen es obligatoria."),
  alt: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const certificationSchema = z.object({
  title: text("El titulo es obligatorio."),
  issuer: optionalText,
  category: text("La categoria es obligatoria."),
  fileUrl: text("El archivo o imagen es obligatorio."),
  fileType: z.enum(["image", "document"]).default("image"),
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const courseSchema = z.object({
  title: text("El titulo es obligatorio."),
  subtitle: text("El subtitulo es obligatorio."),
  description: optionalText,
  imageUrl: optionalText,
  imagePublicId: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export const serviceSchema = z.object({
  code: text("El codigo es obligatorio."),
  name: text("El nombre es obligatorio."),
  detail: optionalText,
  activities: optionalText,
  imageUrl: optionalText,
  imagePublicId: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
}).strip();

export function createCrudStore<T>(
  collectionName: string,
  schema: z.ZodType<Omit<T, "_id" | "createdAt" | "updatedAt">>,
  options: {
    beforeSave?: (data: Omit<T, "_id" | "createdAt" | "updatedAt">) => Omit<T, "_id" | "createdAt" | "updatedAt">;
    afterRead?: (item: T) => T;
  } = {}
) {
  return {
    async list(query: Filter<Document> = {}) {
      const db = await getWebDb();
      const items = await db.collection<Document>(collectionName).find(query).sort({ createdAt: -1 }).toArray();
      return items.map((item) => options.afterRead ? options.afterRead(serialize(item as BaseDocument<T>)) : serialize(item as BaseDocument<T>));
    },

    async create(input: unknown) {
      const data = options.beforeSave ? options.beforeSave(normalize(schema.parse(input))) : normalize(schema.parse(input));
      const db = await getWebDb();
      const now = new Date();
      const document = { ...data, createdAt: now, updatedAt: now } as BaseDocument<T>;
      const result = await db
        .collection<Document>(collectionName)
        .insertOne(document as OptionalUnlessRequiredId<BaseDocument<T>>);
      const item = serialize({ ...document, _id: result.insertedId } as BaseDocument<T>);
      return options.afterRead ? options.afterRead(item) : item;
    },

    async update(id: string, input: unknown) {
      const data = options.beforeSave ? options.beforeSave(normalize(schema.parse(input))) : normalize(schema.parse(input));
      const db = await getWebDb();
      const result = await db
        .collection<Document>(collectionName)
        .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
      if (!result) return null;
      const item = serialize(result as BaseDocument<T>);
      return options.afterRead ? options.afterRead(item) : item;
    },

    async remove(id: string) {
      const db = await getWebDb();
      const result = await db.collection<Document>(collectionName).deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    },
  };
}

export function getContentErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
        return `${field}${issue.message}`;
      })
      .join(" ");
  }
  if (error instanceof Error) return error.message;
  return "No se pudo completar la accion.";
}

function normalize<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === "" ? undefined : item])) as T;
}

function serialize<T>(document: BaseDocument<T>) {
  return {
    ...document,
    _id: document._id?.toString(),
    createdAt: document.createdAt?.toISOString(),
    updatedAt: document.updatedAt?.toISOString(),
  } as T;
}
