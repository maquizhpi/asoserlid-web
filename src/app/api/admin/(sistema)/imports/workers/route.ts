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
  "socio",
  "documents",
  "assignedClient",
  "assignedContract",
  "assignedArea",
  "empresa",
];

export async function GET() {
  return spreadsheetResponse("formato-trabajadores-asoserlid.xlsx", headers, [
    [
      "0102030405",
      "JUAN CARLOS",
      "PEREZ LOPEZ",
      "AUXILIAR DE LIMPIEZA",
      "0999999999",
      "juan.perez@asoserlid.com",
      "active",
      "No",
      "Cedula validada",
      "HOSPITAL CENTRAL",
      "HOSPITAL CENTRAL - AREA 1 - DIURNO",
      "AREA 1",
      "ASOSERLID",
    ],
    [
      "0602928822",
      "GLORIA MARLENE",
      "CHUNATA VILLEGAS",
      "AUXILIAR DE LIMPIEZA",
      "0999999999",
      "gloria.chunata@asoserlid.com",
      "active",
      "No",
      "Registro validado",
      "HOSPITAL CENTRAL",
      "HOSPITAL CENTRAL - AREA 2 - NOCTURNO",
      "AREA 2",
      "ASOSERLIRIO",
    ],
  ]);
}

export async function POST(req: NextRequest) {
  if (!(await hasAnyRole(["administrator", "general_manager", "general_secretary", "human_resources"]))) {
    return NextResponse.json({ ok: false, error: "Solo administrador o RR. HH. pueden importar datos." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const rows = await readImportFile(requireImportFile(formData.get("file")));
    const db = await getDb();
    const workGroups = await db.collection("work_groups").find({}, { projection: { _id: 1, name: 1, commercialName: 1 } }).toArray();
    const errors: string[] = [];
    const seenDocumentIds = new Set<string>();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const workGroup = findWorkGroup(workGroups, row.workGroupName || row.empresa || row.company || row.workgroup);
        const worker = workerSchema.parse({
          ...row,
          workGroupId: workGroup?._id?.toString() || row.workGroupId || "",
          workGroupName: workGroup ? String(workGroup.commercialName || workGroup.name || "") : row.workGroupName || row.empresa || "",
          status: normalizeStatus(row.status),
          socio: normalizeSocio(row.socio),
        }) as Omit<Worker, "_id" | "createdAt" | "updatedAt">;
        if (seenDocumentIds.has(worker.documentId)) {
          skipped += 1;
          errors.push(`Fila ${index + 2}: cedula repetida en el archivo, se omitio esta fila.`);
          continue;
        }
        seenDocumentIds.add(worker.documentId);

        const exists = await db.collection("workers").findOne({ documentId: worker.documentId });
        const now = new Date();
        if (exists) {
          await db.collection("workers").updateOne({ documentId: worker.documentId }, { $set: { ...worker, updatedAt: now } });
          updated += 1;
        } else {
          await db.collection("workers").insertOne({ ...worker, createdAt: now, updatedAt: now });
          imported += 1;
        }
      } catch (error) {
        errors.push(`Fila ${index + 2}: ${getOperationsErrorMessage(error)}`);
      }
    }

    return NextResponse.json({ ok: true, imported, updated, skipped, errors });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

function normalizeStatus(status?: string) {
  const value = String(status || "").trim().toLowerCase();
  if (["inactivo", "inactive", "0", "no"].includes(value)) return "inactive";
  return "active";
}

function normalizeSocio(socio?: string) {
  const value = String(socio || "").trim().toLowerCase();
  if (["si", "sí", "s", "yes", "1", "true"].includes(value)) return "Si";
  return "No";
}

function findWorkGroup(workGroups: Array<{ _id?: unknown; name?: unknown; commercialName?: unknown }>, value?: string) {
  const key = normalizeKey(value || "");
  if (!key) return null;
  return workGroups.find((group) => normalizeKey(String(group.commercialName || "")) === key || normalizeKey(String(group.name || "")) === key) || null;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
