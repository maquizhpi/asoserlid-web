import "server-only";

import * as XLSX from "xlsx";

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function spreadsheetResponse(filename: string, headers: string[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
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
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
  });

  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value || "").trim()]))
  );
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
