import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createCrudStore, getOperationsErrorMessage, workGroupSchema } from "@/lib/operationsStore";
import { decryptField, encryptField } from "@/lib/secureFields";
import { getWorkGroupScope } from "@/lib/workGroupScope";
import type { WorkGroup } from "@/types/admin";

const store = createCrudStore<WorkGroup>("work_groups", workGroupSchema, {
  beforeSave: protectBankAccounts,
  afterRead: exposeBankAccounts,
});

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

export async function GET() {
  if (!(await hasModuleAccess("work-groups"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const scope = await getWorkGroupScope();
    if (!scope) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    const query = scope.global
      ? {}
      : {
          $or: [
            { _id: { $in: scope.workGroupIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } },
            { name: { $in: scope.workGroupNames } },
            { commercialName: { $in: scope.workGroupNames } },
          ],
        };
    return NextResponse.json({ ok: true, items: await store.list(query) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("work-groups"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, item: await store.create(await req.json()) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}
