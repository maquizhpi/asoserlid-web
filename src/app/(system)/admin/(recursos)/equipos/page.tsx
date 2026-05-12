"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Machine, MachineCustodyReceipt, MachineEnvironment, MachineStatus, MachineUsageLog } from "@/types/admin";

const emptyMachine: Machine = {
  name: "",
  code: "",
  type: "Hidrolavadora",
  environment: "companies",
  status: "available",
  location: "",
  assignedTo: "",
  notes: "",
  photoUrl: "",
  photoPublicId: "",
};

const emptyUsageLog: MachineUsageLog = {
  date: new Date().toISOString().slice(0, 10),
  usedBy: "",
  clientOrLocation: "",
  startTime: "",
  endTime: "",
  hoursUsed: 0,
  conditionBefore: "Bueno",
  conditionAfter: "Bueno",
  observations: "",
};

const emptyCustodyReceipt: MachineCustodyReceipt = {
  date: new Date().toISOString().slice(0, 10),
  deliveredBy: "",
  receivedBy: "",
  origin: "",
  destination: "",
  reason: "",
  expectedReturnDate: "",
  condition: "Bueno",
  documentUrl: "",
  documentPublicId: "",
  observations: "",
};

const statusLabels: Record<MachineStatus, string> = {
  available: "Disponible",
  assigned: "Asignada",
  maintenance: "Mantenimiento",
  inactive: "Inactiva",
};

const machineTypes = [
  "Hidrolavadora",
  "Brilladora",
  "Aspiradora industrial",
  "Aspiradora seco/humedo",
  "Fregadora de pisos",
  "Barredora industrial",
  "Pulidora",
  "Vaporizador",
  "Nebulizador",
  "Equipo de desinfeccion",
  "Extractor de alfombras",
  "Carro escurridor",
  "Otro",
];

const environmentLabels: Record<MachineEnvironment, string> = {
  hospitals: "Hospitales",
  public_institutions: "Instituciones publicas",
  homes: "Hogares",
  workshops: "Talleres",
  companies: "Empresas",
  other: "Otro",
};

type PanelMode = "list" | "form";

