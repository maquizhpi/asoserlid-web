"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Worker, WorkerDocument } from "@/types/admin";

const emptyDocument: WorkerDocument = {
  workerId: "",
  workerName: "",
  documentType: "",
  fileUrl: "",
  filePublicId: "",
  uploadDate: new Date().toISOString().slice(0, 10),
  expirationDate: "",
  status: "pending_review",
  notes: "",
};

export default function WorkerDocumentsPage() {
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [workers, setWorkers] = useState<SelectOption[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<WorkerDocument>(emptyDocument);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selected = useMemo(() => documents.find((item) => item._id === selectedId), [documents, selectedId]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm(selected || emptyDocument);
    setFile(null);
  }, [selected]);

  async function loadData() {
    const [documentsRes, workersRes] = await Promise.all([
      fetch("/api/admin/worker-documents", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
    ]);
    const documentsData = await documentsRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));

    if (documentsRes.ok) setDocuments(documentsData.items || []);
    if (workersRes.ok) {
      setWorkers(((workersData.items || []) as Worker[]).map((worker) => ({ value: worker._id || "", label: `${worker.firstName} ${worker.lastName}`.trim() })));
    }
    if (!documentsRes.ok || !workersRes.ok) setStatus(documentsData.error || workersData.error || "No se pudo cargar documentos.");
  }

  async function saveDocument(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando documento...");

    let payload = form;
    if (file) {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("folder", "asoserlid/trabajadores/documentos");
      const uploadRes = await fetch("/api/admin/cloudinary-upload", { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json().catch(() => ({}));

      if (!uploadRes.ok) {
        setStatus(uploadData.error || "No se pudo subir el documento.");
        return;
      }

      payload = { ...payload, fileUrl: uploadData.url, filePublicId: uploadData.publicId };
    }

    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/worker-documents" : `/api/admin/worker-documents/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el documento.");
      return;
    }

    setStatus("Documento guardado correctamente.");
    await loadData();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteDocument() {
    if (selectedId === "new") return;
    if (!window.confirm("Eliminar este documento?")) return;

    const res = await fetch(`/api/admin/worker-documents/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el documento.");
      return;
    }

    setStatus("Documento eliminado.");
    setSelectedId("new");
    await loadData();
  }

  return (
    <SystemModulePage moduleKey="worker-documents">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={() => setSelectedId("new")} className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
            Nuevo documento
          </button>
          <div className="space-y-2">
            {documents.map((document) => (
              <button
                key={document._id}
                onClick={() => setSelectedId(document._id || "new")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${selectedId === document._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className="block font-semibold text-[#173C61]">{document.workerName}</span>
                <span className="mt-1 block text-xs text-slate-500">{document.documentType} - {document.status}</span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={saveDocument} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Trabajador"
              value={form.workerId || ""}
              options={workers}
              placeholder="Buscar trabajador..."
              onChange={(option) => setForm({ ...form, workerId: option?.value || "", workerName: option?.label || "" })}
            />
            <Field label="Tipo de documento">
              <input required className={inputClass} value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} />
            </Field>
            <Field label="Fecha de carga">
              <input required type="date" className={inputClass} value={form.uploadDate} onChange={(e) => setForm({ ...form, uploadDate: e.target.value })} />
            </Field>
            <Field label="Fecha vencimiento">
              <input type="date" className={inputClass} value={form.expirationDate || ""} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkerDocument["status"] })}>
                <option value="pending_review">Pendiente revision</option>
                <option value="valid">Vigente</option>
                <option value="expired">Vencido</option>
              </select>
            </Field>
            <Field label="PDF o imagen">
              <input type="file" accept="image/*,.pdf" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Field>
          </div>

          {form.fileUrl && <a href={form.fileUrl} target="_blank" className="mt-4 inline-block text-sm font-semibold text-[#173C61] hover:text-[#218F93]">Ver documento cargado</a>}

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Observaciones
            <textarea className={`${inputClass} min-h-28`} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar documento</button>
            {selectedId !== "new" && <button type="button" onClick={deleteDocument} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>}
          </div>
        </form>
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}
