"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ImportCsvModal from "@/components/system/ImportCsvModal";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, ServiceContract, Worker, WorkGroup } from "@/types/admin";

const emptyWorker: Worker = {
  documentId: "",
  firstName: "",
  lastName: "",
  position: "",
  phone: "",
  email: "",
  status: "active",
  documents: "",
  assignedClientId: "",
  assignedClient: "",
  assignedContractId: "",
  assignedContract: "",
  assignedArea: "",
  supervisor: "",
  workGroupId: "",
  workGroupName: "",
};

type PanelMode = "list" | "form";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [contracts, setContracts] = useState<SelectOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workerMode, setWorkerMode] = useState<PanelMode>("list");
  const [form, setForm] = useState<Worker>(emptyWorker);
  const [status, setStatus] = useState<string | null>(null);
  const [consulting, setConsulting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", workGroupId: "", assignedClientId: "" });

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker._id === selectedId),
    [workers, selectedId]
  );
  const selectedGroup = useMemo(
    () => workGroups.find((group) => group._id === form.workGroupId),
    [form.workGroupId, workGroups]
  );
  const visibleWorkers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workers.filter((worker) => {
      const text = [
        worker.documentId,
        worker.firstName,
        worker.lastName,
        worker.position,
        worker.phone,
        worker.email,
        worker.assignedClient,
        worker.assignedContract,
        worker.assignedArea,
        worker.workGroupName,
      ].join(" ").toLowerCase();

      if (term && !text.includes(term)) return false;
      if (filters.status && worker.status !== filters.status) return false;
      if (filters.workGroupId && worker.workGroupId !== filters.workGroupId) return false;
      if (filters.assignedClientId && worker.assignedClientId !== filters.assignedClientId) return false;
      return true;
    });
  }, [filters, search, workers]);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    setForm(selectedWorker || emptyWorker);
  }, [selectedWorker]);

  useEffect(() => {
    if (!selectedWorker && workers[0]?._id && workerMode === "list") {
      setSelectedId(workers[0]._id);
    }
  }, [selectedWorker, workerMode, workers]);

  async function loadWorkers() {
    const [workersRes, groupsRes, clientsRes, contractsRes] = await Promise.all([
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
    ]);
    const workersData = await workersRes.json().catch(() => ({}));
    const groupsData = await groupsRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));

    if (workersRes.ok) setWorkers(workersData.items || []);
    if (groupsRes.ok) {
      const items = (groupsData.items || []) as WorkGroup[];
      setWorkGroups(items);
      setGroups(items.map((group) => ({ value: group._id || "", label: group.name })));
    }
    if (clientsRes.ok) {
      setClients(((clientsData.items || []) as Client[]).map((client) => ({ value: client._id || "", label: client.name })));
    }
    if (contractsRes.ok) {
      setContracts(
        ((contractsData.items || []) as ServiceContract[]).map((contract) => ({
          value: contract._id || "",
          label: `${contract.clientName} - ${contract.area} - ${contract.shift}`,
        }))
      );
    }
    if (!workersRes.ok || !groupsRes.ok || !clientsRes.ok || !contractsRes.ok) {
      setStatus(workersData.error || groupsData.error || clientsData.error || contractsData.error || "No se pudo cargar trabajadores.");
    }
  }

  async function lookupDocument() {
    const documentId = form.documentId.trim();
    if (!documentId) {
      setStatus("Ingresa una cedula para consultar.");
      return;
    }

    setConsulting(true);
    setStatus("Consultando cedula...");

    const res = await fetch(`/api/admin/civil-registry/${encodeURIComponent(documentId)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setConsulting(false);

    if (!res.ok) {
      setStatus(data.error || "No se pudo consultar la cedula.");
      return;
    }

    setForm((current) => ({
      ...current,
      documentId: data.person.documentId || current.documentId,
      firstName: data.person.firstName || current.firstName,
      lastName: data.person.lastName || current.lastName,
      documents: data.person.fullName ? `Nombre validado: ${data.person.fullName}` : current.documents,
    }));
    setStatus("Datos encontrados. Completa cargo, contacto y datos laborales.");
  }

  function startNewWorker() {
    setSelectedId(null);
    setForm(emptyWorker);
    setWorkerMode("form");
  }

  function selectWorker(worker: Worker) {
    setSelectedId(worker._id || null);
    setWorkerMode("list");
  }

  function editWorker(worker: Worker) {
    setSelectedId(worker._id || null);
    setForm(worker);
    setWorkerMode("form");
  }

  async function saveWorker(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando trabajador...");

    const isNew = !form._id;
    const res = await fetch(isNew ? "/api/admin/workers" : `/api/admin/workers/${form._id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, supervisor: "" }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el trabajador.");
      return;
    }

    setStatus("Trabajador guardado correctamente.");
    await loadWorkers();
    setSelectedId(data.item?._id || null);
    setWorkerMode("list");
  }

  async function deleteWorker() {
    if (!selectedWorker?._id) return;
    if (!window.confirm("Eliminar este trabajador?")) return;

    const res = await fetch(`/api/admin/workers/${selectedWorker._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el trabajador.");
      return;
    }

    setStatus("Trabajador eliminado.");
    setSelectedId(null);
    setWorkerMode("list");
    await loadWorkers();
  }

  return (
    <SystemModulePage moduleKey="workers">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex gap-2">
            <input
              className={inputClass}
              placeholder="Buscar trabajador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={startNewWorker} className="shrink-0 rounded-md bg-[#173C61] px-4 py-2 font-semibold text-white hover:bg-[#218F93]">
              Nuevo trabajador
            </button>
          </div>
          <div className="mb-4">
            <ImportCsvModal
              title="Importar trabajadores"
              endpoint="/api/admin/imports/workers"
              templateHref="/api/admin/imports/workers"
              onImported={loadWorkers}
            />
          </div>

          <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
            <select className={inputClass} value={filters.workGroupId} onChange={(e) => setFilters({ ...filters, workGroupId: e.target.value })}>
              <option value="">Todos los grupos</option>
              {groups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
            </select>
            <select className={inputClass} value={filters.assignedClientId} onChange={(e) => setFilters({ ...filters, assignedClientId: e.target.value })}>
              <option value="">Todos los clientes</option>
              {clients.map((client) => <option key={client.value} value={client.value}>{client.label}</option>)}
            </select>
            {(search || filters.status || filters.workGroupId || filters.assignedClientId) && (
              <button type="button" onClick={() => { setSearch(""); setFilters({ status: "", workGroupId: "", assignedClientId: "" }); }} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleWorkers.map((worker) => (
              <button
                key={worker._id}
                onClick={() => selectWorker(worker)}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedId === worker._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{worker.firstName} {worker.lastName}</span>
                <span className="mt-1 block text-xs text-slate-500">{worker.documentId}</span>
              </button>
            ))}
            {visibleWorkers.length === 0 && <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Sin resultados.</p>}
          </div>
        </aside>

        {workerMode === "form" ? (
          <WorkerForm
            form={form}
            groups={groups}
            clients={clients}
            contracts={contracts}
            selectedGroup={selectedGroup}
            consulting={consulting}
            onChange={setForm}
            onSubmit={saveWorker}
            onLookupDocument={lookupDocument}
            onCancel={() => setWorkerMode("list")}
            onDelete={deleteWorker}
          />
        ) : (
          <WorkerDetail worker={selectedWorker} onEdit={() => selectedWorker && editWorker(selectedWorker)} onNew={startNewWorker} />
        )}
      </section>
    </SystemModulePage>
  );
}

function WorkerDetail({ worker, onEdit, onNew }: { worker?: Worker; onEdit: () => void; onNew: () => void }) {
  if (!worker) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
        <p>No hay trabajador seleccionado.</p>
        <button onClick={onNew} className="mt-4 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Crear primer trabajador</button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-bold text-[#173C61]">{worker.firstName} {worker.lastName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{worker.documentId}</p>
        </div>
        <button onClick={onEdit} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Editar trabajador</button>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <Info label="Cargo" value={worker.position} />
        <Info label="Estado" value={worker.status === "active" ? "Activo" : "Inactivo"} />
        <Info label="Contacto" value={worker.phone} />
        <Info label="Correo" value={worker.email || "-"} />
        <Info label="Grupo de trabajo" value={worker.workGroupName || "-"} />
        <Info label="Cliente" value={worker.assignedClient || "-"} />
        <Info label="Contrato / turno" value={worker.assignedContract || "-"} />
        <Info label="Area / lugar" value={worker.assignedArea || "-"} />
        <Info label="Documentos / validacion" value={worker.documents || "-"} />
      </dl>
    </section>
  );
}

function WorkerForm({
  form,
  groups,
  clients,
  contracts,
  selectedGroup,
  consulting,
  onChange,
  onSubmit,
  onLookupDocument,
  onCancel,
  onDelete,
}: {
  form: Worker;
  groups: SelectOption[];
  clients: SelectOption[];
  contracts: SelectOption[];
  selectedGroup?: WorkGroup;
  consulting: boolean;
  onChange: (worker: Worker) => void;
  onSubmit: (e: FormEvent) => void;
  onLookupDocument: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">{form._id ? "Editar trabajador" : "Nuevo trabajador"}</h2>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver al listado</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Cedula
          <div className="flex gap-2">
            <input required className={inputClass} value={form.documentId} onChange={(e) => onChange({ ...form, documentId: e.target.value })} />
            <button
              type="button"
              disabled={consulting}
              onClick={onLookupDocument}
              className="shrink-0 rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93] disabled:opacity-60"
            >
              {consulting ? "Consultando" : "Consultar"}
            </button>
          </div>
        </label>

        <Field label="Cargo">
          <input required className={inputClass} value={form.position} onChange={(e) => onChange({ ...form, position: e.target.value })} />
        </Field>
        <Field label="Nombres">
          <input required className={inputClass} value={form.firstName} onChange={(e) => onChange({ ...form, firstName: e.target.value })} />
        </Field>
        <Field label="Apellidos">
          <input required className={inputClass} value={form.lastName} onChange={(e) => onChange({ ...form, lastName: e.target.value })} />
        </Field>
        <Field label="Contacto">
          <input required className={inputClass} value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Correo">
          <input type="email" className={inputClass} value={form.email || ""} onChange={(e) => onChange({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Estado">
          <select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as Worker["status"] })}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </Field>
        <SearchableSelect
          label="Grupo de trabajo"
          value={form.workGroupId || ""}
          options={groups}
          placeholder="Buscar grupo..."
          onChange={(option) => onChange({ ...form, workGroupId: option?.value || "", workGroupName: option?.label || "" })}
        />
        <Field label="Supervisor del grupo">
          <input className={inputClass} value={selectedGroup?.supervisorName || "Sin supervisor asignado"} readOnly />
        </Field>
        <SearchableSelect
          label="CLIENTE-CONTRATO-ENTIDAD-EMPRESA"
          value={form.assignedClientId || ""}
          options={clients}
          placeholder="Buscar cliente..."
          onChange={(option) => onChange({ ...form, assignedClientId: option?.value || "", assignedClient: option?.label || "" })}
        />
        <SearchableSelect
          label="Contrato / turno asignado"
          value={form.assignedContractId || ""}
          options={contracts}
          placeholder="Buscar contrato..."
          onChange={(option) => onChange({ ...form, assignedContractId: option?.value || "", assignedContract: option?.label || "" })}
        />
        <Field label="Area / lugar de trabajo">
          <input className={inputClass} value={form.assignedArea || ""} onChange={(e) => onChange({ ...form, assignedArea: e.target.value })} />
        </Field>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Documentos / validacion
        <textarea className={`${inputClass} min-h-28`} value={form.documents || ""} onChange={(e) => onChange({ ...form, documents: e.target.value })} />
      </label>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar trabajador</button>
        {form._id && (
          <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
            Eliminar
          </button>
        )}
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
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}
