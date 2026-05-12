import { NextRequest, NextResponse } from "next/server";
import { hasAnyRole } from "@/lib/adminAuth";
import { readImportFile, requireImportFile, spreadsheetResponse } from "@/lib/csvImport";
import { getDb } from "@/lib/mongodb";
import { clientSchema, getOperationsErrorMessage } from "@/lib/operationsStore";
import type { Client } from "@/types/admin";

const headers = ["name", "taxId", "address", "contactName", "contactPhone", "status"];

export async function GET() {
  return spreadsheetResponse("formato-clientes-asoserlid.xlsx", headers);
}

export async function POST(req: NextRequest) {
  if (!(await hasAnyRole(["administrator", "human_resources"]))) {
    return NextResponse.json({ ok: false, error: "Solo administrador o RR. HH. pueden importar datos." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const rows = await readImportFile(requireImportFile(formData.get("file")));
    const db = await getDb();
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const client = clientSchema.parse({
          ...row,
          status: normalizeStatus(row.status),
        }) as Omit<Client, "_id" | "createdAt" | "updatedAt">;
        const exists = await db.collection("clients").findOne({ taxId: client.taxId });
        if (exists) {
          skipped += 1;
          continue;
        }

        const now = new Date();
        await db.collection("clients").insertOne({ ...client, createdAt: now, updatedAt: now });
        imported += 1;
      } catch (error) {
        errors.push(`Fila ${index + 2}: ${getOperationsErrorMessage(error)}`);
      }
    }

    return NextResponse.json({ ok: true, imported, skipped, errors });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

function normalizeStatus(status?: string) {
  const value = String(status || "").trim().toLowerCase();
  if (["inactivo", "inactive", "0", "no"].includes(value)) return "inactive";
  return "active";
}
