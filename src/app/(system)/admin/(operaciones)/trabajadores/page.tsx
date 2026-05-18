"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ImportCsvModal from "@/components/system/ImportCsvModal";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import { notifySystem } from "@/components/system/SystemNotifier";
import type { Client, EmployeePosition, EppDeliveryItem, EppDeliveryProfile, ServiceContract, TalentEducation, TalentFamilyLoad, TalentHumanProfile, TalentPersonalReference, TalentTraining, TalentWorkHistory, Worker, WorkGroup } from "@/types/admin";

const emptyWorker: Worker = {
  documentId: "",
  firstName: "",
  lastName: "",
  position: "",
  phone: "",
  email: "",
  photoUrl: "",
  photoPublicId: "",
  bankName: "",
  bankAccountType: "",
  bankAccountNumber: "",
  socio: "No",
  status: "active",
  documents: "",
  assignedClientId: "",
  assignedClient: "",
  assignedContractId: "",
  assignedContract: "",
  assignedArea: "",
  assignedSchedule: "",
  supervisor: "",
  workGroupId: "",
  workGroupName: "",
  talentProfile: undefined,
};

function createEmptyWorker(): Worker {
  return { ...emptyWorker };
}

type PanelMode = "list" | "form";
type ExportFilters = { workGroupId: string; status: string; socio: string; assignedContractId: string; format: "pdf" | "excel" };

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [contracts, setContracts] = useState<SelectOption[]>([]);
  const [positions, setPositions] = useState<SelectOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workerMode, setWorkerMode] = useState<PanelMode>("list");
  const [form, setForm] = useState<Worker>(createEmptyWorker);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [eppWorker, setEppWorker] = useState<Worker | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [consulting, setConsulting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", workGroupId: "", assignedClientId: "" });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<ExportFilters>({ workGroupId: "", status: "", socio: "", assignedContractId: "", format: "pdf" });

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker._id === selectedId),
    [workers, selectedId]
  );
  const selectedGroup = useMemo(
    () => findWorkGroupForWorker(form, workGroups),
    [form, workGroups]
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
      if (filters.workGroupId && !workerMatchesWorkGroup(worker, filters.workGroupId, workGroups)) return false;
      if (filters.assignedClientId && worker.assignedClientId !== filters.assignedClientId) return false;
      return true;
    });
  }, [filters, search, workGroups, workers]);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    setForm(selectedWorker ? normalizeWorkerCompany(selectedWorker, workGroups) : createEmptyWorker());
  }, [selectedWorker, workGroups]);

  useEffect(() => {
    if (!selectedWorker && workers[0]?._id && workerMode === "list") {
      setSelectedId(workers[0]._id);
    }
  }, [selectedWorker, workerMode, workers]);

  async function loadWorkers() {
    const [workersRes, groupsRes, clientsRes, contractsRes, positionsRes] = await Promise.all([
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
      fetch("/api/admin/employee-positions", { cache: "no-store" }),
    ]);
    const workersData = await workersRes.json().catch(() => ({}));
    const groupsData = await groupsRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));
    const positionsData = await positionsRes.json().catch(() => ({}));

    if (workersRes.ok) setWorkers(workersData.items || []);
    if (groupsRes.ok) {
      const items = (groupsData.items || []) as WorkGroup[];
      setWorkGroups(items);
      setGroups(items.map((group) => ({ value: group._id || group.name, label: group.commercialName || group.name })));
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
    if (positionsRes.ok) {
      setPositions(
        ((positionsData.items || []) as EmployeePosition[])
          .filter((item) => item.status === "active")
          .map((item) => ({ value: item.name, label: item.name }))
      );
    }
    if (!workersRes.ok || !groupsRes.ok || !clientsRes.ok || !contractsRes.ok || !positionsRes.ok) {
      setStatus(workersData.error || groupsData.error || clientsData.error || contractsData.error || positionsData.error || "No se pudo cargar trabajadores.");
    }
  }

  async function lookupDocument() {
    const documentId = form.documentId.trim();
    if (!isValidDocumentId(documentId)) {
      const message = "La cedula debe tener 10 digitos numericos.";
      setStatus(message);
      notifySystem(message, { tone: "warning" });
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
    setForm(createEmptyWorker());
    setWorkerMode("form");
  }

  function selectWorker(worker: Worker) {
    setSelectedId(worker._id || null);
    setWorkerMode("list");
  }

  function editWorker(worker: Worker) {
    setSelectedId(worker._id || null);
    setForm(normalizeWorkerCompany(worker, workGroups));
    setWorkerMode("form");
  }

  async function saveWorker(e: FormEvent) {
    e.preventDefault();
    if (!isValidDocumentId(form.documentId)) {
      const message = "La cedula debe tener 10 digitos numericos antes de guardar.";
      setStatus(message);
      notifySystem(message, { tone: "warning" });
      return;
    }
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
      notifySystem(data.error || "No se pudo guardar el trabajador.", { tone: "error" });
      return;
    }

    setStatus("Trabajador guardado correctamente.");
    notifySystem(isNew ? "Trabajador creado correctamente." : "Trabajador actualizado correctamente.", { tone: "success" });
    await loadWorkers();
    setSelectedId(data.item?._id || null);
    setWorkerMode("list");
  }

  async function uploadWorkerPhoto(file: File) {
    setStatus("Subiendo fotografia...");
    const body = new FormData();
    body.append("file", file);
    body.append("folder", "asoserlid/trabajadores");
    const res = await fetch("/api/admin/cloudinary-upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo subir la fotografia.");
      return;
    }
    setForm((current) => ({ ...current, photoUrl: data.url || "", photoPublicId: data.publicId || "" }));
    setStatus("Fotografia cargada. Guarda o actualiza el trabajador para conservar el cambio.");
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

  function exportFilteredWorkersPdf() {
    const exportWorkers = getWorkersForExport(workers, exportFilters, workGroups, contracts);
    if (exportFilters.format === "excel") {
      downloadWorkersCsv(exportWorkers, "trabajadores-filtrados.csv");
    } else {
      openPrintWindow(buildWorkersReportHtml(exportWorkers, "Reporte PDF de trabajadores", getExportFilterSummary(exportFilters, groups, contracts)));
    }
    setExportOpen(false);
  }

  async function saveTalentProfile(worker: Worker, talentProfile: TalentHumanProfile) {
    if (!worker._id) return;
    const completed = isTalentProfileComplete(talentProfile);
    const payload: Worker = {
      ...worker,
      talentProfile: {
        ...talentProfile,
        completed,
        completedAt: completed ? new Date().toISOString() : talentProfile.completedAt,
      },
    };
    const res = await fetch(`/api/admin/workers/${worker._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo guardar la ficha de talento humano.", { tone: "error" });
      return;
    }
    notifySystem(completed ? "Ficha de talento humano guardada y completa." : "Ficha guardada. Aun faltan datos obligatorios.", { tone: completed ? "success" : "warning" });
    setProfileWorker(null);
    await loadWorkers();
    setSelectedId(data.item?._id || worker._id);
  }

  async function saveEppDelivery(worker: Worker, eppDelivery: EppDeliveryProfile) {
    if (!worker._id) return;
    const payload: Worker = {
      ...worker,
      eppDelivery: {
        ...eppDelivery,
        completed: Boolean(eppDelivery.items?.some((item) => item.delivered)),
        generatedAt: new Date().toISOString(),
      },
    };
    const res = await fetch(`/api/admin/workers/${worker._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo guardar el kit EPP.", { tone: "error" });
      return;
    }
    notifySystem("Kit EPP guardado correctamente.", { tone: "success" });
    setEppWorker(null);
    await loadWorkers();
    setSelectedId(data.item?._id || worker._id);
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
            <div className="grid gap-2 sm:grid-cols-2">
              <ImportCsvModal
                title="Importar trabajadores"
                endpoint="/api/admin/imports/workers"
                templateHref="/api/admin/imports/workers"
                onImported={loadWorkers}
              />
              <button type="button" onClick={() => setExportOpen(true)} className="rounded-md border border-[#173C61] bg-white px-4 py-3 font-semibold text-[#173C61] hover:bg-[#E6F8F9]">
                Exportar
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
            <select className={inputClass} value={filters.workGroupId} onChange={(e) => setFilters({ ...filters, workGroupId: e.target.value })}>
              <option value="">Todas las empresas</option>
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
            positions={positions}
            selectedGroup={selectedGroup}
            consulting={consulting}
            onChange={setForm}
            onSubmit={saveWorker}
            onLookupDocument={lookupDocument}
            onUploadPhoto={uploadWorkerPhoto}
            onCancel={() => setWorkerMode("list")}
            onDelete={deleteWorker}
          />
        ) : (
          <WorkerDetail
            worker={selectedWorker}
            onEdit={() => selectedWorker && editWorker(selectedWorker)}
            onNew={startNewWorker}
            onOpenProfile={() => selectedWorker && setProfileWorker(selectedWorker)}
            onOpenEpp={() => selectedWorker && setEppWorker(selectedWorker)}
          />
        )}
      </section>

      {profileWorker && (
        <TalentProfileModal
          worker={profileWorker}
          onClose={() => setProfileWorker(null)}
          onSave={(profile) => saveTalentProfile(profileWorker, profile)}
        />
      )}
      {eppWorker && (
        <EppDeliveryModal
          worker={eppWorker}
          onClose={() => setEppWorker(null)}
          onSave={(delivery) => saveEppDelivery(eppWorker, delivery)}
        />
      )}
      {exportOpen && (
        <ExportWorkersModal
          filters={exportFilters}
          groups={groups}
          contracts={contracts}
          total={getWorkersForExport(workers, exportFilters, workGroups, contracts).length}
          onChange={setExportFilters}
          onClose={() => setExportOpen(false)}
          onExport={exportFilteredWorkersPdf}
        />
      )}
    </SystemModulePage>
  );
}

