import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createCrudStore, getOperationsErrorMessage, workGroupSchema } from "@/lib/operationsStore";
import { decryptField, encryptField } from "@/lib/secureFields";
import type { WorkGroup } from "@/types/admin";

const store = createCrudStore<WorkGroup>("work_groups", workGroupSchema, {
  beforeSave: protectBankAccounts,
  afterRead: exposeBankAccounts,
});
type RouteContext = { params: Promise<{ id: string }> };

function protectBankAccounts(group: Omit<WorkGroup, "_id" | "createdAt" | "updatedAt">) {
  return {
    ...group,
    bankAccounts: (group.bankAccounts || []).map((account) => ({
      ...account,
      accountNumber: encryptField(account.accountNumber),
    })),
  };
}

function exposeBankAccounts(group: WorkGroup) {
  return {
    ...group,
    bankAccounts: (group.bankAccounts || []).map((account) => ({
      ...account,
      accountNumber: decryptField(account.accountNumber),
    })),
  };
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("work-groups"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const item = await store.update(id, await req.json());
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("work-groups"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const { id } = await context.params;
    const deleted = await store.remove(id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
