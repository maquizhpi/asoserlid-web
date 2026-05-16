import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { type Document } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, hiringProcessSchema } from "@/lib/operationsStore";
import { syncHiringAliases } from "@/lib/hiringProcessUtils";
import { createHiringProcessNotifications, normalizeProcess, serializeProcess } from "../route";
import type { HiringProcess, HiringProcessStatus } from "@/types/admin";

const statuses: HiringProcessStatus[] = ["Planificado", "En seguimiento", "Por vencer", "Vencido", "Adjudicado", "Desierto", "Cancelado", "Finalizado"];

export async function GET() {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Proceso");
  sheet.addRows([
    ["Entidad:", "Hospital Municipal Nuestra Senora de la Merced"],
    ["Objeto de Proceso:", "SERVICIO DE LIMPIEZA Y DESINFECCION HOSPITALARIA"],
    ["Codigo:", "SIE-HMNSM-2026-004"],
    ["Tipo Compra:", "Servicio"],
    ["Presupuesto Referencial Total (Sin Iva):", "USD 199,131.00"],
    ["Tipo de Contratacion:", "Subasta Inversa Electronica"],
    ["Forma de Pago:", "Anticipo: 0% Saldo: 100%"],
    ["Tipo de Adjudicacion:", "Total"],
    ["Plazo de Entrega:", "730 dias"],
    ["Vigencia de Oferta:", "90 dias"],
    ["Funcionario encargado del proceso:", "responsable@entidad.gob.ec"],
    ["Estado del Proceso:", "Planificado"],
  ]);
  sheet.columns = [{ width: 42 }, { width: 70 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="formato-proceso-contratacion.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const data = await req.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Selecciona un archivo Excel valido." }, { status: 400 });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return NextResponse.json({ ok: false, error: "El archivo no tiene hojas para importar." }, { status: 400 });

    const payloads = parseProcessSheet(sheet);
    if (!payloads.length) return NextResponse.json({ ok: false, error: "No se encontraron datos de proceso en el archivo." }, { status: 400 });

    const db = await getDb();
    await db.collection<Document>("hiring_processes").createIndex({ numeroProceso: 1 }, { unique: true });
    const items: HiringProcess[] = [];
    let created = 0;
    let updated = 0;

    for (const payload of payloads) {
      const existing = await db.collection<Document>("hiring_processes").findOne({ numeroProceso: payload.numeroProceso });
      const safeInput = existing
        ? { ...serializeProcess(existing), ...payload, cronograma: serializeProcess(existing).cronograma || [], agendaOperacional: serializeProcess(existing).agendaOperacional || [] }
        : payload;
      const normalized = normalizeProcess(hiringProcessSchema.parse(safeInput));
      const now = new Date();
      const { _id, ...document } = normalized;
      void _id;
      if (existing) {
        await db.collection<Document>("hiring_processes").updateOne({ _id: existing._id }, { $set: { ...document, updatedAt: now } });
        items.push(serializeProcess({ ...existing, ...document, updatedAt: now }));
        updated += 1;
      } else {
        const result = await db.collection<Document>("hiring_processes").insertOne({ ...document, createdAt: now, updatedAt: now });
        const item = { ...document, _id: result.insertedId.toString(), createdAt: now.toISOString(), updatedAt: now.toISOString() };
        await createHiringProcessNotifications(db, item, now);
        items.push(item);
        created += 1;
      }
    }

    return NextResponse.json({ ok: true, created, updated, items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

function parseProcessSheet(sheet: ExcelJS.Worksheet) {
  const pairs = new Map<string, string>();
  sheet.eachRow((row) => {
    const label = cellText(row.getCell(1)) || cellText(row.getCell(2));
    const value = cellText(row.getCell(2)) && cellText(row.getCell(1)) ? cellText(row.getCell(2)) : cellText(row.getCell(3));
    if (label && value) pairs.set(normalizeLabel(label), value);
  });

  const today = new Date().toISOString().slice(0, 10);
  const numeroProceso = pick(pairs, ["codigo", "numero proceso", "numero de proceso", "proceso"]);
  const entidadCliente = pick(pairs, ["entidad", "entidad cliente", "cliente"]);
  const objetoProceso = pick(pairs, ["objeto de proceso", "objeto proceso", "objeto"]);
  if (!numeroProceso && !entidadCliente && !objetoProceso) return [];

  const statusText = pick(pairs, ["estado del proceso", "estado proceso", "estado"]);
  const estadoProceso = statuses.find((status) => normalizeLabel(status) === normalizeLabel(statusText)) || (statusText ? "En seguimiento" : "Planificado");

  return [syncHiringAliases({
    numeroProceso,
    entidadCliente,
    objetoProceso,
    tipoCompra: pick(pairs, ["tipo compra"]),
    presupuestoReferencialSinIva: parseAmount(pick(pairs, ["presupuesto referencial total sin iva", "presupuesto referencial sin iva", "presupuesto"])),
    tipoContratacion: pick(pairs, ["tipo de contratacion", "tipo contratacion"]),
    formaPago: pick(pairs, ["forma de pago"]),
    tipoAdjudicacion: pick(pairs, ["tipo de adjudicacion", "tipo adjudicacion"]),
    plazoEntregaDias: parseDays(pick(pairs, ["plazo de entrega", "plazo entrega"])),
    vigenciaOfertaDias: parseDays(pick(pairs, ["vigencia de oferta", "vigencia oferta"])),
    funcionarioEncargado: pick(pairs, ["funcionario encargado del proceso", "funcionario encargado"]),
    areaResponsable: "Sin area",
    estadoProceso,
    descripcion: "",
    notas: "",
    fechaInicio: today,
    fechaVencimiento: today,
    cronograma: [],
    agendaOperacional: [],
    archivos: [],
    startDate: today,
    dueDate: today,
    status: "planned",
  })];
}

function pick(pairs: Map<string, string>, labels: string[]) {
  for (const label of labels) {
    const exact = pairs.get(normalizeLabel(label));
    if (exact) return exact;
    const found = Array.from(pairs.entries()).find(([key]) => key.includes(normalizeLabel(label)));
    if (found?.[1]) return found[1];
  }
  return "";
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String(value.text || "").trim();
  return String(value).trim();
}

function normalizeLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[:()]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function parseAmount(value: string) {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseDays(value: string) {
  const days = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(days) ? days : 0;
}
