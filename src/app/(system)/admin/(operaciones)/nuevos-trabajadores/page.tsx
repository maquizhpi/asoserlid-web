"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, EmployeePosition, ServiceContract, WorkerIntake, WorkGroup } from "@/types/admin";

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

type ApprovalForm = {
  workGroupId: string;
  workGroupName: string;
  assignedClientId: string;
  assignedClient: string;
  assignedContractId: string;
  assignedContract: string;
  assignedArea: string;
  assignedSchedule: string;
};

const emptyApproval: ApprovalForm = {
  workGroupId: "",
  workGroupName: "",
  assignedClientId: "",
  assignedClient: "",
  assignedContractId: "",
  assignedContract: "",
  assignedArea: "",
  assignedSchedule: "",
};

export default function WorkerIntakePage() {
  const [items, setItems] = useState<WorkerIntake[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>("list");
  const [form, setForm] = useState<WorkerIntake>(emptyItem);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [positionOptions, setPositionOptions] = useState<SelectOption[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [contracts, setContracts] = useState<SelectOption[]>([]);
  const [approvingItem, setApprovingItem] = useState<WorkerIntake | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApprovalForm>(emptyApproval);

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
    loadCatalogs();
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

  async function loadCatalogs() {
    const [positionsRes, groupsRes, clientsRes, contractsRes] = await Promise.all([
      fetch("/api/admin/employee-positions", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
    ]);
    const positionsData = await positionsRes.json().catch(() => ({}));
    const groupsData = await groupsRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));

    if (positionsRes.ok) {
      setPositionOptions(
        ((positionsData.items || []) as EmployeePosition[])
          .filter((item) => item.status === "active")
          .map((item) => ({ value: item.name, label: item.name }))
      );
    }
    if (groupsRes.ok) setGroups(((groupsData.items || []) as WorkGroup[]).map((item) => ({ value: item._id || "", label: item.name })));
    if (clientsRes.ok) setClients(((clientsData.items || []) as Client[]).map((item) => ({ value: item._id || "", label: item.name })));
    if (contractsRes.ok) {
      setContracts(
        ((contractsData.items || []) as ServiceContract[]).map((item) => ({
          value: item._id || "",
          label: [item.clientName, item.area, item.shift].filter(Boolean).join(" - "),
        }))
      );
    }
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
      body.append("folderName", "hojas-de-vida");
      const res = await fetch("/api/admin/document-upload", { method: "POST", body });
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

  function startApproval(item: WorkerIntake) {
    if (item.status === "accepted" && item.approvedWorkerId) {
      setStatus("Este ingreso ya fue aprobado y creado como trabajador.");
      return;
    }
    setApprovingItem(item);
    setApprovalForm(emptyApproval);
  }

  async function approveItem(e: FormEvent) {
    e.preventDefault();
    if (!approvingItem?._id) return;

    setStatus("Aprobando ingreso y creando trabajador...");
    const res = await fetch(`/api/admin/worker-intakes/${approvingItem._id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approvalForm),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo aprobar el ingreso.");
      return;
    }

    setStatus("Ingreso aprobado. El trabajador ya aparece en la lista de trabajadores.");
    setApprovingItem(null);
    setApprovalForm(emptyApproval);
    await loadItems();
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
                <span className="mt-1 block text-xs text-slate-500">{item.documentId}</span>
                <StatusBadge status={item.status} />
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
            positionOptions={positionOptions}
            onCancel={() => setMode("list")}
            onDelete={deleteItem}
          />
        ) : (
          <IntakeDetail item={selected} onEdit={() => selected && editItem(selected)} onApprove={() => selected && startApproval(selected)} onNew={startNew} />
        )}
      </section>

      {approvingItem && (
        <ApprovalModal
          item={approvingItem}
          form={approvalForm}
          groups={groups}
          clients={clients}
          contracts={contracts}
          onChange={setApprovalForm}
          onClose={() => setApprovingItem(null)}
          onSubmit={approveItem}
        />
      )}
    </SystemModulePage>
  );
}

function IntakeDetail({ item, onEdit, onApprove, onNew }: { item?: WorkerIntake; onEdit: () => void; onApprove: () => void; onNew: () => void }) {
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
        <div className="flex flex-wrap gap-2">
          {item.status !== "accepted" && <button onClick={onApprove} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Aprobar y asignar</button>}
          <button onClick={onEdit} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Editar ingreso</button>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <Info label="Cargo solicitado" value={item.position} />
        <div>
          <dt className="font-semibold text-slate-500">Estado</dt>
          <dd className="mt-1"><StatusBadge status={item.status} /></dd>
        </div>
        <Info label="Contacto" value={item.phone} />
        <Info label="Correo" value={item.email || "-"} />
        <Info label="Direccion" value={item.address || "-"} />
        <div>
          <dt className="font-semibold text-slate-500">Hoja de vida</dt>
          {item.resumeUrl ? <a href={item.resumeUrl} target="_blank" className="mt-1 inline-block font-semibold text-[#173C61] hover:text-[#218F93]">Ver archivo</a> : <dd className="mt-1 text-slate-800">Sin archivo</dd>}
        </div>
      </dl>
      {item.resumeUrl && <ResumePreview url={item.resumeUrl} />}
    </section>
  );
}

function IntakeForm({
  form,
  uploading,
  onChange,
  onSubmit,
  onUploadResume,
  positionOptions,
  onCancel,
  onDelete,
}: {
  form: WorkerIntake;
  uploading: boolean;
  onChange: (item: WorkerIntake) => void;
  onSubmit: (e: FormEvent) => void;
  onUploadResume: (file: File) => void;
  positionOptions: SelectOption[];
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
        <Field label="Cedula">
          <input
            required
            inputMode="numeric"
            maxLength={10}
            pattern="\d{10}"
            className={inputClass}
            value={form.documentId}
            onChange={(e) => onChange({ ...form, documentId: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
        </Field>
        <Field label="Nombre completo"><input required className={inputClass} value={form.fullName} onChange={(e) => onChange({ ...form, fullName: e.target.value })} /></Field>
        <Field label="Contacto"><input required className={inputClass} value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} /></Field>
        <Field label="Correo"><input required type="email" className={inputClass} value={form.email || ""} onChange={(e) => onChange({ ...form, email: e.target.value })} /></Field>
        <SearchableSelect
          label="Cargo solicitado"
          value={form.position}
          options={positionOptions}
          placeholder="Buscar cargo..."
          onChange={(option) => onChange({ ...form, position: option?.label || "" })}
        />
        <Field label="Estado">
          <select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as WorkerIntake["status"] })}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Direccion"><input required className={inputClass} value={form.address || ""} onChange={(e) => onChange({ ...form, address: e.target.value })} /></Field>
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

      {form.resumeUrl && <ResumePreview url={form.resumeUrl} />}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar ingreso</button>
        {form._id && <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>}
      </div>
    </form>
  );
}

function ApprovalModal({
  item,
  form,
  groups,
  clients,
  contracts,
  onChange,
  onClose,
  onSubmit,
}: {
  item: WorkerIntake;
  form: ApprovalForm;
  groups: SelectOption[];
  clients: SelectOption[];
  contracts: SelectOption[];
  onChange: (form: ApprovalForm) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Aprobar y asignar trabajador</h2>
            <p className="mt-1 text-sm text-slate-600">{item.fullName} - {item.documentId}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Cerrar</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SearchableSelect label="Grupo de trabajo" value={form.workGroupId} options={groups} placeholder="Buscar grupo..." onChange={(option) => onChange({ ...form, workGroupId: option?.value || "", workGroupName: option?.label || "" })} />
          <SearchableSelect label="Cliente / entidad" value={form.assignedClientId} options={clients} placeholder="Buscar cliente..." onChange={(option) => onChange({ ...form, assignedClientId: option?.value || "", assignedClient: option?.label || "" })} />
          <SearchableSelect label="Contrato / turno" value={form.assignedContractId} options={contracts} placeholder="Buscar contrato..." onChange={(option) => onChange({ ...form, assignedContractId: option?.value || "", assignedContract: option?.label || "" })} />
          <Field label="Area / lugar"><input required className={inputClass} value={form.assignedArea} onChange={(e) => onChange({ ...form, assignedArea: e.target.value })} /></Field>
          <Field label="Horario"><input required className={inputClass} placeholder="Ej. Lunes a viernes 08:00-17:00" value={form.assignedSchedule} onChange={(e) => onChange({ ...form, assignedSchedule: e.target.value })} /></Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">Crear trabajador aprobado</button>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: WorkerIntake["status"] }) {
  const colors: Record<WorkerIntake["status"], string> = {
    received: "border-sky-200 bg-sky-50 text-sky-800",
    reviewing: "border-amber-200 bg-amber-50 text-amber-800",
    accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rejected: "border-red-200 bg-red-50 text-red-800",
  };

  return <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${colors[status]}`}>{statusLabels[status]}</span>;
}

function ResumePreview({ url }: { url: string }) {
  const isPdf = url.toLowerCase().includes(".pdf") || url.includes("/api/drive-file/");
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#173C61]">Hoja de vida cargada</p>
        <a href={url} target="_blank" className="text-sm font-semibold text-[#218F93] hover:text-[#173C61]">Abrir archivo</a>
      </div>
      {isPdf ? (
        <iframe src={url} title="Hoja de vida" className="h-[420px] w-full rounded-md border border-slate-200 bg-white" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Hoja de vida cargada" className="max-h-[520px] w-full rounded-md border border-slate-200 bg-white object-contain" />
      )}
    </div>
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