export default function EquipmentModulePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [machineMode, setMachineMode] = useState<PanelMode>("list");
  const [usageMode, setUsageMode] = useState<PanelMode>("list");
  const [custodyMode, setCustodyMode] = useState<PanelMode>("list");
  const [machineForm, setMachineForm] = useState<Machine>(emptyMachine);
  const [usageForm, setUsageForm] = useState<MachineUsageLog>(emptyUsageLog);
  const [custodyForm, setCustodyForm] = useState<MachineCustodyReceipt>(emptyCustodyReceipt);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine._id === selectedMachineId),
    [machines, selectedMachineId]
  );

  const filteredMachines = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return machines;

    return machines.filter((machine) =>
      [machine.name, machine.code, machine.type, machine.location, machine.assignedTo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [machines, query]);

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (!selectedMachine && machines[0]?._id) {
      setSelectedMachineId(machines[0]._id);
    }
  }, [machines, selectedMachine]);

  async function loadMachines() {
    const [machinesRes, supervisorsRes] = await Promise.all([
      fetch("/api/admin/machines", { cache: "no-store" }),
      fetch("/api/admin/supervisors", { cache: "no-store" }),
    ]);
    const machinesData = await machinesRes.json().catch(() => ({}));
    const supervisorsData = await supervisorsRes.json().catch(() => ({}));
    if (machinesRes.ok) setMachines(machinesData.machines || []);
    if (supervisorsRes.ok) {
      setSupervisors((supervisorsData.items || []).map((item: { id: string; name: string }) => ({ value: item.id, label: item.name })));
    }
    if (!machinesRes.ok || !supervisorsRes.ok) setStatus(machinesData.error || supervisorsData.error || "No autorizado.");
  }

  function startNewMachine() {
    setMachineForm(emptyMachine);
    setMachineMode("form");
    setSelectedMachineId(null);
    setUsageMode("list");
    setCustodyMode("list");
  }

  function editMachine(machine: Machine) {
    setSelectedMachineId(machine._id || null);
    setMachineForm(machine);
    setMachineMode("form");
  }

  function selectMachine(machine: Machine) {
    setSelectedMachineId(machine._id || null);
    setMachineMode("list");
    setUsageMode("list");
    setCustodyMode("list");
  }

  async function saveMachine(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando equipo...");

    const isNew = !machineForm._id;
    const res = await fetch(isNew ? "/api/admin/machines" : `/api/admin/machines/${machineForm._id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(machineForm),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el equipo.");
      return;
    }

    setStatus("Equipo guardado correctamente.");
    await loadMachines();
    setSelectedMachineId(data.machine?._id || null);
    setMachineMode("list");
  }

  async function deleteMachine() {
    if (!selectedMachine?._id) return;
    if (!window.confirm("Eliminar este equipo?")) return;

    const res = await fetch(`/api/admin/machines/${selectedMachine._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el equipo.");
      return;
    }

    setStatus("Equipo eliminado.");
    setSelectedMachineId(null);
    setMachineMode("list");
    await loadMachines();
  }

  async function uploadFile(file: File, folder: string) {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);

    const res = await fetch("/api/admin/cloudinary-upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo subir el archivo.");
    return data as { url: string; publicId: string };
  }

  async function uploadMachinePhoto(file: File) {
    setUploading(true);
    setStatus("Subiendo fotografia del equipo...");
    try {
      const uploaded = await uploadFile(file, "asoserlid/equipos");
      setMachineForm((current) => ({ ...current, photoUrl: uploaded.url, photoPublicId: uploaded.publicId }));
      setStatus("Fotografia cargada. Guarda el equipo para conservar el cambio.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir la fotografia.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadCustodyDocument(file: File) {
    setUploading(true);
    setStatus("Subiendo recibo de custodia...");
    try {
      const uploaded = await uploadFile(file, "asoserlid/custodias");
      setCustodyForm((current) => ({ ...current, documentUrl: uploaded.url, documentPublicId: uploaded.publicId }));
      setStatus("Recibo cargado. Guarda la custodia para conservar el cambio.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir el recibo.");
    } finally {
      setUploading(false);
    }
  }

  function startNewUsageLog() {
    setUsageForm(emptyUsageLog);
    setUsageMode("form");
  }

  async function saveUsageLog(e: FormEvent) {
    e.preventDefault();
    if (!selectedMachine?._id) return;
    setStatus("Guardando bitacora...");

    const res = await fetch(`/api/admin/machines/${selectedMachine._id}/usage-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usageForm),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar la bitacora.");
      return;
    }

    setStatus("Bitacora guardada correctamente.");
    setUsageForm(emptyUsageLog);
    setUsageMode("list");
    await loadMachines();
  }

  function startNewCustodyReceipt() {
    setCustodyForm(emptyCustodyReceipt);
    setCustodyMode("form");
  }

  async function saveCustodyReceipt(e: FormEvent) {
    e.preventDefault();
    if (!selectedMachine?._id) return;
    setStatus("Guardando recibo de custodia...");

    const res = await fetch(`/api/admin/machines/${selectedMachine._id}/custody-receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(custodyForm),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el recibo.");
      return;
    }

    setStatus("Recibo de custodia guardado correctamente.");
    setCustodyForm(emptyCustodyReceipt);
    setCustodyMode("list");
    await loadMachines();
  }

  return (
    <SystemModulePage moduleKey="machines">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Buscar por codigo, nombre, ubicacion..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={startNewMachine} className="shrink-0 rounded-md bg-[#173C61] px-4 py-2 font-semibold text-white hover:bg-[#218F93]">
              Nuevo
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {filteredMachines.map((machine) => (
              <button
                key={machine._id}
                onClick={() => selectMachine(machine)}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedMachineId === machine._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{machine.name}</span>
                <span className="mt-1 block text-xs text-slate-500">{machine.code} - {statusLabels[machine.status]}</span>
              </button>
            ))}
            {filteredMachines.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">No hay equipos para mostrar.</p>}
          </div>
        </aside>

        <div className="space-y-6">
          {machineMode === "form" ? (
            <MachineForm
              machineForm={machineForm}
              supervisors={supervisors}
              uploading={uploading}
              onCancel={() => setMachineMode("list")}
              onDelete={deleteMachine}
              onSubmit={saveMachine}
              onPhotoUpload={uploadMachinePhoto}
              onChange={setMachineForm}
            />
          ) : (
            <MachineDetail machine={selectedMachine} onEdit={() => selectedMachine && editMachine(selectedMachine)} onNew={startNewMachine} />
          )}

          {selectedMachine && machineMode === "list" && (
            <section className="grid gap-6 xl:grid-cols-2">
              <UsagePanel
                mode={usageMode}
                machine={selectedMachine}
                usageForm={usageForm}
                onNew={startNewUsageLog}
                onCancel={() => setUsageMode("list")}
                onSubmit={saveUsageLog}
                onChange={setUsageForm}
              />
              <CustodyPanel
                mode={custodyMode}
                machine={selectedMachine}
                custodyForm={custodyForm}
                uploading={uploading}
                onNew={startNewCustodyReceipt}
                onCancel={() => setCustodyMode("list")}
                onSubmit={saveCustodyReceipt}
                onDocumentUpload={uploadCustodyDocument}
                onChange={setCustodyForm}
              />
            </section>
          )}
        </div>
      </section>
    </SystemModulePage>
  );
}

function MachineDetail({ machine, onEdit, onNew }: { machine?: Machine; onEdit: () => void; onNew: () => void }) {
  if (!machine) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
        <p>No hay equipo seleccionado.</p>
        <button onClick={onNew} className="mt-4 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Crear primer equipo</button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 md:w-56">
          {machine.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={machine.photoUrl} alt="Fotografia del equipo" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">Sin fotografia</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-bold text-[#173C61]">{machine.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{machine.code}</p>
            </div>
            <button onClick={onEdit} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Editar equipo</button>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Tipo" value={machine.type} />
            <Info label="Estado" value={statusLabels[machine.status]} />
            <Info label="Uso principal" value={environmentLabels[machine.environment]} />
            <Info label="Ubicacion" value={machine.location || "-"} />
            <Info label="Responsable" value={machine.assignedTo || "-"} />
            <Info label="Notas" value={machine.notes || "-"} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function MachineForm({
  machineForm,
  supervisors,
  uploading,
  onChange,
  onSubmit,
  onPhotoUpload,
  onCancel,
  onDelete,
}: {
  machineForm: Machine;
  supervisors: SelectOption[];
  uploading: boolean;
  onChange: (machine: Machine) => void;
  onSubmit: (e: FormEvent) => void;
  onPhotoUpload: (file: File) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">{machineForm._id ? "Editar equipo" : "Nuevo equipo"}</h2>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver al listado</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input required className={inputClass} value={machineForm.name} onChange={(e) => onChange({ ...machineForm, name: e.target.value })} />
        </Field>
        <Field label="Codigo">
          <input readOnly className={`${inputClass} bg-slate-100 text-slate-500`} placeholder="Se genera automaticamente: MAQ0010001" value={machineForm.code} />
        </Field>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 md:grid-cols-[12rem_1fr] md:items-center">
          <div className="aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-white">
            {machineForm.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={machineForm.photoUrl} alt="Fotografia del equipo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">Sin fotografia</div>
            )}
          </div>
          <Field label="Fotografia del equipo">
            <input
              type="file"
              accept="image/*"
              className={inputClass}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhotoUpload(file);
                e.currentTarget.value = "";
              }}
            />
          </Field>
        </div>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <select required className={inputClass} value={machineForm.type} onChange={(e) => onChange({ ...machineForm, type: e.target.value })}>
            {machineTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select className={inputClass} value={machineForm.status} onChange={(e) => onChange({ ...machineForm, status: e.target.value as MachineStatus })}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Uso principal">
          <select className={inputClass} value={machineForm.environment} onChange={(e) => onChange({ ...machineForm, environment: e.target.value as MachineEnvironment })}>
            {Object.entries(environmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Ubicacion">
          <input className={inputClass} value={machineForm.location || ""} onChange={(e) => onChange({ ...machineForm, location: e.target.value })} />
        </Field>
        <SearchableSelect
          label="Responsable"
          value={supervisors.find((option) => option.label === machineForm.assignedTo)?.value || ""}
          options={supervisors}
          placeholder="Buscar responsable..."
          onChange={(option) => onChange({ ...machineForm, assignedTo: option?.label || "" })}
        />
      </div>

      <Field label="Notas">
        <textarea className={`${inputClass} mt-4 min-h-28`} value={machineForm.notes || ""} onChange={(e) => onChange({ ...machineForm, notes: e.target.value })} />
      </Field>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar equipo</button>
        {machineForm._id && <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>}
      </div>
    </form>
  );
}

function UsagePanel({
  mode,
  machine,
  usageForm,
  onNew,
  onCancel,
  onSubmit,
  onChange,
}: {
  mode: PanelMode;
  machine: Machine;
  usageForm: MachineUsageLog;
  onNew: () => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (log: MachineUsageLog) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#173C61]">Bitacora de uso</h2>
        {mode === "list" ? (
          <button onClick={onNew} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Nuevo registro</button>
        ) : (
          <button onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver</button>
        )}
      </div>

      {mode === "list" ? (
        <div className="space-y-2">
          {machine.usageLogs?.map((log) => (
            <article key={log._id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <strong>{log.date}</strong> - {log.usedBy} - {log.hoursUsed} h - {log.clientOrLocation}
            </article>
          ))}
          {!machine.usageLogs?.length && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">Sin registros de uso.</p>}
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha"><input type="date" required className={inputClass} value={usageForm.date} onChange={(e) => onChange({ ...usageForm, date: e.target.value })} /></Field>
            <Field label="Quien uso"><input required className={inputClass} value={usageForm.usedBy} onChange={(e) => onChange({ ...usageForm, usedBy: e.target.value })} /></Field>
            <Field label="Cliente o ubicacion"><input required className={inputClass} value={usageForm.clientOrLocation} onChange={(e) => onChange({ ...usageForm, clientOrLocation: e.target.value })} /></Field>
            <Field label="Horas usadas"><input type="number" min="0" step="0.25" required className={inputClass} value={usageForm.hoursUsed} onChange={(e) => onChange({ ...usageForm, hoursUsed: Number(e.target.value) })} /></Field>
            <Field label="Hora inicio"><input type="time" required className={inputClass} value={usageForm.startTime} onChange={(e) => onChange({ ...usageForm, startTime: e.target.value })} /></Field>
            <Field label="Hora fin"><input type="time" required className={inputClass} value={usageForm.endTime} onChange={(e) => onChange({ ...usageForm, endTime: e.target.value })} /></Field>
            <Field label="Estado inicial"><input required className={inputClass} value={usageForm.conditionBefore} onChange={(e) => onChange({ ...usageForm, conditionBefore: e.target.value })} /></Field>
            <Field label="Estado final"><input required className={inputClass} value={usageForm.conditionAfter} onChange={(e) => onChange({ ...usageForm, conditionAfter: e.target.value })} /></Field>
          </div>
          <Field label="Observaciones"><textarea className={`${inputClass} mt-4 min-h-24`} value={usageForm.observations || ""} onChange={(e) => onChange({ ...usageForm, observations: e.target.value })} /></Field>
          <button className="mt-4 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar bitacora</button>
        </form>
      )}
    </section>
  );
}

function CustodyPanel({
  mode,
  machine,
  custodyForm,
  uploading,
  onNew,
  onCancel,
  onSubmit,
  onDocumentUpload,
  onChange,
}: {
  mode: PanelMode;
  machine: Machine;
  custodyForm: MachineCustodyReceipt;
  uploading: boolean;
  onNew: () => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  onDocumentUpload: (file: File) => void;
  onChange: (receipt: MachineCustodyReceipt) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#173C61]">Recibo de custodia</h2>
        {mode === "list" ? (
          <button onClick={onNew} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Nuevo registro</button>
        ) : (
          <button onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver</button>
        )}
      </div>

      {mode === "list" ? (
        <div className="space-y-2">
          {machine.custodyReceipts?.map((receipt) => (
            <article key={receipt._id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <strong>{receipt.date}</strong> - {receipt.origin} a {receipt.destination} - recibe {receipt.receivedBy}
              {receipt.documentUrl && <a href={receipt.documentUrl} target="_blank" className="ml-2 font-semibold text-[#173C61]">Ver soporte</a>}
            </article>
          ))}
          {!machine.custodyReceipts?.length && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">Sin recibos de custodia.</p>}
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha"><input type="date" required className={inputClass} value={custodyForm.date} onChange={(e) => onChange({ ...custodyForm, date: e.target.value })} /></Field>
            <Field label="Retorno esperado"><input type="date" className={inputClass} value={custodyForm.expectedReturnDate || ""} onChange={(e) => onChange({ ...custodyForm, expectedReturnDate: e.target.value })} /></Field>
            <Field label="Entrega"><input required className={inputClass} value={custodyForm.deliveredBy} onChange={(e) => onChange({ ...custodyForm, deliveredBy: e.target.value })} /></Field>
            <Field label="Recibe"><input required className={inputClass} value={custodyForm.receivedBy} onChange={(e) => onChange({ ...custodyForm, receivedBy: e.target.value })} /></Field>
            <Field label="Origen"><input required className={inputClass} value={custodyForm.origin} onChange={(e) => onChange({ ...custodyForm, origin: e.target.value })} /></Field>
            <Field label="Destino"><input required className={inputClass} value={custodyForm.destination} onChange={(e) => onChange({ ...custodyForm, destination: e.target.value })} /></Field>
            <Field label="Motivo"><input required className={inputClass} value={custodyForm.reason} onChange={(e) => onChange({ ...custodyForm, reason: e.target.value })} /></Field>
            <Field label="Estado del equipo"><input required className={inputClass} value={custodyForm.condition} onChange={(e) => onChange({ ...custodyForm, condition: e.target.value })} /></Field>
          </div>
          <Field label="PDF o foto del recibo">
            <input
              type="file"
              accept="image/*,application/pdf"
              className={`${inputClass} mt-4`}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onDocumentUpload(file);
                e.currentTarget.value = "";
              }}
            />
          </Field>
          {custodyForm.documentUrl && <a href={custodyForm.documentUrl} target="_blank" className="mt-2 block text-sm font-semibold text-[#173C61]">Ver recibo cargado</a>}
          <Field label="Observaciones"><textarea className={`${inputClass} mt-4 min-h-24`} value={custodyForm.observations || ""} onChange={(e) => onChange({ ...custodyForm, observations: e.target.value })} /></Field>
          <button className="mt-4 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar custodia</button>
        </form>
      )}
    </section>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}