function WorkerDetail({ worker, onEdit, onNew, onOpenProfile, onOpenEpp }: { worker?: Worker; onEdit: () => void; onNew: () => void; onOpenProfile: () => void; onOpenEpp: () => void }) {
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
        <div className="flex gap-4">
          <WorkerPhoto worker={worker} />
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">{worker.firstName} {worker.lastName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{worker.documentId}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onOpenProfile} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-50">
            {isTalentProfileComplete(worker.talentProfile) ? "Ver ficha" : "Ficha talento humano"}
          </button>
          <button onClick={onOpenEpp} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-50">
            {isEppDeliveryComplete(worker.eppDelivery) ? "Ver kit EPP" : "Kit EPP"}
          </button>
          <button onClick={() => printWorkerResume(worker)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-50">Imprimir hoja de vida</button>
          <button onClick={onEdit} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Actualizar trabajador</button>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <Info label="Cargo" value={worker.position} />
        <Info label="Estado" value={worker.status === "active" ? "Activo" : "Inactivo"} />
        <Info label="Contacto" value={worker.phone} />
        <Info label="Correo" value={worker.email || "-"} />
        <Info label="Empresa" value={worker.workGroupName || "-"} />
        <Info label="Banco" value={worker.bankName || "-"} />
        <Info label="Tipo de cuenta" value={worker.bankAccountType || "-"} />
        <Info label="Numero de cuenta" value={worker.bankAccountNumber || "-"} />
        <Info label="Socio" value={worker.socio || "No"} />
        <Info label="Cliente" value={worker.assignedClient || "-"} />
        <Info label="Contrato / turno" value={worker.assignedContract || "-"} />
        <Info label="Area / lugar" value={worker.assignedArea || "-"} />
        <Info label="Horario" value={worker.assignedSchedule || "-"} />
        <Info label="Documentos / validacion" value={worker.documents || "-"} />
      </dl>
    </section>
  );
}

function ExportWorkersModal({
  filters,
  groups,
  contracts,
  total,
  onChange,
  onClose,
  onExport,
}: {
  filters: ExportFilters;
  groups: SelectOption[];
  contracts: SelectOption[];
  total: number;
  onChange: (filters: ExportFilters) => void;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Exportar trabajadores</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona los filtros para generar el PDF.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Formato">
            <select className={inputClass} value={filters.format} onChange={(e) => onChange({ ...filters, format: e.target.value as ExportFilters["format"] })}>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </Field>
          <Field label="Empresa">
            <select className={inputClass} value={filters.workGroupId} onChange={(e) => onChange({ ...filters, workGroupId: e.target.value })}>
              <option value="">Todas</option>
              {groups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })}>
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </Field>
          <Field label="Socio">
            <select className={inputClass} value={filters.socio} onChange={(e) => onChange({ ...filters, socio: e.target.value })}>
              <option value="">Todos</option>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </Field>
          <Field label="Contrato">
            <select className={inputClass} value={filters.assignedContractId} onChange={(e) => onChange({ ...filters, assignedContractId: e.target.value })}>
              <option value="">Todos</option>
              {contracts.map((contract) => <option key={contract.value} value={contract.value}>{contract.label}</option>)}
            </select>
          </Field>
        </div>

        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          Se exportaran {total} trabajador(es).
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onExport} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">
            Exportar
          </button>
          <button type="button" onClick={() => onChange({ workGroupId: "", status: "", socio: "", assignedContractId: "", format: "pdf" })} className="rounded-md border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
            Limpiar
          </button>
        </div>
      </section>
    </div>
  );
}

