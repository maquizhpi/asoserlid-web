import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createCrudStore, getOperationsErrorMessage } from "@/lib/operationsStore";
import type { z } from "zod";

export function createAdminCrudHandlers<T>(collection: string, moduleKey: string, schema: z.ZodType<Omit<T, "_id" | "createdAt" | "updatedAt">>) {
  const store = createCrudStore<T>(collection, schema);

  return {
    async list() {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        return NextResponse.json({ ok: true, items: await store.list() });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
      }
    },

    async create(req: NextRequest) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        return NextResponse.json({ ok: true, item: await store.create(await req.json()) }, { status: 201 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
      }
    },

    async update(req: NextRequest, id: string) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        const item = await store.update(id, await req.json());
        return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
      }
    },

    async remove(id: string) {
      if (!(await hasModuleAccess(moduleKey))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
      try {
        const deleted = await store.remove(id);
        return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
      }
    },
  };
}
