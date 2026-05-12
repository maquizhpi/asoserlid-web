import { NextRequest, NextResponse } from "next/server";
import { hasAnyRole } from "@/lib/adminAuth";
import { readImportFile, requireImportFile, spreadsheetResponse } from "@/lib/csvImport";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, workerSchema } from "@/lib/operationsStore";
import type { Worker } from "@/types/admin";

const headers = [
  "documentId",
  "firstName",
  "lastName",
  "position",
  "phone",
  "email",
  "status",
  "documents",
  "assignedClient",
  "assignedContract",
  "assignedArea",
  "workGroupName",
];

export async function GET() {
  return spreadsheetResponse("formato-trabajadores-asoserlid.xlsx", headers);
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
        const worker = workerSchema.parse({
          ...row,
          status: normalizeStatus(row.status),
        }) as Omit<Worker, "_id" | "createdAt" | "updatedAt">;
        const exists = await db.collection("workers").findOne({ documentId: worker.documentId });
        if (exists) {
          skipped += 1;
          continue;
        }

        const now = new Date();
        await db.collection("workers").insertOne({ ...worker, createdAt: now, updatedAt: now });
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