function TalentProfileModal({ worker, onSave, onClose }: { worker: Worker; onSave: (profile: TalentHumanProfile) => void; onClose: () => void }) {
  const [profile, setProfile] = useState<TalentHumanProfile>(normalizeTalentProfile(worker));

  function update<K extends keyof TalentHumanProfile>(key: K, value: TalentHumanProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Ficha talento humano</h2>
            <p className="text-sm text-slate-600">{worker.firstName} {worker.lastName} | {worker.documentId}</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar</button>
        </div>

        <div className="space-y-5">
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>Datos personales</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fecha actual"><input type="date" className={inputClass} value={profile.currentDate || ""} onChange={(e) => update("currentDate", e.target.value)} /></Field>
              <Field label="Cargo"><input className={inputClass} value={worker.position} readOnly /></Field>
              <Field label="Fecha de nacimiento"><input type="date" className={inputClass} value={profile.birthDate || ""} onChange={(e) => setProfile((current) => ({ ...current, birthDate: e.target.value, age: calculateAge(e.target.value) }))} /></Field>
              <Field label="Edad"><input type="number" className={inputClass} value={profile.age || 0} onChange={(e) => update("age", Number(e.target.value))} /></Field>
              <Field label="Estado civil"><input className={inputClass} value={profile.civilStatus || ""} onChange={(e) => update("civilStatus", e.target.value)} /></Field>
              <Field label="Telefono casa"><input className={inputClass} value={profile.homePhone || ""} onChange={(e) => update("homePhone", e.target.value)} /></Field>
              <Field label="Telefono celular"><input className={inputClass} value={worker.phone} readOnly /></Field>
              <Field label="Correo electronico"><input className={inputClass} value={worker.email || ""} readOnly /></Field>
              <Field label="Carnet Conadis"><select className={inputClass} value={profile.hasConadisCard || ""} onChange={(e) => update("hasConadisCard", e.target.value)}><option value="">Seleccione</option><option value="Si">Si</option><option value="No">No</option></select></Field>
              <Field label="Tipo de sangre"><input className={inputClass} value={profile.bloodType || ""} onChange={(e) => update("bloodType", e.target.value)} /></Field>
              <Field label="Años de experiencia"><input type="number" min="0" className={inputClass} value={profile.experienceYears || 0} onChange={(e) => update("experienceYears", Number(e.target.value))} /></Field>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>Direccion de vivienda</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Provincia"><input className={inputClass} value={profile.province || ""} onChange={(e) => update("province", e.target.value)} /></Field>
              <Field label="Canton"><input className={inputClass} value={profile.canton || ""} onChange={(e) => update("canton", e.target.value)} /></Field>
              <Field label="Parroquia"><input className={inputClass} value={profile.parish || ""} onChange={(e) => update("parish", e.target.value)} /></Field>
              <Field label="Zona"><input className={inputClass} value={profile.zone || ""} onChange={(e) => update("zone", e.target.value)} /></Field>
              <Field label="Calle principal"><input className={inputClass} value={profile.mainStreet || ""} onChange={(e) => update("mainStreet", e.target.value)} /></Field>
              <Field label="Calle secundaria"><input className={inputClass} value={profile.secondaryStreet || ""} onChange={(e) => update("secondaryStreet", e.target.value)} /></Field>
              <Field label="No de casa"><input className={inputClass} value={profile.houseNumber || ""} onChange={(e) => update("houseNumber", e.target.value)} /></Field>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>Tabla de uniforme</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Camiseta"><input className={inputClass} value={profile.shirtSize || ""} onChange={(e) => update("shirtSize", e.target.value)} /></Field>
              <Field label="Pantalon"><input className={inputClass} value={profile.pantsSize || ""} onChange={(e) => update("pantsSize", e.target.value)} /></Field>
              <Field label="Zapatos"><input className={inputClass} value={profile.shoeSize || ""} onChange={(e) => update("shoeSize", e.target.value)} /></Field>
            </div>
          </section>

          <EditableList title="Cargas familiares" onAdd={() => update("familyLoads", [...(profile.familyLoads || []), emptyFamilyLoad()])}>
            {(profile.familyLoads || []).map((item, index) => (
              <FamilyLoadRow key={item.id} item={item} onChange={(next) => updateArray(profile.familyLoads || [], index, next, (items) => update("familyLoads", items))} onRemove={() => removeArray(profile.familyLoads || [], index, (items) => update("familyLoads", items))} />
            ))}
          </EditableList>

          <EditableList title="Escolaridad" onAdd={() => update("education", [...(profile.education || []), emptyEducation()])}>
            {(profile.education || []).map((item, index) => (
              <EducationRow key={item.id} item={item} onChange={(next) => updateArray(profile.education || [], index, next, (items) => update("education", items))} onRemove={() => removeArray(profile.education || [], index, (items) => update("education", items))} />
            ))}
          </EditableList>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>Cursos y conocimientos</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cursos principales"><textarea className={`${inputClass} min-h-24`} value={profile.mainCourses || ""} onChange={(e) => update("mainCourses", e.target.value)} /></Field>
              <Field label="Conocimientos adicionales"><textarea className={`${inputClass} min-h-24`} value={profile.additionalKnowledge || ""} onChange={(e) => update("additionalKnowledge", e.target.value)} /></Field>
            </div>
          </section>

          <EditableList title="Capacitaciones" onAdd={() => update("trainings", [...(profile.trainings || []), emptyTraining()])}>
            {(profile.trainings || []).map((item, index) => (
              <TrainingRow key={item.id} item={item} onChange={(next) => updateArray(profile.trainings || [], index, next, (items) => update("trainings", items))} onRemove={() => removeArray(profile.trainings || [], index, (items) => update("trainings", items))} />
            ))}
          </EditableList>

          <EditableList title="Historia laboral" onAdd={() => update("workHistory", [...(profile.workHistory || []), emptyWorkHistory()])}>
            {(profile.workHistory || []).map((item, index) => (
              <WorkHistoryRow key={item.id} item={item} onChange={(next) => updateArray(profile.workHistory || [], index, next, (items) => update("workHistory", items))} onRemove={() => removeArray(profile.workHistory || [], index, (items) => update("workHistory", items))} />
            ))}
          </EditableList>

          <EditableList title="Referencias personales" onAdd={() => update("personalReferences", [...(profile.personalReferences || []), emptyReference()])}>
            {(profile.personalReferences || []).map((item, index) => (
              <ReferenceRow key={item.id} item={item} onChange={(next) => updateArray(profile.personalReferences || [], index, next, (items) => update("personalReferences", items))} onRemove={() => removeArray(profile.personalReferences || [], index, (items) => update("personalReferences", items))} />
            ))}
          </EditableList>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={Boolean(profile.declarationAccepted)} onChange={(e) => update("declarationAccepted", e.target.checked)} />
            Soy responsable y declaro la veracidad de toda la informacion aqui proporcionada.
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => printTalentProfile(worker, profile)} className="rounded-md border border-slate-300 bg-white px-5 py-3 font-bold text-[#173C61] hover:bg-slate-50">Imprimir ficha</button>
          <button type="button" onClick={() => onSave(profile)} className="rounded-md bg-[#173C61] px-5 py-3 font-bold text-white hover:bg-[#218F93]">Guardar ficha</button>
        </div>
      </section>
    </div>
  );
}

