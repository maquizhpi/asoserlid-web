import "server-only";

import ExcelJS from "exceljs";

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export async function spreadsheetResponse(filename: string, headers: string[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Datos");
  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(header.length + 4, 18) }));

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function readImportFile(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "xlsx" || extension === "xls") {
    return readSpreadsheetFile(file);
  }

  if (extension === "csv") {
    return readCsvFile(file);
  }

  throw new Error("El archivo debe ser Excel (.xlsx/.xls) o CSV.");
}

export function requireImportFile(file: FormDataEntryValue | null): File {
  if (!(file instanceof File)) throw new Error("Archivo no recibido.");
  return file;
}

async function readSpreadsheetFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers = getWorksheetRowValues(worksheet.getRow(1)).map((header) => normalizeHeader(header));
  const rows: Record<string, string>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = getWorksheetRowValues(row);
    if (!values.some((value) => value.trim())) return;

    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] || "").trim();
    });
    rows.push(item);
  });

  return rows;
}

async function readCsvFile(file: File) {
  const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  return rows.slice(1).map((row) => {
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = (row[index] || "").trim();
    });
    return item;
  });
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().replace(/^\uFEFF/, "");
}

function getWorksheetRowValues(row: ExcelJS.Row) {
  const values = row.values;
  if (!Array.isArray(values)) return [];
  return values.slice(1).map((value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object" && value && "text" in value) return String(value.text || "");
    if (typeof value === "object" && value && "result" in value) return String(value.result || "");
    return String(value || "");
  });
}
