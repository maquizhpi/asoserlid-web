"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, Machine, MachineCustodyReceipt, MachineEnvironment, MachineStatus, MachineUsageLog, ServiceContract, Worker } from "@/types/admin";

const emptyMachine: Machine = {
  name: "",
  code: "",
  type: "Hidrolavadora",
  environment: "companies",
  status: "available",
  location: "",
  assignedTo: "",
  ownerWorkGroupId: "",
  ownerWorkGroupName: "",
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

const conditionOptions = ["Bueno", "Regular", "Dañado"];

type PanelMode = "list" | "form";

export default function EquipmentModulePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [workGroups, setWorkGroups] = useState<SelectOption[]>([]);
  const [workers, setWorkers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [contractAreaOptions, setContractAreaOptions] = useState<SelectOption[]>([]);
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
      [machine.name, machine.code, machine.type, machine.location, machine.assignedTo, machine.ownerWorkGroupName]
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
    const [machinesRes, supervisorsRes, workGroupsRes, workersRes, clientsRes, contractsRes] = await Promise.all([
      fetch("/api/admin/machines", { cache: "no-store" }),
      fetch("/api/admin/supervisors", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
    ]);
    const machinesData = await machinesRes.json().catch(() => ({}));
    const supervisorsData = await supervisorsRes.json().catch(() => ({}));
    const workGroupsData = await workGroupsRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));
    if (machinesRes.ok) setMachines(machinesData.machines || []);
    if (supervisorsRes.ok) {
      setSupervisors((supervisorsData.items || []).map((item: { id: string; name: string }) => ({ value: item.id, label: item.name })));
    }
    if (workGroupsRes.ok) {
      setWorkGroups((workGroupsData.items || []).map((item: { _id?: string; name: string }) => ({ value: item._id || item.name, label: item.name })));
    }
    if (workersRes.ok) {
      setWorkers((workersData.items || []).filter((worker: Worker) => worker.status === "active").map((worker: Worker) => ({
        value: worker._id || worker.documentId,
        label: `${worker.firstName} ${worker.lastName}`.trim(),
      })));
    }
    if (clientsRes.ok) {
      setClients((clientsData.items || []).filter((client: Client) => client.status === "active").map((client: Client) => ({
        value: client._id || client.taxId,
        label: client.name,
      })));
    }
    if (contractsRes.ok) {
      setContractAreaOptions(buildContractAreaOptions(contractsData.items || []));
    }
    if (!machinesRes.ok || !supervisorsRes.ok || !workGroupsRes.ok || !workersRes.ok || !clientsRes.ok || !contractsRes.ok) setStatus(machinesData.error || supervisorsData.error || workGroupsData.error || workersData.error || clientsData.error || contractsData.error || "No autorizado.");
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
              workGroups={workGroups}
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
                workers={workers}
                clients={clients}
                onNew={startNewUsageLog}
                onCancel={() => setUsageMode("list")}
                onSubmit={saveUsageLog}
                onChange={setUsageForm}
              />
              <CustodyPanel
                mode={custodyMode}
                machine={selectedMachine}
                custodyForm={custodyForm}
                workers={workers}
                contractAreaOptions={contractAreaOptions}
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
            <Info label="Propietario" value={machine.ownerWorkGroupName || "-"} />
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
  workGroups,
  uploading,
  onChange,
  onSubmit,
  onPhotoUpload,
  onCancel,
  onDelete,
}: {
  machineForm: Machine;
  supervisors: SelectOption[];
  workGroups: SelectOption[];
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
          label="Propietario"
          value={machineForm.ownerWorkGroupId || ""}
          options={workGroups}
          placeholder="Buscar grupo de trabajo..."
          onChange={(option) => onChange({ ...machineForm, ownerWorkGroupId: option?.value || "", ownerWorkGroupName: option?.label || "" })}
        />
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
  workers,
  clients,
  onNew,
  onCancel,
  onSubmit,
  onChange,
}: {
  mode: PanelMode;
  machine: Machine;
  usageForm: MachineUsageLog;
  workers: SelectOption[];
  clients: SelectOption[];
  onNew: () => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (log: MachineUsageLog) => void;
}) {
  const [selectedLog, setSelectedLog] = useState<MachineUsageLog | null>(null);
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
            <button key={log._id} type="button" onClick={() => setSelectedLog(log)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-[#33C3C9] hover:bg-[#E6F8F9]">
              <strong>{log.date}</strong> - {log.usedBy} - {log.hoursUsed} h - {log.clientOrLocation}
            </button>
          ))}
          {!machine.usageLogs?.length && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">Sin registros de uso.</p>}
          {selectedLog && <UsageLogModal machine={machine} log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha"><input type="date" required className={inputClass} value={usageForm.date} onChange={(e) => onChange({ ...usageForm, date: e.target.value })} /></Field>
            <SearchableSelect
              label="Quien uso"
              value={workers.find((option) => option.label === usageForm.usedBy)?.value || ""}
              options={workers}
              placeholder="Buscar trabajador..."
              onChange={(option) => onChange({ ...usageForm, usedBy: option?.label || "" })}
            />
            <SearchableSelect
              label="Cliente"
              value={clients.find((option) => option.label === usageForm.clientOrLocation)?.value || ""}
              options={clients}
              placeholder="Buscar cliente registrado..."
              onChange={(option) => onChange({ ...usageForm, clientOrLocation: option?.label || "" })}
            />
            <Field label="Horas usadas"><input type="number" min="0" step="0.25" required className={inputClass} value={usageForm.hoursUsed} onChange={(e) => onChange({ ...usageForm, hoursUsed: Number(e.target.value) })} /></Field>
            <Field label="Hora inicio"><input type="time" required className={inputClass} value={usageForm.startTime} onChange={(e) => onChange({ ...usageForm, startTime: e.target.value })} /></Field>
            <Field label="Hora fin"><input type="time" required className={inputClass} value={usageForm.endTime} onChange={(e) => onChange({ ...usageForm, endTime: e.target.value })} /></Field>
            <Field label="Estado inicial">
              <select required className={inputClass} value={usageForm.conditionBefore} onChange={(e) => onChange({ ...usageForm, conditionBefore: e.target.value })}>
                {conditionOptions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
              </select>
            </Field>
            <Field label="Estado final">
              <select required className={inputClass} value={usageForm.conditionAfter} onChange={(e) => onChange({ ...usageForm, conditionAfter: e.target.value })}>
                {conditionOptions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
              </select>
            </Field>
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
  workers,
  contractAreaOptions,
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
  workers: SelectOption[];
  contractAreaOptions: SelectOption[];
  uploading: boolean;
  onNew: () => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  onDocumentUpload: (file: File) => void;
  onChange: (receipt: MachineCustodyReceipt) => void;
}) {
  const [selectedReceipt, setSelectedReceipt] = useState<MachineCustodyReceipt | null>(null);
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
            <button key={receipt._id} type="button" onClick={() => setSelectedReceipt(receipt)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-[#33C3C9] hover:bg-[#E6F8F9]">
              <strong>{receipt.date}</strong> - {receipt.origin} a {receipt.destination} - recibe {receipt.receivedBy}
              {receipt.documentUrl && <span className="ml-2 font-semibold text-[#173C61]">Con soporte</span>}
            </button>
          ))}
          {!machine.custodyReceipts?.length && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">Sin recibos de custodia.</p>}
          {selectedReceipt && <CustodyReceiptModal machine={machine} receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha"><input type="date" required className={inputClass} value={custodyForm.date} onChange={(e) => onChange({ ...custodyForm, date: e.target.value })} /></Field>
            <Field label="Retorno esperado"><input type="date" className={inputClass} value={custodyForm.expectedReturnDate || ""} onChange={(e) => onChange({ ...custodyForm, expectedReturnDate: e.target.value })} /></Field>
            <SearchableSelect
              label="Entrega"
              value={workers.find((option) => option.label === custodyForm.deliveredBy)?.value || ""}
              options={workers}
              placeholder="Buscar trabajador que entrega..."
              onChange={(option) => onChange({ ...custodyForm, deliveredBy: option?.label || "" })}
            />
            <SearchableSelect
              label="Recibe"
              value={workers.find((option) => option.label === custodyForm.receivedBy)?.value || ""}
              options={workers}
              placeholder="Buscar trabajador que recibe..."
              onChange={(option) => onChange({ ...custodyForm, receivedBy: option?.label || "" })}
            />
            <SearchableSelect
              label="Origen"
              value={contractAreaOptions.find((option) => option.label === custodyForm.origin)?.value || ""}
              options={contractAreaOptions}
              placeholder="Buscar contrato / lugar / area..."
              onChange={(option) => onChange({ ...custodyForm, origin: option?.label || "" })}
            />
            <SearchableSelect
              label="Destino"
              value={contractAreaOptions.find((option) => option.label === custodyForm.destination)?.value || ""}
              options={contractAreaOptions}
              placeholder="Buscar contrato / lugar / area..."
              onChange={(option) => onChange({ ...custodyForm, destination: option?.label || "" })}
            />
            <Field label="Motivo"><input required className={inputClass} value={custodyForm.reason} onChange={(e) => onChange({ ...custodyForm, reason: e.target.value })} /></Field>
            <Field label="Estado del equipo">
              <select required className={inputClass} value={custodyForm.condition} onChange={(e) => onChange({ ...custodyForm, condition: e.target.value })}>
                {conditionOptions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
              </select>
            </Field>
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

function UsageLogModal({ machine, log, onClose }: { machine: Machine; log: MachineUsageLog; onClose: () => void }) {
  return (
    <DetailModal title="Detalle de bitacora de uso" onClose={onClose} onPrint={() => printUsageLog(machine, log)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Equipo" value={`${machine.name} (${machine.code})`} />
        <InfoCard label="Fecha" value={log.date} />
        <InfoCard label="Quien uso" value={log.usedBy} />
        <InfoCard label="Cliente" value={log.clientOrLocation} />
        <InfoCard label="Hora inicio" value={log.startTime} />
        <InfoCard label="Hora fin" value={log.endTime} />
        <InfoCard label="Horas usadas" value={`${log.hoursUsed} h`} />
        <InfoCard label="Estado inicial" value={log.conditionBefore} />
        <InfoCard label="Estado final" value={log.conditionAfter} />
        <InfoCard label="Observaciones" value={log.observations || "-"} wide />
      </div>
    </DetailModal>
  );
}

function CustodyReceiptModal({ machine, receipt, onClose }: { machine: Machine; receipt: MachineCustodyReceipt; onClose: () => void }) {
  return (
    <DetailModal title="Detalle de recibo de custodia" onClose={onClose} onPrint={() => printCustodyReceipt(machine, receipt)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Equipo" value={`${machine.name} (${machine.code})`} />
        <InfoCard label="Fecha" value={receipt.date} />
        <InfoCard label="Retorno esperado" value={receipt.expectedReturnDate || "-"} />
        <InfoCard label="Entrega" value={receipt.deliveredBy} />
        <InfoCard label="Recibe" value={receipt.receivedBy} />
        <InfoCard label="Origen" value={receipt.origin} />
        <InfoCard label="Destino" value={receipt.destination} />
        <InfoCard label="Motivo" value={receipt.reason} />
        <InfoCard label="Estado del equipo" value={receipt.condition} />
        <InfoCard label="Observaciones" value={receipt.observations || "-"} wide />
      </div>
      {receipt.documentUrl && <a href={receipt.documentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-50">Ver soporte cargado</a>}
    </DetailModal>
  );
}

function DetailModal({ title, children, onClose, onPrint }: { title: string; children: ReactNode; onClose: () => void; onPrint: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <h2 className="text-xl font-bold text-[#173C61]">{title}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={onPrint} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-bold text-white hover:bg-[#218F93]">Imprimir</button>
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar</button>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function InfoCard({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-slate-200 bg-slate-50 p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line font-semibold text-[#173C61]">{value || "-"}</p>
    </div>
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

function printUsageLog(machine: Machine, log: MachineUsageLog) {
  printDocument("Bitacora de uso de equipo", [
    ["Equipo", `${machine.name} (${machine.code})`],
    ["Fecha", log.date],
    ["Quien uso", log.usedBy],
    ["Cliente", log.clientOrLocation],
    ["Hora inicio", log.startTime],
    ["Hora fin", log.endTime],
    ["Horas usadas", `${log.hoursUsed} h`],
    ["Estado inicial", log.conditionBefore],
    ["Estado final", log.conditionAfter],
    ["Observaciones", log.observations || "-"],
  ]);
}

function printCustodyReceipt(machine: Machine, receipt: MachineCustodyReceipt) {
  printCustodyDocument("Recibo de custodia de equipo", [
    ["Equipo", `${machine.name} (${machine.code})`],
    ["Tipo", machine.type],
    ["Propietario", machine.ownerWorkGroupName || "-"],
    ["Fecha", receipt.date],
    ["Retorno esperado", receipt.expectedReturnDate || "-"],
    ["Entrega", receipt.deliveredBy],
    ["Recibe", receipt.receivedBy],
    ["Origen", receipt.origin],
    ["Destino", receipt.destination],
    ["Motivo", receipt.reason],
    ["Estado del equipo", receipt.condition],
    ["Observaciones", receipt.observations || "-"],
    ["Soporte", receipt.documentUrl || "-"],
  ], [
    { label: "Entrega", name: receipt.deliveredBy },
    { label: "Recibe", name: receipt.receivedBy },
    { label: "Supervisor", name: machine.assignedTo || "Supervisor" },
  ]);
}

function printDocument(title: string, rows: Array<[string, string]>) {
  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f2742; padding: 28px; }
          h1 { font-size: 22px; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
          th { width: 32%; background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
      </body>
    </html>
  `;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function printCustodyDocument(title: string, rows: Array<[string, string]>, signatures: Array<{ label: string; name: string }>) {
  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #0f2742; padding: 28px; }
          .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #173C61; padding-bottom: 14px; margin-bottom: 18px; }
          .brand { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #218F93; }
          h1 { font-size: 22px; margin: 4px 0 0; }
          .code { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; font-weight: 700; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
          th { width: 32%; background: #f1f5f9; color: #173C61; }
          .statement { margin-top: 18px; border: 1px solid #cbd5e1; background: #f8fafc; padding: 12px; font-size: 13px; line-height: 1.5; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 76px; }
          .signature { text-align: center; font-size: 12px; min-height: 74px; }
          .line { border-top: 1px solid #0f2742; padding-top: 8px; font-weight: 700; }
          .role { margin-top: 4px; color: #475569; font-weight: 700; }
          @media print { body { padding: 18px; } .signatures { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <section class="header">
          <div>
            <div class="brand">SIT - Sistema Integrado de Trabajo</div>
            <h1>${escapeHtml(title)}</h1>
          </div>
          <div class="code">
            Fecha de impresion<br />
            ${new Date().toLocaleDateString("es-EC")}
          </div>
        </section>

        <table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>

        <div class="statement">
          Por medio del presente documento se deja constancia de la entrega, recepcion y custodia del equipo descrito, con el estado indicado y bajo responsabilidad de las partes firmantes.
        </div>

        <section class="signatures">
          ${signatures.map((signature) => `
            <div class="signature">
              <div class="line">${escapeHtml(signature.name || "-")}</div>
              <div class="role">${escapeHtml(signature.label)}</div>
            </div>
          `).join("")}
        </section>
      </body>
    </html>
  `;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildContractAreaOptions(contracts: ServiceContract[]): SelectOption[] {
  return contracts.flatMap((contract, contractIndex) => {
    const contractName = contract.contractNumber
      ? `${contract.clientName} - ${contract.contractNumber}`
      : `${contract.clientName} - ${contract.serviceType}`;

    if (contract.workplaces?.length) {
      return contract.workplaces.flatMap((workplace, workplaceIndex) => {
        if (workplace.areas?.length) {
          return workplace.areas.map((area, areaIndex) => ({
            value: `${contract._id || contractIndex}:${workplace.id || workplaceIndex}:${area.id || areaIndex}`,
            label: `${contractName} / ${workplace.name} / ${area.name}`,
          }));
        }
        return [{
          value: `${contract._id || contractIndex}:${workplace.id || workplaceIndex}:sin-area`,
          label: `${contractName} / ${workplace.name}`,
        }];
      });
    }

    if (contract.area || contract.shift) {
      return [{
        value: `${contract._id || contractIndex}:general`,
        label: [contractName, contract.area, contract.shift].filter(Boolean).join(" / "),
      }];
    }

    return [{
      value: `${contract._id || contractIndex}:general`,
      label: contractName,
    }];
  })
    .filter((option) => option.label.trim())
    .filter((option, index, all) => all.findIndex((item) => item.label === option.label) === index)
    .map((option, index) => ({
      ...option,
      value: option.value || String(index),
    }));
}
