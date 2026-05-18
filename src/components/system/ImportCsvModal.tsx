"use client";

import { FormEvent, useState } from "react";

type ImportCsvModalProps = {
  title: string;
  endpoint: string;
  templateHref: string;
  onImported: () => Promise<void> | void;
};

export default function ImportCsvModal({ title, endpoint, templateHref, onImported }: ImportCsvModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function submitImport(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus("Selecciona un archivo CSV.");
      return;
    }

    setStatus("Importando datos...");
    setErrors([]);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(endpoint, { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo importar.");
      return;
    }

    setStatus(`Importados: ${data.imported || 0}. Actualizados: ${data.updated || 0}. Duplicados omitidos: ${data.skipped || 0}.`);
    setErrors(data.errors || []);
    await onImported();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-[#173C61] px-4 py-3 font-semibold text-[#173C61] hover:bg-[#E6F8F9]">
        Importar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <form onSubmit={submitImport} className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#173C61]">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">Descarga el formato, llena las celdas en Excel y sube el archivo.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cerrar
              </button>
            </div>

            <a href={templateHref} className="mt-4 inline-block rounded-md bg-slate-100 px-4 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-200">
              Descargar formato Excel
            </a>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
              Archivo Excel
              <input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>

            {status && <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{status}</p>}
            {errors.length > 0 && (
              <div className="mt-3 max-h-36 overflow-auto rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {errors.slice(0, 20).map((error) => <p key={error}>{error}</p>)}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Subir datos</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