function EppDeliveryModal({ worker, onSave, onClose }: { worker: Worker; onSave: (delivery: EppDeliveryProfile) => void; onClose: () => void }) {
  const [delivery, setDelivery] = useState<EppDeliveryProfile>(normalizeEppDelivery(worker));
  const fullName = `${worker.firstName} ${worker.lastName}`.trim();

  function update<K extends keyof EppDeliveryProfile>(key: K, value: EppDeliveryProfile[K]) {
    setDelivery((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, next: EppDeliveryItem) {
    update("items", (delivery.items || []).map((item, currentIndex) => currentIndex === index ? next : item));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Kit EPP por contrato</h2>
            <p className="text-sm text-slate-600">{fullName} | {worker.documentId}</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de entrega"><input type="date" className={inputClass} value={delivery.deliveryDate || ""} onChange={(e) => update("deliveryDate", e.target.value)} /></Field>
          <Field label="Periodo"><input className={inputClass} value={delivery.period || ""} onChange={(e) => update("period", e.target.value)} /></Field>
          <Field label="Empleador"><input className={inputClass} value={delivery.employer || ""} onChange={(e) => update("employer", e.target.value)} /></Field>
          <Field label="Representante legal"><input className={inputClass} value={delivery.representativeName || ""} onChange={(e) => update("representativeName", e.target.value)} /></Field>
          <Field label="Contrato"><input className={inputClass} value={delivery.contractName || ""} onChange={(e) => update("contractName", e.target.value)} /></Field>
          <Field label="Lugar / area de trabajo"><input className={inputClass} value={delivery.workplace || ""} onChange={(e) => update("workplace", e.target.value)} /></Field>
        </div>

        <section className="mt-5 rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h3 className={sectionTitleClass}>Detalle de uniforme, EPP y herramientas</h3>
            <button
              type="button"
              onClick={() => update("items", [...(delivery.items || []), { id: createId(), name: "", quantity: 1, delivered: true, notes: "" }])}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-50"
            >
              Agregar item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Entregado</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Observacion</th>
                  <th className="px-3 py-2">Quitar</th>
                </tr>
              </thead>
              <tbody>
                {(delivery.items || []).map((item, index) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2"><input type="checkbox" checked={Boolean(item.delivered)} onChange={(e) => updateItem(index, { ...item, delivered: e.target.checked })} /></td>
                    <td className="px-3 py-2"><input className={inputClass} value={item.name} onChange={(e) => updateItem(index, { ...item, name: e.target.value })} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" className={inputClass} value={item.quantity || 0} onChange={(e) => updateItem(index, { ...item, quantity: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2"><input className={inputClass} value={item.notes || ""} onChange={(e) => updateItem(index, { ...item, notes: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => update("items", (delivery.items || []).filter((_, currentIndex) => currentIndex !== index))} className="font-bold text-red-700">Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Field label="Observaciones">
          <textarea className={`${inputClass} mt-4 min-h-24`} value={delivery.observations || ""} onChange={(e) => update("observations", e.target.value)} />
        </Field>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => previewEppDelivery(worker, delivery)} className="rounded-md border border-slate-300 bg-white px-5 py-3 font-bold text-[#173C61] hover:bg-slate-50">Visualizar / imprimir</button>
          <button type="button" onClick={() => downloadEppDelivery(worker, delivery)} className="rounded-md border border-slate-300 bg-white px-5 py-3 font-bold text-[#173C61] hover:bg-slate-50">Generar archivo</button>
          <button type="button" onClick={() => onSave(delivery)} className="rounded-md bg-[#173C61] px-5 py-3 font-bold text-white hover:bg-[#218F93]">Guardar kit EPP</button>
        </div>
      </section>
    </div>
  );
}

function WorkerForm({
  form,
  groups,
  clients,
  contracts,
  positions,
  selectedGroup,
  consulting,
  onChange,
  onSubmit,
  onLookupDocument,
  onUploadPhoto,
  onCancel,
  onDelete,
}: {
  form: Worker;
  groups: SelectOption[];
  clients: SelectOption[];
  contracts: SelectOption[];
  positions: SelectOption[];
  selectedGroup?: WorkGroup;
  consulting: boolean;
  onChange: (worker: Worker) => void;
  onSubmit: (e: FormEvent) => void;
  onLookupDocument: () => void;
  onUploadPhoto: (file: File) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">{form._id ? "Editar trabajador" : "Nuevo trabajador"}</h2>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver al listado</button>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 p-4">
        <h3 className="mb-3 font-bold text-[#173C61]">Fotografia</h3>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-start">
          <WorkerPhoto worker={form} />
          <div className="grid gap-3">
            <input
              type="file"
              accept="image/*"
              className={inputClass}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadPhoto(file);
                e.currentTarget.value = "";
              }}
            />
            <input className={inputClass} placeholder="URL de fotografia" value={form.photoUrl || ""} onChange={(e) => onChange({ ...form, photoUrl: e.target.value })} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Cedula
          <div className="flex gap-2">
            <input
              required
              inputMode="numeric"
              maxLength={10}
              pattern="\d{10}"
              className={inputClass}
              value={form.documentId}
              onChange={(e) => onChange({ ...form, documentId: onlyDigits(e.target.value).slice(0, 10) })}
            />
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

        <SearchableSelect
          label="Cargo"
          value={form.position}
          options={positions}
          placeholder="Buscar cargo..."
          onChange={(option) => onChange({ ...form, position: option?.label || "" })}
        />
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
        <Field label="Banco">
          <input className={inputClass} value={form.bankName || ""} onChange={(e) => onChange({ ...form, bankName: e.target.value })} />
        </Field>
        <Field label="Tipo de cuenta">
          <select className={inputClass} value={form.bankAccountType || ""} onChange={(e) => onChange({ ...form, bankAccountType: e.target.value })}>
            <option value="">Seleccione</option>
            <option value="Ahorros">Ahorros</option>
            <option value="Corriente">Corriente</option>
          </select>
        </Field>
        <Field label="Numero de cuenta">
          <input className={inputClass} value={form.bankAccountNumber || ""} onChange={(e) => onChange({ ...form, bankAccountNumber: e.target.value })} />
        </Field>
        <Field label="Socio">
          <select className={inputClass} value={form.socio || "No"} onChange={(e) => onChange({ ...form, socio: e.target.value as Worker["socio"] })}>
            <option value="No">No</option>
            <option value="Si">Si</option>
          </select>
        </Field>
        <Field label="Estado">
          <select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as Worker["status"] })}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </Field>
        <SearchableSelect
          label="Empresa"
          value={form.workGroupId || ""}
          options={groups}
          placeholder="Buscar empresa..."
          onChange={(option) => onChange({ ...form, workGroupId: option?.value || "", workGroupName: option?.label || "" })}
        />
        <Field label="Supervisor de la empresa">
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
        <Field label="Horario">
          <input className={inputClass} value={form.assignedSchedule || ""} onChange={(e) => onChange({ ...form, assignedSchedule: e.target.value })} />
        </Field>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Documentos / validacion
        <textarea className={`${inputClass} min-h-28`} value={form.documents || ""} onChange={(e) => onChange({ ...form, documents: e.target.value })} />
      </label>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">{form._id ? "Actualizar trabajador" : "Guardar trabajador"}</button>
        {form._id && (
          <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}

function EditableList({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd: () => void }) {
  return (
    <section className={sectionClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className={sectionTitleClass}>{title}</h3>
        <button type="button" onClick={onAdd} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-50">Agregar</button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FamilyLoadRow({ item, onChange, onRemove }: { item: TalentFamilyLoad; onChange: (item: TalentFamilyLoad) => void; onRemove: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[0.8fr_1.4fr_0.9fr_0.9fr_0.6fr_0.8fr_auto]">
      <input className={inputClass} placeholder="Tipo" value={item.type} onChange={(e) => onChange({ ...item, type: e.target.value })} />
      <input className={inputClass} placeholder="Apellidos y nombres" value={item.fullName} onChange={(e) => onChange({ ...item, fullName: e.target.value })} />
      <input className={inputClass} placeholder="Cedula" value={item.documentId || ""} onChange={(e) => onChange({ ...item, documentId: e.target.value })} />
      <input type="date" className={inputClass} value={item.birthDate || ""} onChange={(e) => onChange({ ...item, birthDate: e.target.value, age: calculateAge(e.target.value) })} />
      <input type="number" className={inputClass} placeholder="Edad" value={item.age || 0} onChange={(e) => onChange({ ...item, age: Number(e.target.value) })} />
      <input className={inputClass} placeholder="Carnet Conadis" value={item.conadisCard || ""} onChange={(e) => onChange({ ...item, conadisCard: e.target.value })} />
      <button type="button" onClick={onRemove} className="font-bold text-red-700">Quitar</button>
    </div>
  );
}

function EducationRow({ item, onChange, onRemove }: { item: TalentEducation; onChange: (item: TalentEducation) => void; onRemove: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_0.8fr_1.3fr_1.3fr_auto]">
      <input className={inputClass} placeholder="Nivel" value={item.level} onChange={(e) => onChange({ ...item, level: e.target.value })} />
      <select className={inputClass} value={item.completed || ""} onChange={(e) => onChange({ ...item, completed: e.target.value })}>
        <option value="">Completa?</option>
        <option value="Si">Si</option>
        <option value="No">No</option>
      </select>
      <input className={inputClass} placeholder="Institucion" value={item.institution || ""} onChange={(e) => onChange({ ...item, institution: e.target.value })} />
      <input className={inputClass} placeholder="Titulo" value={item.title || ""} onChange={(e) => onChange({ ...item, title: e.target.value })} />
      <button type="button" onClick={onRemove} className="font-bold text-red-700">Quitar</button>
    </div>
  );
}

function WorkHistoryRow({ item, onChange, onRemove }: { item: TalentWorkHistory; onChange: (item: TalentWorkHistory) => void; onRemove: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-4">
      <input className={inputClass} placeholder="Cargo" value={item.position || ""} onChange={(e) => onChange({ ...item, position: e.target.value })} />
      <input className={inputClass} placeholder="Empresa / empleador" value={item.employer || ""} onChange={(e) => onChange({ ...item, employer: e.target.value })} />
      <input className={inputClass} placeholder="Tiempo de trabajo" value={item.workTime || ""} onChange={(e) => onChange({ ...item, workTime: e.target.value })} />
      <input className={inputClass} placeholder="Telefono" value={item.phone || ""} onChange={(e) => onChange({ ...item, phone: e.target.value })} />
      <Field label="Del"><input type="date" className={inputClass} value={item.startDate || ""} onChange={(e) => onChange({ ...item, startDate: e.target.value })} /></Field>
      <Field label="Al"><input type="date" className={inputClass} value={item.endDate || ""} onChange={(e) => onChange({ ...item, endDate: e.target.value })} /></Field>
      <input className={inputClass} placeholder="Causal de salida" value={item.exitReason || ""} onChange={(e) => onChange({ ...item, exitReason: e.target.value })} />
      <button type="button" onClick={onRemove} className="font-bold text-red-700">Quitar</button>
    </div>
  );
}

function TrainingRow({ item, onChange, onRemove }: { item: TalentTraining; onChange: (item: TalentTraining) => void; onRemove: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1.2fr_1fr_0.7fr_auto]">
      <input className={inputClass} placeholder="Capacitacion" value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      <input className={inputClass} placeholder="Descripcion" value={item.description || ""} onChange={(e) => onChange({ ...item, description: e.target.value })} />
      <input className={inputClass} placeholder="Lugar o empresa" value={item.placeOrCompany || ""} onChange={(e) => onChange({ ...item, placeOrCompany: e.target.value })} />
      <input type="date" className={inputClass} value={item.date || ""} onChange={(e) => onChange({ ...item, date: e.target.value })} />
      <button type="button" onClick={onRemove} className="font-bold text-red-700">Quitar</button>
    </div>
  );
}

function ReferenceRow({ item, onChange, onRemove }: { item: TalentPersonalReference; onChange: (item: TalentPersonalReference) => void; onRemove: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto]">
      <input className={inputClass} placeholder="Nombre" value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      <input className={inputClass} placeholder="Parentesco" value={item.relationship || ""} onChange={(e) => onChange({ ...item, relationship: e.target.value })} />
      <input className={inputClass} placeholder="Telefono" value={item.phone || ""} onChange={(e) => onChange({ ...item, phone: e.target.value })} />
      <input className={inputClass} placeholder="Residencia" value={item.residence || ""} onChange={(e) => onChange({ ...item, residence: e.target.value })} />
      <button type="button" onClick={onRemove} className="font-bold text-red-700">Quitar</button>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
const sectionClass = "rounded-lg border border-slate-200 p-4";
const sectionTitleClass = "font-bold text-[#173C61]";

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

function WorkerPhoto({ worker }: { worker: Pick<Worker, "photoUrl" | "firstName" | "lastName"> }) {
  return worker.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={worker.photoUrl} alt={`Foto de ${worker.firstName} ${worker.lastName}`} className="h-32 w-28 rounded-md border border-slate-200 object-cover" />
  ) : (
    <div className="grid h-32 w-28 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-500">
      Sin fotografia
    </div>
  );
}

function normalizeTalentProfile(worker: Worker): TalentHumanProfile {
  const profile = worker.talentProfile || {};
  return {
    currentDate: profile.currentDate || new Date().toISOString().slice(0, 10),
    civilStatus: "",
    homePhone: "",
    hasConadisCard: "",
    bloodType: "",
    province: "",
    canton: "",
    parish: "",
    zone: "",
    mainStreet: "",
    secondaryStreet: "",
    houseNumber: "",
    shirtSize: "",
    pantsSize: "",
    shoeSize: "",
    familyLoads: [],
    education: defaultEducation(),
    trainings: [],
    workHistory: [],
    personalReferences: [],
    declarationAccepted: false,
    ...profile,
  };
}

function isTalentProfileComplete(profile?: TalentHumanProfile) {
  if (!profile) return false;
  return Boolean(
    profile.birthDate &&
    profile.civilStatus &&
    profile.bloodType &&
    profile.province &&
    profile.canton &&
    profile.mainStreet &&
    profile.shirtSize &&
    profile.pantsSize &&
    profile.shoeSize &&
    profile.declarationAccepted
  );
}

function isEppDeliveryComplete(delivery?: EppDeliveryProfile) {
  return Boolean(delivery?.completed || delivery?.items?.some((item) => item.delivered));
}

function normalizeEppDelivery(worker: Worker): EppDeliveryProfile {
  const currentYear = new Date().getFullYear();
  const delivery = worker.eppDelivery || {};
  return {
    deliveryDate: new Date().toISOString().slice(0, 10),
    period: `${currentYear} - ${currentYear + 1}`,
    employer: "ASOCIACION DE SERVICIO DE LIMPIEZA GUAYTAMBOS CLEAN (LIMPIO) ASOSERGUAYTAMBO",
    contractId: worker.assignedContractId || "",
    contractName: worker.assignedContract || "",
    workplace: worker.assignedArea || "",
    representativeName: "BRYAN MONTES DE OCA",
    observations: "",
    completed: false,
    ...delivery,
    items: delivery.items?.length ? delivery.items : defaultEppItems(),
  };
}

function defaultEppItems(): EppDeliveryItem[] {
  return ["Pantalon", "Camisa", "Blusa", "Zapatos", "Credencial", "Mascarillas", "Gorro", "Guantes", "Batas", "Visores", "Otros"].map((name) => ({
    id: createId(),
    name,
    quantity: 1,
    delivered: false,
    notes: "",
  }));
}

function normalizeWorkerCompany(worker: Worker, workGroups: WorkGroup[]) {
  const group = findWorkGroupForWorker(worker, workGroups);
  if (!group) return worker;
  return {
    ...worker,
    workGroupId: worker.workGroupId || group._id || "",
    workGroupName: worker.workGroupName || group.commercialName || group.name || "",
  };
}

function findWorkGroupForWorker(worker: Pick<Worker, "workGroupId" | "workGroupName">, workGroups: WorkGroup[]) {
  const byId = worker.workGroupId ? workGroups.find((group) => (group._id || group.name) === worker.workGroupId) : undefined;
  if (byId) return byId;
  const workerGroupKey = normalizeMatchKey(worker.workGroupName || "");
  if (!workerGroupKey) return undefined;
  return workGroups.find((group) => normalizeMatchKey(group.commercialName || "") === workerGroupKey || normalizeMatchKey(group.name || "") === workerGroupKey);
}

function workerMatchesWorkGroup(worker: Worker, filterValue: string, workGroups: WorkGroup[]) {
  if (!filterValue) return true;
  if (worker.workGroupId === filterValue || worker.workGroupName === filterValue) return true;
  const selectedGroup = workGroups.find((group) => (group._id || group.name) === filterValue);
  if (!selectedGroup) return false;
  const workerGroupKey = normalizeMatchKey(worker.workGroupName || "");
  return workerGroupKey === normalizeMatchKey(selectedGroup.name || "") || workerGroupKey === normalizeMatchKey(selectedGroup.commercialName || "");
}

function normalizeMatchKey(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function getExportFilterSummary(filters: ExportFilters, groups: SelectOption[], contracts: SelectOption[]) {
  return [
    filters.workGroupId ? `Empresa: ${groups.find((group) => group.value === filters.workGroupId)?.label || filters.workGroupId}` : "Empresa: Todas",
    filters.status ? `Estado: ${filters.status === "active" ? "Activo" : "Inactivo"}` : "Estado: Todos",
    filters.socio ? `Socio: ${filters.socio}` : "Socio: Todos",
    filters.assignedContractId ? `Contrato: ${contracts.find((contract) => contract.value === filters.assignedContractId)?.label || filters.assignedContractId}` : "Contrato: Todos",
  ].join(" | ");
}

function getWorkersForExport(workers: Worker[], filters: ExportFilters, workGroups: WorkGroup[], contracts: SelectOption[]) {
  const selectedContract = contracts.find((contract) => contract.value === filters.assignedContractId);
  return workers.filter((worker) => {
    if (filters.workGroupId && !workerMatchesWorkGroup(worker, filters.workGroupId, workGroups)) return false;
    if (filters.status && worker.status !== filters.status) return false;
    if (filters.socio && (worker.socio || "No") !== filters.socio) return false;
    if (
      filters.assignedContractId
      && worker.assignedContractId !== filters.assignedContractId
      && normalizeMatchKey(worker.assignedContract || "") !== normalizeMatchKey(selectedContract?.label || filters.assignedContractId)
    ) return false;
    return true;
  });
}

function downloadWorkersCsv(workers: Worker[], filename: string) {
  const rows = [
    ["Cedula", "Nombres", "Apellidos", "Cargo", "Empresa", "Contacto", "Correo", "Socio", "Estado", "Cliente", "Contrato", "Area", "Horario"],
    ...workers.map((worker) => [
      worker.documentId,
      worker.firstName,
      worker.lastName,
      worker.position,
      worker.workGroupName || "",
      worker.phone,
      worker.email || "",
      worker.socio || "No",
      worker.status === "active" ? "Activo" : "Inactivo",
      worker.assignedClient || "",
      worker.assignedContract || "",
      worker.assignedArea || "",
      worker.assignedSchedule || "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function buildWorkersReportHtml(workers: Worker[], title: string, subtitle: string) {
  const rows = workers.length
    ? workers.map((worker, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(worker.documentId)}</td>
          <td>${escapeHtml(`${worker.firstName} ${worker.lastName}`.trim())}</td>
          <td>${escapeHtml(worker.position || "")}</td>
          <td>${escapeHtml(worker.workGroupName || "")}</td>
          <td>${escapeHtml(worker.phone || "")}</td>
          <td>${escapeHtml(worker.email || "")}</td>
          <td>${escapeHtml(worker.socio || "No")}</td>
          <td>${worker.status === "active" ? "Activo" : "Inactivo"}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="9">Sin trabajadores para los filtros aplicados.</td></tr>`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; }
          h1 { margin: 0; color: #173C61; font-size: 20px; }
          .subtitle { margin: 8px 0 16px; color: #475569; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; word-wrap: break-word; }
          th { background: #f1f5f9; color: #173C61; font-size: 11px; }
          .meta { margin-bottom: 12px; font-weight: 700; color: #334155; }
          @media print { body { margin: 14mm; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        <p class="meta">Total trabajadores: ${workers.length}</p>
        <table>
          <thead>
            <tr><th>No.</th><th>Cedula</th><th>Trabajador</th><th>Cargo</th><th>Empresa</th><th>Contacto</th><th>Correo</th><th>Socio</th><th>Estado</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.print();</script>
      </body>
    </html>
  `;
}

function isValidDocumentId(value: string) {
  return /^\d{10}$/.test(value.trim());
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function updateArray<T>(items: T[], index: number, next: T, setter: (items: T[]) => void) {
  setter(items.map((item, currentIndex) => currentIndex === index ? next : item));
}

function removeArray<T>(items: T[], index: number, setter: (items: T[]) => void) {
  setter(items.filter((_, currentIndex) => currentIndex !== index));
}

function emptyFamilyLoad(): TalentFamilyLoad {
  return { id: createId(), type: "", fullName: "", documentId: "", birthDate: "", age: 0, conadisCard: "" };
}

function emptyEducation(): TalentEducation {
  return { id: createId(), level: "", completed: "", institution: "", title: "" };
}

function emptyWorkHistory(): TalentWorkHistory {
  return { id: createId(), position: "", employer: "", workTime: "", startDate: "", endDate: "", phone: "", exitReason: "" };
}

function emptyTraining(): TalentTraining {
  return { id: createId(), name: "", description: "", placeOrCompany: "", date: "" };
}

function emptyReference(): TalentPersonalReference {
  return { id: createId(), name: "", relationship: "", phone: "", residence: "" };
}

function defaultEducation() {
  return ["PRIMARIA", "CICLO BASICO", "SECUNDARIA", "TECNICO", "SUPERIOR", "DIPLOMADO / CERTIFICACION", "MAESTRIA"].map((level) => ({
    id: createId(),
    level,
    completed: "",
    institution: "",
    title: "",
  }));
}

function calculateAge(date: string) {
  if (!date) return 0;
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Math.max(age, 0);
}

function printWorkerResume(worker: Worker) {
  const profile = normalizeTalentProfile(worker);
  const html = buildResumeHtml(worker, profile, "Hoja de vida");
  openPrintWindow(html);
}

function printTalentProfile(worker: Worker, profile: TalentHumanProfile) {
  const html = buildResumeHtml(worker, profile, "Ficha talento humano");
  openPrintWindow(html);
}

function previewEppDelivery(worker: Worker, delivery: EppDeliveryProfile) {
  openPrintWindow(buildEppDeliveryHtml(worker, delivery));
}

function downloadEppDelivery(worker: Worker, delivery: EppDeliveryProfile) {
  const html = buildEppDeliveryHtml(worker, delivery, false);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kit-epp-${slugify(`${worker.lastName}-${worker.firstName}-${worker.documentId}`)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildResumeHtml(worker: Worker, profile: TalentHumanProfile, title: string) {
  const fullName = `${worker.firstName} ${worker.lastName}`.trim();
  const photo = worker.photoUrl ? `<img class="photo" src="${escapeHtml(worker.photoUrl)}" alt="Fotografia" />` : `<div class="photo empty">FOTOGRAFIA</div>`;
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)} - ${escapeHtml(fullName)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 14px; font-size: 10px; }
          h1 { margin: 0; font-size: 14px; text-align: center; text-transform: uppercase; }
          h2 { margin: 0; background: #f3f4f6; border: 1px solid #000; border-top: 0; padding: 3px; text-align: center; font-size: 10px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; word-wrap: break-word; }
          th { background: #f3f4f6; font-size: 9px; font-weight: 700; }
          .header { display: grid; grid-template-columns: 110px 1fr; border: 1px solid #000; border-bottom: 0; }
          .brand { border-right: 1px solid #000; min-height: 74px; display: grid; place-items: center; text-align: center; font-size: 9px; padding: 4px; }
          .headgrid { display: grid; grid-template-rows: repeat(4, 1fr); }
          .headrow { border-bottom: 1px solid #000; display: grid; place-items: center; min-height: 18px; }
          .headrow:last-child { border-bottom: 0; grid-template-columns: 1fr 1fr 90px; }
          .photo { width: 92px; height: 112px; object-fit: cover; border: 1px solid #000; }
          .empty { display: grid; place-items: center; color: #555; }
          .personal { display: grid; grid-template-columns: 100px 1fr; border-left: 1px solid #000; border-right: 1px solid #000; }
          .photoWrap { border-right: 1px solid #000; display: grid; place-items: center; padding: 4px; }
          .section { margin: 0; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; }
          .signature { min-height: 76px; padding-top: 48px; text-align: center; }
          .signature + .signature { border-left: 1px solid #000; }
          .line { border-top: 1px solid #000; width: 80%; margin: 0 auto 6px; }
          .declaration { border: 1px solid #000; border-top: 0; padding: 5px; text-align: center; font-size: 9px; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <section class="header">
          <div class="brand">ASOSERLID<br />Gestion de Talento Humano</div>
          <div class="headgrid">
            <div class="headrow"><strong>GESTION DE TALENTO HUMANO</strong></div>
            <div class="headrow"><h1>${escapeHtml(title)}</h1></div>
            <div class="headrow">FECHA DE REVISION DEL FORMATO</div>
            <div class="headrow"><span>VERSION: 01</span><span>PAG.1</span><span>${escapeHtml(profile.currentDate || "")}</span></div>
          </div>
        </section>

        <table><tbody><tr><td>Fecha Actual<br /><strong>${escapeHtml(profile.currentDate || "")}</strong></td><td>CARGO<br /><strong>${escapeHtml(worker.position)}</strong></td></tr></tbody></table>
        <h2>Datos personales</h2>
        <section class="personal">
          <div class="photoWrap">${photo}</div>
          <table>
            <tbody>
              <tr><td>Apellidos<br /><strong>${escapeHtml(worker.lastName)}</strong></td><td>Nombres<br /><strong>${escapeHtml(worker.firstName)}</strong></td><td>Cedula<br /><strong>${escapeHtml(worker.documentId)}</strong></td></tr>
              <tr><td>Fecha de nacimiento<br />${escapeHtml(profile.birthDate || "")}</td><td>Edad<br />${escapeHtml(String(profile.age || ""))}</td><td>Estado civil<br />${escapeHtml(profile.civilStatus || "")}</td></tr>
              <tr><td>Telefono casa<br />${escapeHtml(profile.homePhone || "")}</td><td>Telefono celular<br />${escapeHtml(worker.phone)}</td><td>Correo electronico<br />${escapeHtml(worker.email || "")}</td></tr>
              <tr><td>Posee Carnet de Conadis<br />${escapeHtml(profile.hasConadisCard || "")}</td><td>Tipo de sangre<br />${escapeHtml(profile.bloodType || "")}</td><td>Años de experiencia<br />${escapeHtml(String(profile.experienceYears || ""))}</td></tr>
            </tbody>
          </table>
        </section>

        <h2>Direccion de vivienda</h2>
        <table><tbody>
          <tr><td>Provincia<br />${escapeHtml(profile.province || "")}</td><td>Canton<br />${escapeHtml(profile.canton || "")}</td><td>Parroquia<br />${escapeHtml(profile.parish || "")}</td><td>Zona<br />${escapeHtml(profile.zone || "")}</td></tr>
          <tr><td colspan="2">Calle principal<br />${escapeHtml(profile.mainStreet || "")}</td><td>Calle secundaria<br />${escapeHtml(profile.secondaryStreet || "")}</td><td>No de casa<br />${escapeHtml(profile.houseNumber || "")}</td></tr>
        </tbody></table>

        <h2>Datos bancarios</h2>
        <table><tbody><tr><td>Banco<br />${escapeHtml(worker.bankName || "")}</td><td>Tipo de cuenta<br />${escapeHtml(worker.bankAccountType || "")}</td><td>Numero de cuenta<br />${escapeHtml(worker.bankAccountNumber || "")}</td></tr></tbody></table>

        <h2>Tabla de uniforme</h2>
        <table><tbody><tr><td>Camiseta<br />${escapeHtml(profile.shirtSize || "")}</td><td>Pantalon<br />${escapeHtml(profile.pantsSize || "")}</td><td>Zapatos<br />${escapeHtml(profile.shoeSize || "")}</td></tr></tbody></table>

        ${table("Cargas familiares", ["Tipo", "Apellidos y nombres", "Cedula", "Fecha nacimiento", "Edad", "Conadis"], (profile.familyLoads || []).map((item) => [item.type, item.fullName, item.documentId || "", item.birthDate || "", String(item.age || ""), item.conadisCard || ""]))}
        ${table("Escolaridad", ["Nivel", "Completa", "Institucion", "Titulo"], (profile.education || []).map((item) => [item.level, item.completed || "", item.institution || "", item.title || ""]))}
        ${boxBlock("Cursos principales", profile.mainCourses || "")}
        ${boxBlock("Conocimientos adicionales", profile.additionalKnowledge || "")}
        ${table("Capacitaciones", ["Capacitacion", "Descripcion", "Lugar o empresa", "Fecha"], (profile.trainings || []).map((item) => [item.name, item.description || "", item.placeOrCompany || "", item.date || ""]))}
        ${table("Historia laboral", ["Cargo", "Empresa", "Tiempo", "Del", "Al", "Telefono", "Causal salida"], (profile.workHistory || []).map((item) => [item.position || "", item.employer || "", item.workTime || "", item.startDate || "", item.endDate || "", item.phone || "", item.exitReason || ""]))}
        ${table("Referencias personales", ["Nombre", "Parentesco", "Telefono", "Residencia"], (profile.personalReferences || []).map((item) => [item.name, item.relationship || "", item.phone || "", item.residence || ""]))}

        <div class="declaration">Soy responsable y declaro la veracidad de toda la informacion aqui proporcionada, asi como soy consciente de mi obligacion de notificar inmediatamente a la empresa en caso de modificarse los datos aqui registrados.</div>
        <section class="signatures">
          <div class="signature"><div class="line"></div>Firma del trabajador</div>
          <div class="signature"><div class="line"></div>Firma del representante legal</div>
        </section>
        <script>window.print();</script>
      </body>
    </html>
  `;
}

function buildEppDeliveryHtml(worker: Worker, delivery: EppDeliveryProfile, autoPrint = true) {
  const fullName = `${worker.firstName} ${worker.lastName}`.trim();
  const deliveredItems = (delivery.items || []).filter((item) => item.name.trim());
  const rows = deliveredItems.length
    ? deliveredItems.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(String(item.quantity || ""))}</td>
          <td>${item.delivered ? "SI" : "NO"}</td>
          <td>${escapeHtml(item.notes || "")}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="5">Sin items registrados.</td></tr>`;
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Kit EPP - ${escapeHtml(fullName)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 24px; font-size: 12px; }
          h1 { margin: 0 0 14px; text-align: center; font-size: 16px; text-transform: uppercase; }
          .subtitle { margin: 0 0 18px; text-align: center; font-weight: 700; text-transform: uppercase; }
          .box { border: 1px solid #000; padding: 10px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 12px 0; }
          th, td { border: 1px solid #000; padding: 6px; vertical-align: middle; word-wrap: break-word; }
          th { background: #f3f4f6; text-align: center; font-size: 11px; }
          .text { line-height: 1.6; text-align: justify; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 70px; text-align: center; }
          .line { border-top: 1px solid #000; padding-top: 6px; }
          .muted { color: #333; font-size: 11px; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <h1>Acta entrega - recepcion uniforme, equipo de proteccion personal EPP y herramientas de trabajo</h1>
        <p class="subtitle">Kit EPP por trabajador y contrato</p>

        <section class="box grid">
          <div><strong>Empleador:</strong><br />${escapeHtml(delivery.employer || "")}</div>
          <div><strong>Fecha:</strong><br />${escapeHtml(delivery.deliveryDate || "")}</div>
          <div><strong>Trabajador/a:</strong><br />${escapeHtml(fullName)}</div>
          <div><strong>Cedula:</strong><br />${escapeHtml(worker.documentId)}</div>
          <div><strong>Cargo:</strong><br />${escapeHtml(worker.position)}</div>
          <div><strong>Periodo:</strong><br />${escapeHtml(delivery.period || "")}</div>
          <div><strong>Contrato:</strong><br />${escapeHtml(delivery.contractName || worker.assignedContract || "")}</div>
          <div><strong>Lugar / area:</strong><br />${escapeHtml(delivery.workplace || worker.assignedArea || "")}</div>
        </section>

        <table>
          <thead>
            <tr><th style="width:44px">No.</th><th>Detalle</th><th style="width:90px">Cantidad</th><th style="width:90px">Entregado</th><th>Observacion</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <section class="box text">
          Yo, <strong>${escapeHtml(fullName)}</strong>, recibo las prendas senaladas en el presente documento correspondiente a mi uniforme,
          equipo de proteccion personal EPP y herramientas de trabajo correspondiente al periodo <strong>${escapeHtml(delivery.period || "")}</strong>.
          ${delivery.observations ? `<br /><br /><strong>Observaciones:</strong> ${escapeHtml(delivery.observations)}` : ""}
        </section>

        <section class="signatures">
          <div class="line">
            <strong>RECIBE CONFORME</strong><br />
            ${escapeHtml(fullName)}<br />
            <span class="muted">C.I. ${escapeHtml(worker.documentId)}<br />TRABAJADOR/A</span>
          </div>
          <div class="line">
            <strong>ENTREGA CONFORME</strong><br />
            ${escapeHtml(delivery.representativeName || "")}<br />
            <span class="muted">REPRESENTANTE LEGAL</span>
          </div>
        </section>
        ${autoPrint ? "<script>window.print();</script>" : ""}
      </body>
    </html>
  `;
}

function boxBlock(label: string, value: string) {
  return `<h2>${escapeHtml(label)}</h2><table><tbody><tr><td>${escapeHtml(value || "-")}</td></tr></tbody></table>`;
}

function table(title: string, headers: string[], rows: string[][]) {
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value || "-")}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">Sin registros.</td></tr>`;
  return `<h2>${escapeHtml(title)}</h2><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

function openPrintWindow(html: string) {
  const popup = window.open("", "_blank", "width=960,height=720");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
