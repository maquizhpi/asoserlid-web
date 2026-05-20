import "server-only";

import { ObjectId, type Document } from "mongodb";
import { getAdminSession, hasModuleAccess } from "@/lib/adminAuth";
import { getWebDb } from "@/lib/mongodb";
import type { AuditLog } from "@/types/admin";

const auditCollection = "audit_logs";

type AuditDocument = Omit<AuditLog, "_id" | "createdAt" | "restoredAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  restoredAt?: Date;
};

export async function getAuditLogs() {
  const db = await getWebDb();
  const logs = await db.collection<AuditDocument>(auditCollection).find().sort({ createdAt: -1 }).limit(300).toArray();
  return logs.map(serializeAuditLog);
}

export async function recordAuditLog(input: Omit<AuditLog, "_id" | "createdAt" | "userId" | "userEmail" | "userRoles" | "restoredAt" | "restoredBy">) {
  const session = await getAdminSession();
  const db = await getWebDb();
  const document: AuditDocument = {
    ...input,
    userId: session?.userId,
    userEmail: session?.email,
    userRoles: session?.roles,
    createdAt: new Date(),
  };

  await db.collection<AuditDocument>(auditCollection).insertOne(document);
}

export async function restoreAuditLog(id: string) {
  if (!(await hasModuleAccess("audits"))) {
    throw new Error("No autorizado.");
  }

  const db = await getWebDb();
  const session = await getAdminSession();
  const log = await db.collection<AuditDocument>(auditCollection).findOne({ _id: new ObjectId(id) });
  if (!log) throw new Error("Auditoria no encontrada.");
  if (log.restoredAt) throw new Error("Esta auditoria ya fue restaurada.");
  if (!log.collection || !log.recordId) throw new Error("La auditoria no tiene registro asociado.");

  if (log.action === "update") {
    if (!log.beforeSnapshot) throw new Error("Esta auditoria no tiene copia anterior para restaurar.");
    const snapshot = reviveSnapshot(log.beforeSnapshot);
    const data = Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== "_id"));
    await db.collection<Document>(log.collection).updateOne(
      { _id: new ObjectId(log.recordId) },
      { $set: data },
      { upsert: false }
    );
  } else if (log.action === "delete") {
    if (!log.beforeSnapshot) throw new Error("Esta auditoria no tiene copia eliminada para restaurar.");
    const existing = await db.collection<Document>(log.collection).findOne({ _id: new ObjectId(log.recordId) });
    if (existing) throw new Error("El registro ya existe. No se puede restaurar encima de un registro existente.");
    const snapshot = reviveSnapshot(log.beforeSnapshot);
    await db.collection<Document>(log.collection).insertOne({ ...snapshot, _id: new ObjectId(log.recordId) });
  } else {
    throw new Error("Solo se pueden restaurar auditorias de edicion o eliminacion.");
  }

  const restoredAt = new Date();
  await db.collection<AuditDocument>(auditCollection).updateOne(
    { _id: new ObjectId(id) },
    { $set: { restoredAt, restoredBy: session?.email || "Sistema" } }
  );

  await recordAuditLog({
    action: "update",
    moduleKey: "audits",
    collection: log.collection,
    recordId: log.recordId,
    recordLabel: log.recordLabel,
    summary: `Restauro ${log.recordLabel || log.recordId} desde auditoria`,
    beforeSnapshot: log.afterSnapshot || null,
    afterSnapshot: log.beforeSnapshot || null,
  });

  return true;
}

export function auditSummary(action: AuditLog["action"], label: string) {
  const verb = { create: "Creo", update: "Actualizo", delete: "Elimino" }[action];
  return `${verb} ${label}`;
}

function serializeAuditLog(log: AuditDocument): AuditLog {
  return {
    ...log,
    _id: log._id?.toString(),
    createdAt: log.createdAt?.toISOString(),
    restoredAt: log.restoredAt instanceof Date ? log.restoredAt.toISOString() : log.restoredAt,
  };
}

export function getRecordLabel(item: unknown) {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Document;
  return String(record.title || record.name || record.processNumber || record.clientName || record.workerName || record.email || record.slug || record._id || "");
}

export function serializeSnapshot(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return serializeValue(value) as Record<string, unknown>;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
  }
  return value;
}

function reviveSnapshot(snapshot: Record<string, unknown>) {
  return reviveValue(snapshot) as Document;
}

function reviveValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveValue);
  if (value && typeof value === "object") {
    const output: Document = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "_id" && typeof item === "string" && ObjectId.isValid(item)) {
        output[key] = new ObjectId(item);
      } else if ((key.endsWith("At") || key.endsWith("Date")) && typeof item === "string" && !Number.isNaN(Date.parse(item))) {
        output[key] = new Date(item);
      } else {
        output[key] = reviveValue(item);
      }
    }
    return output;
  }
  return value;
}
