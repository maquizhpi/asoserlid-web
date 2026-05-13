"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type {
  AssignedContractStaff,
  Client,
  ContractArea,
  ContractShift,
  ContractWorkplace,
  ServiceContract,
  ServiceType,
  Worker,
  WorkGroup,
} from "@/types/admin";

const days = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miercoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sabado" },
  { value: "sunday", label: "Domingo" },
];

const emptyContract: ServiceContract = {
  clientId: "",
  clientName: "",
  serviceType: "",
  area: "",
  shift: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  workGroupId: "",
  workGroupName: "",
  assignedStaffIds: [],
  assignedStaff: "",
  status: "active",
  workplaces: [],
};

type ModalState =
  | { type: "workplace"; workplace?: ContractWorkplace }
  | { type: "area"; workplaceId: string; area?: ContractArea }
  | { type: "shift"; workplaceId: string; areaId: string; shift?: ContractShift }
  | { type: "staff"; workplaceId: string; areaId: string; shiftId: string }
  | null;

export default function ContractsShiftsPage() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<SelectOption[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceContract>(emptyContract);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedContract = useMemo(() => contracts.find((contract) => contract._id === selectedId), [contracts, selectedId]);
  const filteredContracts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contracts;
    return contracts.filter((contract) =>
      [contract.clientName, contract.serviceType, getPrimaryWorkplace(contract), getPrimaryShift(contract)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [contracts, query]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm(selectedContract ? normalizeContract(selectedContract) : emptyContract);
  }, [selectedContract]);

  useEffect(() => {
    if (!selectedContract && contracts[0]?._id) setSelectedId(contracts[0]._id);
  }, [contracts, selectedContract]);

  async function loadData() {
    const [contractsRes, clientsRes, serviceTypesRes, groupsRes, workersRes, supervisorsRes] = await Promise.all([
      fetch("/api/admin/contracts", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/service-types", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/supervisors", { cache: "no-store" }),
    ]);
    const contractsData = await contractsRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const serviceTypesData = await serviceTypesRes.json().catch(() => ({}));
    const groupsData = await groupsRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));
    const supervisorsData = await supervisorsRes.json().catch(() => ({}));

    if (contractsRes.ok) setContracts((contractsData.items || []).map(normalizeContract));
    if (clientsRes.ok) setClients(((clientsData.items || []) as Client[]).map((client) => ({ value: client._id || "", label: client.name })));
    if (serviceTypesRes.ok) {
      setServiceTypes(
        ((serviceTypesData.items || []) as ServiceType[])
          .filter((item) => item.status === "active")
          .map((item) => ({ value: item.name, label: item.name }))
      );
    }
    if (groupsRes.ok) setGroups(((groupsData.items || []) as WorkGroup[]).map((group) => ({ value: group._id || "", label: group.name })));
    if (workersRes.ok) setWorkers(workersData.items || []);
    if (supervisorsRes.ok) setSupervisors((supervisorsData.items || []).map((item: { id: string; name: string }) => ({ value: item.id, label: item.name })));
    if (!contractsRes.ok || !clientsRes.ok || !serviceTypesRes.ok || !groupsRes.ok || !workersRes.ok || !supervisorsRes.ok) {
      setStatus(contractsData.error || clientsData.error || serviceTypesData.error || groupsData.error || workersData.error || supervisorsData.error || "No se pudo cargar contratos.");
    }
  }

  function startNewContract() {
    setSelectedId(null);
    setForm({ ...emptyContract, startDate: new Date().toISOString().slice(0, 10) });
  }

  async function saveContract(e?: FormEvent, nextForm = form) {
    e?.preventDefault();
    setStatus("Guardando contrato...");

    const payload = buildContractPayload(nextForm);
    const isNew = !payload._id;
    const res = await fetch(isNew ? "/api/admin/contracts" : `/api/admin/contracts/${payload._id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el contrato.");
      return false;
    }

    setStatus("Contrato guardado correctamente.");
    await loadData();
    setSelectedId(data.item?._id || payload._id || null);
    return true;
  }

  async function deleteContract() {
    if (!form._id) return;
    if (hasContractStructure(form)) {
      setStatus("No se puede eliminar un contrato con lugares, areas, turnos o personal asignado. Elimina primero su estructura.");
      return;
    }
    if (!window.confirm("Eliminar este contrato?")) return;

    const res = await fetch(`/api/admin/contracts/${form._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el contrato.");
      return;
    }

    setStatus("Contrato eliminado.");
    setSelectedId(null);
    await loadData();
  }

  async function saveNested(nextForm: ServiceContract, successMessage: string) {
    setForm(nextForm);
    if (!nextForm.clientName || !nextForm.serviceType || !nextForm.startDate) {
      setStatus("Primero completa y guarda la informacion general del contrato.");
      return;
    }
    const ok = await saveContract(undefined, nextForm);
    if (ok) {
      setStatus(successMessage);
      setModal(null);
    }
  }

  function upsertWorkplace(workplace: ContractWorkplace) {
    const workplaces = form.workplaces || [];
    const nextWorkplace = { ...workplace, id: workplace.id || createId(), areas: workplace.areas || [] };
    const nextForm = {
      ...form,
      workplaces: workplaces.some((item) => item.id === nextWorkplace.id)
        ? workplaces.map((item) => (item.id === nextWorkplace.id ? nextWorkplace : item))
        : [...workplaces, nextWorkplace],
    };
    saveNested(nextForm, "Lugar de trabajo guardado.");
  }

  function deleteWorkplace(workplaceId: string) {
    const workplace = form.workplaces?.find((item) => item.id === workplaceId);
    if (workplace && workplace.areas.length > 0 && !window.confirm("Este lugar tiene areas, turnos o personal. Quieres eliminar toda su estructura?")) return;
    saveNested({ ...form, workplaces: (form.workplaces || []).filter((item) => item.id !== workplaceId) }, "Lugar de trabajo eliminado.");
  }

  function upsertArea(workplaceId: string, area: ContractArea) {
    const nextArea = { ...area, id: area.id || createId(), workplaceId, shifts: area.shifts || [] };
    const nextForm = mapWorkplaces(form, workplaceId, (workplace) => ({
      ...workplace,
      areas: workplace.areas.some((item) => item.id === nextArea.id)
        ? workplace.areas.map((item) => (item.id === nextArea.id ? nextArea : item))
        : [...workplace.areas, nextArea],
    }));
    saveNested(nextForm, "Area guardada.");
  }

  function deleteArea(workplaceId: string, areaId: string) {
    const area = form.workplaces?.find((workplace) => workplace.id === workplaceId)?.areas.find((item) => item.id === areaId);
    if (area?.shifts.some((shift) => shift.status === "active")) {
      setStatus("No se puede eliminar un area con horarios activos.");
      return;
    }
    const nextForm = mapWorkplaces(form, workplaceId, (workplace) => ({ ...workplace, areas: workplace.areas.filter((item) => item.id !== areaId) }));
    saveNested(nextForm, "Area eliminada.");
  }

  function upsertShift(workplaceId: string, areaId: string, shift: ContractShift) {
    const nextShift = { ...shift, id: shift.id || createId(), areaId, assignedStaff: shift.assignedStaff || [] };
    const nextForm = mapAreas(form, workplaceId, areaId, (area) => ({
      ...area,
      shifts: area.shifts.some((item) => item.id === nextShift.id)
        ? area.shifts.map((item) => (item.id === nextShift.id ? nextShift : item))
        : [...area.shifts, nextShift],
    }));
    saveNested(nextForm, "Horario guardado.");
  }

  function deleteShift(workplaceId: string, areaId: string, shiftId: string) {
    const shift = findShift(form, workplaceId, areaId, shiftId);
    if (shift?.assignedStaff.some((staff) => staff.assignmentStatus === "active")) {
      setStatus("No se puede eliminar un horario con personal asignado activo.");
      return;
    }
    const nextForm = mapAreas(form, workplaceId, areaId, (area) => ({ ...area, shifts: area.shifts.filter((item) => item.id !== shiftId) }));
    saveNested(nextForm, "Horario eliminado.");
  }

  function assignWorker(workplaceId: string, areaId: string, shiftId: string, worker: Worker) {
    const shift = findShift(form, workplaceId, areaId, shiftId);
    if (!shift || !worker._id) return;
    if (shift.assignedStaff.some((staff) => staff.workerId === worker._id && staff.assignmentStatus === "active")) {
      setStatus("No se puede asignar la misma persona dos veces al mismo horario.");
      return;
    }
    const conflict = findWorkerScheduleConflict(form, contracts, worker._id, shift);
    if (conflict) {
      setStatus(`Este trabajador ya tiene un turno cruzado: ${conflict.shiftName} en ${conflict.contractName}.`);
      return;
    }

    const staff: AssignedContractStaff = {
      id: createId(),
      shiftId,
      workerId: worker._id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      documentId: worker.documentId,
      position: worker.position,
      phone: worker.phone,
      assignmentStatus: "active",
      assignmentDate: new Date().toISOString().slice(0, 10),
    };
    const nextForm = mapShifts(form, workplaceId, areaId, shiftId, (item) => ({ ...item, assignedStaff: [...item.assignedStaff, staff] }));
    saveNested(nextForm, "Personal asignado.");
  }

  function removeStaff(workplaceId: string, areaId: string, shiftId: string, staffId: string) {
    const nextForm = mapShifts(form, workplaceId, areaId, shiftId, (shift) => ({ ...shift, assignedStaff: shift.assignedStaff.filter((staff) => staff.id !== staffId) }));
    saveNested(nextForm, "Personal quitado del turno.");
  }

  return (
    <SystemModulePage moduleKey="contracts-shifts">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Buscar contrato..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <button onClick={startNewContract} className="shrink-0 rounded-md bg-[#173C61] px-4 py-2 font-semibold text-white hover:bg-[#218F93]">Nuevo</button>
          </div>

          <div className="mt-4 space-y-2">
            {filteredContracts.map((contract) => (
              <button
                key={contract._id}
                onClick={() => setSelectedId(contract._id || null)}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${selectedId === contract._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className="block font-semibold text-[#173C61]">{contract.clientName}</span>
                <span className="mt-1 block text-xs text-slate-500">{contract.serviceType} - {getPrimaryWorkplace(contract)} - {getPrimaryShift(contract)}</span>
              </button>
            ))}
            {filteredContracts.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">No hay contratos para mostrar.</p>}
          </div>
        </aside>

        <div className="space-y-6">
          <ContractGeneralForm
            form={form}
            clients={clients}
            serviceTypes={serviceTypes}
            groups={groups}
            onChange={setForm}
            onSubmit={saveContract}
            onDelete={deleteContract}
          />

          {form._id || form.clientName ? (
            <HierarchySection
              contract={form}
              workers={workers}
              onNewWorkplace={() => setModal({ type: "workplace" })}
              onEditWorkplace={(workplace) => setModal({ type: "workplace", workplace })}
              onDeleteWorkplace={deleteWorkplace}
              onNewArea={(workplaceId) => setModal({ type: "area", workplaceId })}
              onEditArea={(workplaceId, area) => setModal({ type: "area", workplaceId, area })}
              onDeleteArea={deleteArea}
              onNewShift={(workplaceId, areaId) => setModal({ type: "shift", workplaceId, areaId })}
              onEditShift={(workplaceId, areaId, shift) => setModal({ type: "shift", workplaceId, areaId, shift })}
              onDeleteShift={deleteShift}
              onAssignStaff={(workplaceId, areaId, shiftId) => setModal({ type: "staff", workplaceId, areaId, shiftId })}
              onRemoveStaff={removeStaff}
            />
          ) : (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
              Guarda la informacion general para agregar lugares, areas, turnos y personal.
            </section>
          )}
        </div>
      </section>

      {modal?.type === "workplace" && (
        <WorkplaceModal
          workplace={modal.workplace}
          supervisors={supervisors}
          onClose={() => setModal(null)}
          onSave={upsertWorkplace}
        />
      )}
      {modal?.type === "area" && (
        <AreaModal
          area={modal.area}
          onClose={() => setModal(null)}
          onSave={(area) => upsertArea(modal.workplaceId, area)}
        />
      )}
      {modal?.type === "shift" && (
        <ShiftModal
          shift={modal.shift}
          onClose={() => setModal(null)}
          onSave={(shift) => upsertShift(modal.workplaceId, modal.areaId, shift)}
        />
      )}
      {modal?.type === "staff" && (
        <StaffModal
          workers={workers}
          onClose={() => setModal(null)}
          onAssign={(worker) => assignWorker(modal.workplaceId, modal.areaId, modal.shiftId, worker)}
        />
      )}
    </SystemModulePage>
  );
}

function ContractGeneralForm({
  form,
  clients,
  serviceTypes,
  groups,
  onChange,
  onSubmit,
  onDelete,
}: {
  form: ServiceContract;
  clients: SelectOption[];
  serviceTypes: SelectOption[];
  groups: SelectOption[];
  onChange: (contract: ServiceContract) => void;
  onSubmit: (e: FormEvent) => void;
  onDelete: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">Informacion general del contrato</h2>
        {form._id && <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Eliminar contrato</button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SearchableSelect label="Cliente" value={form.clientId || ""} options={clients} placeholder="Buscar cliente..." onChange={(option) => onChange({ ...form, clientId: option?.value || "", clientName: option?.label || "" })} />
        <SearchableSelect label="Tipo de servicio" value={form.serviceType || ""} options={serviceTypes} placeholder="Buscar servicio..." onChange={(option) => onChange({ ...form, serviceType: option?.label || "" })} />
        <Field label="Fecha inicio"><input required type="date" className={inputClass} value={form.startDate} onChange={(e) => onChange({ ...form, startDate: e.target.value })} /></Field>
        <Field label="Fecha fin"><input type="date" className={inputClass} value={form.endDate || ""} onChange={(e) => onChange({ ...form, endDate: e.target.value })} /></Field>
        <SearchableSelect label="Grupo de trabajo" value={form.workGroupId || ""} options={groups} placeholder="Buscar grupo..." onChange={(option) => onChange({ ...form, workGroupId: option?.value || "", workGroupName: option?.label || "" })} />
        <Field label="Estado">
          <select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as ServiceContract["status"] })}>
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
            <option value="finished">Finalizado</option>
          </select>
        </Field>
      </div>
      <button className="mt-5 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar contrato</button>
    </form>
  );
}

