import "server-only";

import { ObjectId, type Document, type Filter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { auditSummary, getRecordLabel, recordAuditLog, serializeSnapshot } from "@/lib/auditStore";
import { getWebDb } from "@/lib/mongodb";
import { createCrudStore, getContentErrorMessage } from "@/lib/contentStore";
import type { z } from "zod";

export function createAdminCrudHandlers<T>(collection: string, moduleKey: string, schema: z.ZodType<Omit<T, "_id" | "createdAt" | "updatedAt">>) {
  const store = createCrudStore<T>(collection, schema);

  return {
    async list(query: Filter<Document> = {}) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        return NextResponse.json({ ok: true, items: await store.list(query) });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getContentErrorMessage(error) }, { status: 500 });
      }
    },

    async create(req: NextRequest) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        const item = await store.create(await req.json());
        await recordAuditLog({
          action: "create",
          moduleKey,
          collection,
          recordId: getRecordId(item),
          recordLabel: getRecordLabel(item),
          summary: auditSummary("create", getRecordLabel(item) || collection),
          beforeSnapshot: null,
          afterSnapshot: serializeSnapshot(item),
        });
        return NextResponse.json({ ok: true, item }, { status: 201 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getContentErrorMessage(error) }, { status: 400 });
      }
    },

    async update(req: NextRequest, id: string) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        const before = await getRecord(collection, id);
        const item = await store.update(id, await req.json());
        if (item) {
          await recordAuditLog({
            action: "update",
            moduleKey,
            collection,
            recordId: id,
            recordLabel: getRecordLabel(item),
            summary: auditSummary("update", getRecordLabel(item) || collection),
            beforeSnapshot: serializeSnapshot(before),
            afterSnapshot: serializeSnapshot(item),
          });
        }
        return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getContentErrorMessage(error) }, { status: 400 });
      }
    },

    async remove(id: string) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        const before = await getRecord(collection, id);
        const deleted = await store.remove(id);
        if (deleted) {
          await recordAuditLog({
            action: "delete",
            moduleKey,
            collection,
            recordId: id,
            recordLabel: getRecordLabel(before),
            summary: auditSummary("delete", collection),
            beforeSnapshot: serializeSnapshot(before),
            afterSnapshot: null,
          });
        }
        return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getContentErrorMessage(error) }, { status: 400 });
      }
    },
  };
}

async function getRecord(collection: string, id: string) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getWebDb();
  return db.collection<Document>(collection).findOne({ _id: new ObjectId(id) });
}

function getRecordId(item: unknown) {
  if (!item || typeof item !== "object") return undefined;
  const record = item as { _id?: string };
  return record._id;
}
