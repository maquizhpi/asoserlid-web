"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { WorkerIntake } from "@/types/admin";

const emptyItem: WorkerIntake = {
  documentId: "",
  fullName: "",
  phone: "",
  email: "",
  position: "",
  address: "",
  resumeUrl: "",
  resumePublicId: "",
  status: "received",
};

const statusLabels: Record<WorkerIntake["status"], string> = {
  received: "Recibido",
  reviewing: "En revision",
  accepted: "Aceptado",
  rejected: "Rechazado",
};

type PanelMode = "list" | "form";

export default function WorkerIntakePage() {
  const [items, setItems] = useState<WorkerIntake[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>("list");
  const [form, setForm] = useState<WorkerIntake>(emptyItem);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selected = useMemo(() => items.find((item) => item._id === selectedId), [items, selectedId]);
  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const text = [item.documentId, item.fullName, item.phone, item.email, item.position, item.address].join(" ").toLowerCase();
      if (term && !text.includes(term)) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, query, statusFilter]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    setForm(selected || emptyItem);
  }, [selected]);

  useEffect(() => {
    if (!selected && items[0]?._id && mode === "list") setSelectedId(items[0]._id);
  }, [items, mode, selected]);

  async function loadItems() {
    const res = await fetch("/api/admin/worker-intakes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar ingresos.");
      return;
    }
    setItems(data.items || []);
  }

  function startNew() {
    setSelectedId(null);
    setForm(emptyItem);
    setMode("form");
  }

  function editItem(item: WorkerIntake) {
    setSelectedId(item._id || null);
    setForm(item);
    setMode("form");
  }

  async function uploadResume(file: File) {
    setUploading(true);
    setStatus("Subiendo hoja de vida...");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "asoserlid/trabajadores/hojas-de-vida");
      const res = await fetch("/api/admin/cloudinary-upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir la hoja de vida.");
      setForm((current) => ({ ...current, resumeUrl: data.url, resumePublicId: data.publicId }));
      setStatus("Hoja de vida cargada. Guarda el ingreso para conservar el cambio.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir la hoja de vida.");
    } finally {
      setUploading(false);
    }
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando ingreso...");

    const isNew = !form._id;
    const res = await fetch(isNew ? "/api/admin/worker-intakes" : `/api/admin/worker-intakes/${form._id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el ingreso.");
      return;
    }

    setStatus("Ingreso guardado correctamente.");
    await loadItems();
    setSelectedId(data.item?._id || null);
    setMode("list");
  }

  async function deleteItem() {
    if (!selected?._id) return;
    if (!window.confirm("Eliminar este ingreso?")) return;
    const res = await fetch(`/api/admin/worker-intakes/${selected._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el ingreso.");
      return;
    }
    setStatus("Ingreso eliminado.");
    setSelectedId(null);
    setMode("list");
    await loadItems();
  }

  return (
    <SystemModulePage moduleKey="worker-intake">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Buscar ingreso..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <button onClick={startNew} className="shrink-0 rounded-md bg-[#173C61] px-4 py-2 font-semibold text-white hover:bg-[#218F93]">Nuevo</button>
          </div>

          <select className={`${inputClass} mt-3`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          <div className="mt-4 space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item._id}
                onClick={() => { setSelectedId(item._id || null); setMode("list"); }}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${selectedId === item._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className="block font-semibold text-[#173C61]">{item.fullName}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.documentId} - {statusLabels[item.status]}</span>
              </button>
            ))}
            {filteredItems.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">No hay ingresos para mostrar.</p>}
          </div>
        </aside>

        {mode === "form" ? (
          <IntakeForm
            form={form}
            uploading={uploading}
            onChange={setForm}
            onSubmit={saveItem}
            onUploadResume={uploadResume}
            onCancel={() => setMode("list")}
            onDelete={deleteItem}
          />
        ) : (
          <IntakeDetail item={selected} onEdit={() => selected && editItem(selected)} onNew={startNew} />
        )}
      </section>
    </SystemModulePage>
  );
}

function IntakeDetail({ item, onEdit, onNew }: { item?: WorkerIntake; onEdit: () => void; onNew: () => void }) {
  if (!item) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
        <p>No hay ingreso seleccionado.</p>
        <button onClick={onNew} className="mt-4 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Crear primer ingreso</button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-bold text-[#173C61]">{item.fullName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{item.documentId}</p>
        </div>
        <button onClick={onEdit} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Editar ingreso</button>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <Info label="Cargo solicitado" value={item.position} />
        <Info label="Estado" value={statusLabels[item.status]} />
        <Info label="Contacto" value={item.phone} />
        <Info label="Correo" value={item.email || "-"} />
        <Info label="Direccion" value={item.address || "-"} />
        <div>
          <dt className="font-semibold text-slate-500">Hoja de vida</dt>
          {item.resumeUrl ? <a href={item.resumeUrl} target="_blank" className="mt-1 inline-block font-semibold text-[#173C61] hover:text-[#218F93]">Ver archivo</a> : <dd className="mt-1 text-slate-800">Sin archivo</dd>}
        </div>
      </dl>
    </section>
  );
}

function IntakeForm({
  form,
  uploading,
  onChange,
  onSubmit,
  onUploadResume,
  onCancel,
  onDelete,
}: {
  form: WorkerIntake;
  uploading: boolean;
  onChange: (item: WorkerIntake) => void;
  onSubmit: (e: FormEvent) => void;
  onUploadResume: (file: File) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">{form._id ? "Editar ingreso" : "Nuevo ingreso"}</h2>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver al listado</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cedula"><input required className={inputClass} value={form.documentId} onChange={(e) => onChange({ ...form, documentId: e.target.value })} /></Field>
        <Field label="Nombre completo"><input required className={inputClass} value={form.fullName} onChange={(e) => onChange({ ...form, fullName: e.target.value })} /></Field>
        <Field label="Contacto"><input required className={inputClass} value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} /></Field>
        <Field label="Correo"><input type="email" className={inputClass} value={form.email || ""} onChange={(e) => onChange({ ...form, email: e.target.value })} /></Field>
        <Field label="Cargo solicitado"><input required className={inputClass} value={form.position} onChange={(e) => onChange({ ...form, position: e.target.value })} /></Field>
        <Field label="Estado">
          <select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as WorkerIntake["status"] })}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Direccion"><input className={inputClass} value={form.address || ""} onChange={(e) => onChange({ ...form, address: e.target.value })} /></Field>
        <Field label="Hoja de vida PDF o imagen">
          <input
            type="file"
            accept="image/*,application/pdf"
            className={inputClass}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadResume(file);
              e.currentTarget.value = "";
            }}
          />
        </Field>
      </div>

      {form.resumeUrl && <a href={form.resumeUrl} target="_blank" className="mt-4 inline-block text-sm font-semibold text-[#173C61] hover:text-[#218F93]">Ver hoja de vida cargada</a>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar ingreso</button>
        {form._id && <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-slate-800">{value}</dd></div>;
}
