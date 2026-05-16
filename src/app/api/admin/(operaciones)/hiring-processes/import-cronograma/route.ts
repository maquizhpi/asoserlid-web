import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { ObjectId, type Document } from "mongodb";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { getOperationsErrorMessage, hiringProcessSchema } from "@/lib/operationsStore";
import { createId, dateTypes, fromDateTimeInput, generarAgendaAutomatica, syncHiringAliases } from "@/lib/hiringProcessUtils";
import { normalizeProcess, serializeProcess } from "../route";
import type { CronogramaFecha } from "@/types/admin";

export async function GET() {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cronograma");
  sheet.addRows([
    ["Fecha de Publicacion", new Date(), "Indicar la fecha real en la cual desea publicar el Proceso."],
    ["Fecha Limite de Preguntas", new Date(), "Fecha maxima para solicitar aclaraciones respecto al Proceso de Contratacion."],
    ["Fecha Limite de Respuestas", new Date(), "Fecha maxima para solventar inquietudes."],
    ["Fecha Limite entrega Ofertas", new Date(), "Fecha maxima de entrega de ofertas."],
    ["Fecha Estimada de Adjudicacion", new Date(), "Fecha estimada para la adjudicacion."],
  ]);
  sheet.columns = [{ width: 38 }, { width: 24 }, { width: 80 }];
  sheet.getColumn(2).numFmt = "dd/mm/yyyy hh:mm";
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="formato-cronograma-proceso.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("hiring-processes"))) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const data = await req.formData();
    const file = data.get("file");
    const processId = String(data.get("processId") || "");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Selecciona un archivo Excel valido." }, { status: 400 });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return NextResponse.json({ ok: false, error: "El archivo no tiene hojas para importar." }, { status: 400 });

    const cronograma = parseCronogramaSheet(sheet);
    if (!cronograma.length) return NextResponse.json({ ok: false, error: "No se encontraron fechas de cronograma en el archivo." }, { status: 400 });

    if (!processId) return NextResponse.json({ ok: true, count: cronograma.length, cronograma });
    if (!ObjectId.isValid(processId)) return NextResponse.json({ ok: false, error: "Selecciona un proceso valido para importar el cronograma." }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection<Document>("hiring_processes").findOne({ _id: new ObjectId(processId) });
    if (!existing) return NextResponse.json({ ok: false, error: "No se encontro el proceso seleccionado." }, { status: 404 });

    const current = serializeProcess(existing);
    const dates = cronograma.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    const next = normalizeProcess(hiringProcessSchema.parse(syncHiringAliases({
      ...current,
      cronograma: dates,
      agendaOperacional: generarAgendaAutomatica({ ...current, cronograma: dates }),
      fechaInicio: dates[0]?.fechaHora.slice(0, 10) || current.fechaInicio,
      fechaVencimiento: dates[dates.length - 1]?.fechaHora.slice(0, 10) || current.fechaVencimiento,
    })));
    const { _id, ...document } = next;
    void _id;
    await db.collection<Document>("hiring_processes").updateOne({ _id: existing._id }, { $set: { ...document, updatedAt: new Date() } });
    return NextResponse.json({ ok: true, count: dates.length, item: { ...document, _id: processId } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getOperationsErrorMessage(error) }, { status: 400 });
  }
}

function parseCronogramaSheet(sheet: ExcelJS.Worksheet) {
  const rows: CronogramaFecha[] = [];
  sheet.eachRow((row) => {
    const rawType = cellText(row.getCell(1)) || cellText(row.getCell(2));
    const rawDate = cellDate(row.getCell(cellText(row.getCell(1)) ? 2 : 3));
    const description = cellText(row.getCell(cellText(row.getCell(1)) ? 3 : 4));
    if (!rawType || !rawDate) return;
    rows.push({
      id: createId(),
      tipoFecha: normalizeDateType(rawType),
      fechaHora: rawDate,
      descripcion: description || rawType,
      estado: "Pendiente",
      observacion: "",
    });
  });
  return rows;
}

function normalizeDateType(value: string) {
  const normalized = normalizeLabel(value);
  if (normalized.includes("entrega ofertas") || normalized.includes("propuestas")) return "Fecha limite de propuestas";
  if (normalized.includes("apertura")) return "Fecha apertura de ofertas";
  if (normalized.includes("publicacion")) return "Fecha de publicacion";
  if (normalized.includes("preguntas")) return "Fecha limite de preguntas";
  if (normalized.includes("respuestas") && !normalized.includes("convalidacion")) return "Fecha limite de respuestas";
  if (normalized.includes("solicitar convalidacion")) return "Fecha limite solicitar convalidacion";
  if (normalized.includes("respuesta convalidacion")) return "Fecha limite respuesta convalidacion";
  if (normalized.includes("adjudicacion")) return "Fecha estimada de adjudicacion";
  const match = dateTypes.find((type) => normalizeLabel(type) === normalized);
  return match || "Otra fecha importante";
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "object" && "text" in value) return String(value.text || "").trim();
  return String(value).trim();
}

function cellDate(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value instanceof Date) return formatDateTime(value);
  const text = cellText(cell);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return fromDateTimeInput(text.slice(0, 16));
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return formatDateTime(parsed);
  return text.replace("T", " ").slice(0, 19);
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function normalizeLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[:()]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