function HierarchySection({
  contract,
  onNewWorkplace,
  onEditWorkplace,
  onDeleteWorkplace,
  onNewArea,
  onEditArea,
  onDeleteArea,
  onNewShift,
  onEditShift,
  onDeleteShift,
  onAssignStaff,
  onRemoveStaff,
}: {
  contract: ServiceContract;
  workers: Worker[];
  onNewWorkplace: () => void;
  onEditWorkplace: (workplace: ContractWorkplace) => void;
  onDeleteWorkplace: (workplaceId: string) => void;
  onNewArea: (workplaceId: string) => void;
  onEditArea: (workplaceId: string, area: ContractArea) => void;
  onDeleteArea: (workplaceId: string, areaId: string) => void;
  onNewShift: (workplaceId: string, areaId: string) => void;
  onEditShift: (workplaceId: string, areaId: string, shift: ContractShift) => void;
  onDeleteShift: (workplaceId: string, areaId: string, shiftId: string) => void;
  onAssignStaff: (workplaceId: string, areaId: string, shiftId: string) => void;
  onRemoveStaff: (workplaceId: string, areaId: string, shiftId: string, staffId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">Lugares de trabajo</h2>
        <button onClick={onNewWorkplace} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Agregar lugar</button>
      </div>

      <div className="space-y-4">
        {(contract.workplaces || []).map((workplace) => (
          <details key={workplace.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4" open>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-bold text-[#173C61]">{workplace.name}</h3>
                  <p className="text-sm text-slate-600">{workplace.address || "Sin direccion"} | {workplace.supervisorName || "Sin supervisor"}</p>
                </div>
                <ActionButtons onEdit={() => onEditWorkplace(workplace)} onDelete={() => onDeleteWorkplace(workplace.id)} />
              </div>
            </summary>

            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <button onClick={() => onNewArea(workplace.id)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100">Agregar area</button>
              </div>
              {workplace.areas.map((area) => (
                <details key={area.id} className="rounded-md border border-slate-200 bg-white p-4" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="font-bold text-[#173C61]">{area.name}</h4>
                        <p className="text-sm text-slate-600">{area.areaType || "Sin tipo"} | {area.cleaningFrequency || "Sin frecuencia"} | {area.internalLocation || "Sin ubicacion"}</p>
                      </div>
                      <ActionButtons onEdit={() => onEditArea(workplace.id, area)} onDelete={() => onDeleteArea(workplace.id, area.id)} />
                    </div>
                  </summary>

                  <div className="mt-4 space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => onNewShift(workplace.id, area.id)} className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100">Agregar horario / turno</button>
                    </div>
                    {area.shifts.map((shift) => (
                      <details key={shift.id} className="rounded-md border border-slate-200 bg-slate-50 p-4" open>
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <h5 className="font-bold text-[#173C61]">{shift.shiftName}</h5>
                              <p className="text-sm text-slate-600">{shift.startTime} a {shift.endTime} | {formatDays(shift.workDays)}</p>
                            </div>
                            <ActionButtons onEdit={() => onEditShift(workplace.id, area.id, shift)} onDelete={() => onDeleteShift(workplace.id, area.id, shift.id)} />
                          </div>
                        </summary>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <h6 className="text-sm font-bold text-[#173C61]">Personal asignado</h6>
                            <button onClick={() => onAssignStaff(workplace.id, area.id, shift.id)} className="rounded-md bg-[#173C61] px-3 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Asignar personal</button>
                          </div>
                          <StaffTable staff={shift.assignedStaff} onRemove={(staffId) => onRemoveStaff(workplace.id, area.id, shift.id, staffId)} />
                        </div>
                      </details>
                    ))}
                    {area.shifts.length === 0 && <EmptyText text="Sin horarios registrados." />}
                  </div>
                </details>
              ))}
              {workplace.areas.length === 0 && <EmptyText text="Sin areas registradas." />}
            </div>
          </details>
        ))}
        {(!contract.workplaces || contract.workplaces.length === 0) && <EmptyText text="Sin lugares de trabajo registrados." />}
      </div>
    </section>
  );
}

function WorkplaceModal({ workplace, supervisors, onSave, onClose }: { workplace?: ContractWorkplace; supervisors: SelectOption[]; onSave: (workplace: ContractWorkplace) => void; onClose: () => void }) {
  const [form, setForm] = useState<ContractWorkplace>(workplace || { id: "", name: "", address: "", supervisorId: "", supervisorName: "", status: "active", areas: [] });
  return (
    <Modal title={workplace ? "Editar lugar de trabajo" : "Nuevo lugar de trabajo"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Nombre del lugar"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Direccion o referencia"><input className={inputClass} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <SearchableSelect label="Responsable / supervisor" value={form.supervisorId || ""} options={supervisors} onChange={(option) => setForm({ ...form, supervisorId: option?.value || "", supervisorName: option?.label || "" })} />
      <Field label="Estado"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContractWorkplace["status"] })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></Field>
    </Modal>
  );
}

function AreaModal({ area, onSave, onClose }: { area?: ContractArea; onSave: (area: ContractArea) => void; onClose: () => void }) {
  const [form, setForm] = useState<ContractArea>(area || { id: "", name: "", description: "", areaType: "", internalLocation: "", cleaningFrequency: "", status: "active", shifts: [] });
  return (
    <Modal title={area ? "Editar area" : "Nueva area"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Nombre del area"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Tipo de area"><input className={inputClass} value={form.areaType || ""} onChange={(e) => setForm({ ...form, areaType: e.target.value })} /></Field>
      <Field label="Piso o ubicacion interna"><input className={inputClass} value={form.internalLocation || ""} onChange={(e) => setForm({ ...form, internalLocation: e.target.value })} /></Field>
      <Field label="Frecuencia de limpieza"><input className={inputClass} value={form.cleaningFrequency || ""} onChange={(e) => setForm({ ...form, cleaningFrequency: e.target.value })} /></Field>
      <Field label="Estado"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContractArea["status"] })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></Field>
      <Field label="Descripcion"><textarea className={`${inputClass} min-h-24`} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
    </Modal>
  );
}

function ShiftModal({ shift, onSave, onClose }: { shift?: ContractShift; onSave: (shift: ContractShift) => void; onClose: () => void }) {
  const [form, setForm] = useState<ContractShift>(shift || { id: "", shiftName: "", startTime: "", endTime: "", workDays: [], observation: "", status: "active", assignedStaff: [] });
  function toggleDay(day: string) {
    setForm((current) => ({ ...current, workDays: current.workDays.includes(day) ? current.workDays.filter((item) => item !== day) : [...current.workDays, day] }));
  }
  return (
    <Modal title={shift ? "Editar horario / turno" : "Nuevo horario / turno"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Nombre del turno"><input required className={inputClass} value={form.shiftName} onChange={(e) => setForm({ ...form, shiftName: e.target.value })} /></Field>
      <Field label="Hora de inicio"><input required type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
      <Field label="Hora de fin"><input required type="time" className={inputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
      <Field label="Estado"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContractShift["status"] })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-semibold text-slate-700">Dias de trabajo</p>
        <div className="grid gap-2 sm:grid-cols-4">
          {days.map((day) => <label key={day.value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={form.workDays.includes(day.value)} onChange={() => toggleDay(day.value)} />{day.label}</label>)}
        </div>
      </div>
      <Field label="Observacion"><textarea className={`${inputClass} min-h-24`} value={form.observation || ""} onChange={(e) => setForm({ ...form, observation: e.target.value })} /></Field>
    </Modal>
  );
}

function StaffModal({ workers, onAssign, onClose }: { workers: Worker[]; onAssign: (worker: Worker) => void; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const visibleWorkers = workers.filter((worker) => `${worker.firstName} ${worker.lastName} ${worker.documentId} ${worker.position}`.toLowerCase().includes(term.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex justify-between gap-3">
          <h2 className="text-xl font-bold text-[#173C61]">Asignar personal</h2>
          <button onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>
        <input className={inputClass} placeholder="Buscar por nombre, cedula o cargo..." value={term} onChange={(e) => setTerm(e.target.value)} />
        <div className="mt-4 max-h-96 space-y-2 overflow-auto">
          {visibleWorkers.map((worker) => (
            <button key={worker._id} onClick={() => onAssign(worker)} className="w-full rounded-md border border-slate-200 px-4 py-3 text-left hover:bg-[#E6F8F9]">
              <span className="block font-semibold text-[#173C61]">{worker.firstName} {worker.lastName}</span>
              <span className="text-sm text-slate-600">{worker.documentId} | {worker.position} | {worker.phone}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Modal({ title, children, onClose, onSubmit }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex justify-between gap-3">
          <h2 className="text-xl font-bold text-[#173C61]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        <button className="mt-5 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar</button>
      </form>
    </div>
  );
}

function StaffTable({ staff, onRemove }: { staff: AssignedContractStaff[]; onRemove: (staffId: string) => void }) {
  if (!staff.length) return <EmptyText text="Sin personal asignado." />;
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#173C61]">
        <span>Empleado</span><span>Cedula</span><span>Cargo</span><span>Telefono</span><span>Accion</span>
      </div>
      {staff.map((item) => (
        <div key={item.id} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_auto] gap-3 border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">{item.firstName} {item.lastName}</span>
          <span>{item.documentId}</span>
          <span>{item.position}</span>
          <span>{item.phone}</span>
          <button onClick={() => onRemove(item.id)} className="font-semibold text-red-700 hover:text-red-900">Quitar</button>
        </div>
      ))}
    </div>
  );
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100">Editar</button>
      <button onClick={onDelete} className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Eliminar</button>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">{text}</p>;
}

function normalizeContract(contract: ServiceContract): ServiceContract {
  const workplaces = contract.workplaces?.length
    ? contract.workplaces
    : contract.area || contract.shift
      ? [{
          id: createId(),
          name: contract.area || "Lugar principal",
          address: "",
          status: "active" as const,
          areas: [{
            id: createId(),
            name: contract.area || "Area principal",
            status: "active" as const,
            shifts: contract.shift ? [{
              id: createId(),
              shiftName: contract.shift,
              startTime: "00:00",
              endTime: "23:59",
              workDays: [],
              status: "active" as const,
              assignedStaff: [],
            }] : [],
          }],
        }]
      : [];
  return { ...emptyContract, ...contract, workplaces };
}

function buildContractPayload(contract: ServiceContract): ServiceContract {
  // Estos campos resumen mantienen compatibilidad con reportes y selects que ya consumian contratos planos.
  const primaryWorkplace = contract.workplaces?.[0];
  const primaryArea = primaryWorkplace?.areas?.[0];
  const primaryShift = primaryArea?.shifts?.[0];
  const assignedStaff = (contract.workplaces || []).flatMap((workplace) => workplace.areas.flatMap((area) => area.shifts.flatMap((shift) => shift.assignedStaff)));
  return {
    ...contract,
    area: primaryWorkplace?.name || primaryArea?.name || contract.area || "",
    shift: primaryShift?.shiftName || contract.shift || "",
    assignedStaffIds: assignedStaff.map((staff) => staff.workerId),
    assignedStaff: assignedStaff.map((staff) => `${staff.firstName} ${staff.lastName}`.trim()).join(", "),
  };
}

function mapWorkplaces(contract: ServiceContract, workplaceId: string, mapper: (workplace: ContractWorkplace) => ContractWorkplace): ServiceContract {
  return { ...contract, workplaces: (contract.workplaces || []).map((workplace) => workplace.id === workplaceId ? mapper(workplace) : workplace) };
}

function mapAreas(contract: ServiceContract, workplaceId: string, areaId: string, mapper: (area: ContractArea) => ContractArea): ServiceContract {
  return mapWorkplaces(contract, workplaceId, (workplace) => ({ ...workplace, areas: workplace.areas.map((area) => area.id === areaId ? mapper(area) : area) }));
}

function mapShifts(contract: ServiceContract, workplaceId: string, areaId: string, shiftId: string, mapper: (shift: ContractShift) => ContractShift): ServiceContract {
  return mapAreas(contract, workplaceId, areaId, (area) => ({ ...area, shifts: area.shifts.map((shift) => shift.id === shiftId ? mapper(shift) : shift) }));
}

function findShift(contract: ServiceContract, workplaceId: string, areaId: string, shiftId: string) {
  return contract.workplaces?.find((workplace) => workplace.id === workplaceId)?.areas.find((area) => area.id === areaId)?.shifts.find((shift) => shift.id === shiftId);
}

function findWorkerScheduleConflict(currentContract: ServiceContract, allContracts: ServiceContract[], workerId: string, targetShift: ContractShift) {
  const contractsToCheck = [
    currentContract,
    ...allContracts.filter((contract) => contract._id && contract._id !== currentContract._id).map(normalizeContract),
  ];

  for (const contract of contractsToCheck) {
    const sameDateRange = dateRangesOverlap(currentContract.startDate, currentContract.endDate, contract.startDate, contract.endDate);
    if (!sameDateRange) continue;

    const shifts = (contract.workplaces || []).flatMap((workplace) => workplace.areas.flatMap((area) => area.shifts));
    for (const shift of shifts) {
      if (contract._id === currentContract._id && shift.id === targetShift.id) continue;
      if (shift.status !== "active") continue;
      const hasWorker = shift.assignedStaff.some((staff) => staff.workerId === workerId && staff.assignmentStatus === "active");
      if (hasWorker && shiftsOverlap(shift, targetShift)) {
        return { contractName: contract.clientName || "otro contrato", shiftName: shift.shiftName };
      }
    }
  }

  return null;
}

function shiftsOverlap(left: ContractShift, right: ContractShift) {
  const dayOverlap = !left.workDays.length || !right.workDays.length || left.workDays.some((day) => right.workDays.includes(day));
  return dayOverlap && timeRangesOverlap(left.startTime, left.endTime, right.startTime, right.endTime);
}

function dateRangesOverlap(leftStart: string, leftEnd: string | undefined, rightStart: string, rightEnd: string | undefined) {
  const leftEndValue = leftEnd || "9999-12-31";
  const rightEndValue = rightEnd || "9999-12-31";
  return leftStart <= rightEndValue && rightStart <= leftEndValue;
}

function timeRangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const left = timeRangeToMinutes(leftStart, leftEnd);
  const right = timeRangeToMinutes(rightStart, rightEnd);
  // En operaciones no permitimos asignaciones pegadas sin margen:
  // si un turno termina a las 16:00 y otro inicia a las 16:00, cuenta como cruce.
  return left.some(([leftA, leftB]) => right.some(([rightA, rightB]) => leftA <= rightB && rightA <= leftB));
}

function timeRangeToMinutes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const ranges: [number, number][] = [[startMinutes, endMinutes]];
  if (endMinutes > 24 * 60) ranges.push([0, endMinutes - 24 * 60]);
  return ranges;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function hasContractStructure(contract: ServiceContract) {
  return (contract.workplaces || []).some((workplace) => workplace.areas.length > 0);
}

function getPrimaryWorkplace(contract: ServiceContract) {
  return contract.workplaces?.[0]?.name || contract.area || "Sin lugar";
}

function getPrimaryShift(contract: ServiceContract) {
  return contract.workplaces?.[0]?.areas?.[0]?.shifts?.[0]?.shiftName || contract.shift || "Sin turno";
}

function formatDays(values: string[]) {
  if (!values.length) return "Todos los dias";
  return days.filter((day) => values.includes(day.value)).map((day) => day.label).join(", ");
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
