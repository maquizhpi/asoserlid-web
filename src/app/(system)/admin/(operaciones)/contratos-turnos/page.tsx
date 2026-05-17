"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import { confirmSystem, notifySystem } from "@/components/system/SystemNotifier";
import type {
  AssignedContractStaff,
  Client,
  ContractArea,
  ContractShift,
  ContractWorkplace,
  ServiceContract,
  ServiceType,
  SupplyKit,
  SupplyKitItem,
  SupplyProduct,
  Worker,
  WorkGroup,
} from "@/types/admin";

type SessionUser = {
  roles: string[];
  workGroups?: { id: string; name: string }[];
};

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
  contractNumber: "",
  contractAdministrator: "",
  contractAdministratorEmail: "",
  contractAdministratorPhone: "",
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

function createEmptyContract(workGroup?: SelectOption | null): ServiceContract {
  return {
    ...emptyContract,
    startDate: new Date().toISOString().slice(0, 10),
    workGroupId: workGroup?.value || "",
    workGroupName: workGroup?.label || "",
    workplaces: [],
    assignedStaffIds: [],
  };
}

type ModalState =
  | { type: "contract"; contract: ServiceContract }
  | { type: "workplace"; workplace?: ContractWorkplace }
  | { type: "area"; workplaceId: string; area?: ContractArea }
  | { type: "shift"; workplaceId: string; areaId: string; shift?: ContractShift }
  | { type: "staff"; workplaceId: string; areaId: string; shiftId: string }
  | { type: "kit"; kit: SupplyKit }
  | null;

export default function ContractsShiftsPage() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<SelectOption[]>([]);
  const [groups, setGroups] = useState<SelectOption[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [kits, setKits] = useState<SupplyKit[]>([]);
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceContract>(createEmptyContract);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
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
    // La carga inicial debe ejecutarse una sola vez; los guardados recargan datos explicitamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isCreatingNew) setForm(selectedContract ? normalizeContract(selectedContract) : createEmptyContract(getDefaultWorkGroup(sessionUser, groups)));
  }, [groups, isCreatingNew, selectedContract, sessionUser]);

  useEffect(() => {
    if (!isCreatingNew && !selectedContract && contracts[0]?._id) setSelectedId(contracts[0]._id);
  }, [contracts, isCreatingNew, selectedContract]);

  async function loadData() {
    const [contractsRes, clientsRes, serviceTypesRes, groupsRes, workersRes, supervisorsRes, kitsRes, productsRes, meRes] = await Promise.all([
      fetch("/api/admin/contracts", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/service-types", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/supervisors", { cache: "no-store" }),
      fetch("/api/admin/supply-kits", { cache: "no-store" }),
      fetch("/api/admin/supply-products", { cache: "no-store" }),
      fetch("/api/admin/me", { cache: "no-store" }),
    ]);
    const contractsData = await contractsRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const serviceTypesData = await serviceTypesRes.json().catch(() => ({}));
    const groupsData = await groupsRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));
    const supervisorsData = await supervisorsRes.json().catch(() => ({}));
    const kitsData = await kitsRes.json().catch(() => ({}));
    const productsData = await productsRes.json().catch(() => ({}));
    const meData = await meRes.json().catch(() => ({}));
    const currentUser = meData.user || null;
    const scopedGroups = (currentUser?.workGroups || []).map((group: { id: string; name: string }) => ({ value: group.id, label: group.name }));

    if (contractsRes.ok) setContracts((contractsData.items || []).map(normalizeContract));
    if (clientsRes.ok) setClients(((clientsData.items || []) as Client[]).map((client) => ({ value: client._id || "", label: client.name })));
    if (serviceTypesRes.ok) {
      setServiceTypes(
        ((serviceTypesData.items || []) as ServiceType[])
          .filter((item) => item.status === "active")
          .map((item) => ({ value: item.name, label: item.name }))
      );
    }
    setSessionUser(currentUser);
    if (groupsRes.ok) {
      const loadedGroups = ((groupsData.items || []) as WorkGroup[]).map((group) => ({ value: group._id || "", label: group.commercialName || group.name }));
      setGroups(loadedGroups.length ? loadedGroups : scopedGroups);
    } else {
      setGroups(scopedGroups);
    }
    if (workersRes.ok) setWorkers(workersData.items || []);
    if (supervisorsRes.ok) setSupervisors((supervisorsData.items || []).map((item: { id: string; name: string }) => ({ value: item.id, label: item.name })));
    if (kitsRes.ok) setKits(kitsData.items || []);
    if (productsRes.ok) setProducts(productsData.items || []);
    if (!contractsRes.ok || !clientsRes.ok || !serviceTypesRes.ok || !workersRes.ok || !supervisorsRes.ok || !kitsRes.ok || !productsRes.ok) {
      showStatus(contractsData.error || clientsData.error || serviceTypesData.error || groupsData.error || workersData.error || supervisorsData.error || kitsData.error || productsData.error || "No se pudo cargar contratos.", "error");
    }
  }

  async function startNewContract() {
    if (!(await confirmLeaveChanges())) return;
    setModal({ type: "contract", contract: createEmptyContract(getDefaultWorkGroup(sessionUser, groups)) });
  }

  async function selectContract(contractId: string) {
    if (!(await confirmLeaveChanges())) return;
    setIsCreatingNew(false);
    setSelectedId(contractId);
  }

  function showStatus(message: string, tone: "info" | "success" | "warning" | "error" = "info") {
    setStatus(message);
    notifySystem(message, { tone });
  }

  async function confirmLeaveChanges() {
    if (!hasUnsavedChanges(form, selectedContract, isCreatingNew)) return true;
    return confirmSystem("Tienes cambios sin guardar. Si sales o cambias de contrato, esos cambios se perderan.", {
      tone: "warning",
      confirmLabel: "Salir sin guardar",
      cancelLabel: "Seguir editando",
    });
  }

  async function saveContract(e?: FormEvent, nextForm = form) {
    e?.preventDefault();
    showStatus("Guardando contrato...", "info");

    const defaultWorkGroup = getDefaultWorkGroup(sessionUser, groups);
    const payload = buildContractPayload({
      ...nextForm,
      workGroupId: nextForm.workGroupId || defaultWorkGroup?.value || "",
      workGroupName: nextForm.workGroupName || defaultWorkGroup?.label || "",
    });
    const isNew = !payload._id;
    const res = await fetch(isNew ? "/api/admin/contracts" : `/api/admin/contracts/${payload._id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showStatus(data.error || "No se pudo guardar el contrato.", "error");
      return false;
    }

    showStatus("Contrato guardado correctamente.", "success");
    await loadData();
    setIsCreatingNew(false);
    setSelectedId(data.item?._id || payload._id || null);
    setForm(normalizeContract(data.item || payload));
    setModal(null);
    return true;
  }

  async function deleteContract() {
    if (!form._id) return;
    if (hasContractStructure(form)) {
      showStatus("No se puede eliminar un contrato con lugares, areas, turnos o personal asignado. Elimina primero su estructura.", "warning");
      return;
    }
    const confirmed = await confirmSystem("Vas a eliminar este contrato. Esta accion no se puede deshacer.", { tone: "warning", confirmLabel: "Eliminar" });
    if (!confirmed) return;

    const res = await fetch(`/api/admin/contracts/${form._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showStatus(data.error || "No se pudo eliminar el contrato.", "error");
      return;
    }

    showStatus("Contrato eliminado.", "success");
    setSelectedId(null);
    setIsCreatingNew(false);
    await loadData();
  }

  async function saveNested(nextForm: ServiceContract, successMessage: string) {
    setForm(nextForm);
    if (!nextForm.clientName || !nextForm.serviceType || !nextForm.startDate) {
      showStatus("Primero completa y guarda la informacion general del contrato.", "warning");
      return;
    }
    setModal(null);
    const ok = await saveContract(undefined, nextForm);
    if (ok) {
      showStatus(successMessage, "success");
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

  async function deleteWorkplace(workplaceId: string) {
    const workplace = form.workplaces?.find((item) => item.id === workplaceId);
    if (workplace && workplace.areas.length > 0) {
      const confirmed = await confirmSystem("Este lugar tiene areas, turnos o personal. Si continuas se elimina toda su estructura.", { tone: "warning", confirmLabel: "Eliminar lugar" });
      if (!confirmed) return;
    }
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
      showStatus("No se puede eliminar un area con horarios activos.", "warning");
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
      showStatus("No se puede eliminar un horario con personal asignado activo.", "warning");
      return;
    }
    const nextForm = mapAreas(form, workplaceId, areaId, (area) => ({ ...area, shifts: area.shifts.filter((item) => item.id !== shiftId) }));
    saveNested(nextForm, "Horario eliminado.");
  }

  function assignWorkers(workplaceId: string, areaId: string, shiftId: string, selectedWorkers: Worker[]) {
    const shift = findShift(form, workplaceId, areaId, shiftId);
    if (!shift || !selectedWorkers.length) return;

    const currentStaff = [...shift.assignedStaff];
    const rejected: string[] = [];
    const added: AssignedContractStaff[] = [];

    for (const worker of selectedWorkers) {
      if (!worker._id) continue;
      const workerName = `${worker.firstName} ${worker.lastName}`.trim();
      if (currentStaff.some((staff) => staff.workerId === worker._id && staff.assignmentStatus === "active")) {
        rejected.push(`${workerName}: ya esta asignado a este horario`);
        continue;
      }
      const conflict = findWorkerScheduleConflict(
        { ...form, workplaces: replaceShiftStaff(form, workplaceId, areaId, shiftId, currentStaff).workplaces },
        contracts,
        worker._id,
        shift
      );
      if (conflict) {
        rejected.push(`${workerName}: cruza con ${conflict.shiftName} en ${conflict.contractName}`);
        continue;
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
      currentStaff.push(staff);
      added.push(staff);
    }

    if (!added.length) {
      showStatus(`No se asigno personal.\n${rejected.join("\n")}`, "warning");
      return;
    }

    const nextForm = mapShifts(form, workplaceId, areaId, shiftId, (item) => ({ ...item, assignedStaff: currentStaff }));
    const message = rejected.length
      ? `${added.length} trabajador(es) asignado(s).\nNo asignados:\n${rejected.join("\n")}`
      : `${added.length} trabajador(es) asignado(s).`;
    saveNested(nextForm, message);
  }

  function removeStaff(workplaceId: string, areaId: string, shiftId: string, staffId: string) {
    const nextForm = mapShifts(form, workplaceId, areaId, shiftId, (shift) => ({ ...shift, assignedStaff: shift.assignedStaff.filter((staff) => staff.id !== staffId) }));
    saveNested(nextForm, "Personal quitado del turno.");
  }

  async function saveKit(kit: SupplyKit) {
    if (!kit._id) return;
    showStatus("Actualizando kit de insumos...", "info");
    const totalItems = (kit.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const payload = {
      ...kit,
      productName: `${kit.items?.length || 0} insumo(s)`,
      quantity: totalItems,
      frequency: "Mensual",
      kitPeriod: "",
    };
    const res = await fetch(`/api/admin/supply-kits/${kit._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showStatus(data.error || "No se pudo actualizar el kit.", "error");
      return;
    }
    showStatus("Kit de insumos actualizado correctamente.", "success");
    setModal(null);
    await loadData();
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
                onClick={() => contract._id && selectContract(contract._id)}
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
          <ContractGeneralView
            contract={form}
            onEdit={() => setModal({ type: "contract", contract: form })}
            onDelete={deleteContract}
          />

          {form._id || form.clientName ? (
            <HierarchySection
              contract={form}
              kits={kits}
              products={products}
              workers={workers}
              onViewKit={(kit) => setModal({ type: "kit", kit })}
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
      {modal?.type === "contract" && (
        <ContractModal
          contract={modal.contract}
          clients={clients}
          serviceTypes={serviceTypes}
          groups={groups}
          canChooseGroup={canChooseGroup(sessionUser)}
          onClose={() => setModal(null)}
          onSave={(contract) => saveContract(undefined, contract)}
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
          currentContract={form}
          contracts={contracts}
          targetShift={findShift(form, modal.workplaceId, modal.areaId, modal.shiftId)}
          onClose={() => setModal(null)}
          onAssign={(selectedWorkers) => assignWorkers(modal.workplaceId, modal.areaId, modal.shiftId, selectedWorkers)}
        />
      )}
      {modal?.type === "kit" && (
        <KitModal
          kit={modal.kit}
          products={products}
          onClose={() => setModal(null)}
          onSave={saveKit}
        />
      )}
    </SystemModulePage>
  );
}

function ContractGeneralView({
  contract,
  onEdit,
  onDelete,
}: {
  contract: ServiceContract;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">Informacion general del contrato</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">{contract._id ? "Editar contrato" : "Nuevo contrato"}</button>
          {contract._id && <button type="button" onClick={onDelete} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Eliminar contrato</button>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoBox label="Numero de contrato" value={contract.contractNumber || "-"} />
        <InfoBox label="Cliente" value={contract.clientName || "-"} />
        <InfoBox label="Tipo de servicio" value={contract.serviceType || "-"} />
        <InfoBox label="Fecha inicio" value={formatDate(contract.startDate)} />
        <InfoBox label="Fecha fin" value={formatDate(contract.endDate)} />
        <InfoBox label="Grupo de trabajo" value={contract.workGroupName || "-"} />
        <InfoBox label="Administrador de contrato" value={contract.contractAdministrator || "-"} />
        <InfoBox label="Correo administrador" value={contract.contractAdministratorEmail || "-"} />
        <InfoBox label="Telefono administrador" value={contract.contractAdministratorPhone || "-"} />
        <InfoBox label="Estado" value={contract.status === "active" ? "Activo" : contract.status === "paused" ? "Pausado" : "Finalizado"} />
      </div>
    </section>
  );
}

function ContractModal({
  contract,
  clients,
  serviceTypes,
  groups,
  canChooseGroup,
  onSave,
  onClose,
}: {
  contract: ServiceContract;
  clients: SelectOption[];
  serviceTypes: SelectOption[];
  groups: SelectOption[];
  canChooseGroup: boolean;
  onSave: (contract: ServiceContract) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ServiceContract>(normalizeContract(contract));
  const selectedGroup = groups.find((group) => group.value === form.workGroupId) || (form.workGroupId ? { value: form.workGroupId, label: form.workGroupName || form.workGroupId } : null);
  return (
    <Modal title={form._id ? "Editar contrato" : "Nuevo contrato"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Numero de contrato"><input className={inputClass} value={form.contractNumber || ""} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} /></Field>
      <SearchableSelect label="Cliente" value={form.clientId || ""} options={clients} placeholder="Buscar cliente..." onChange={(option) => setForm({ ...form, clientId: option?.value || "", clientName: option?.label || "" })} />
      <SearchableSelect label="Tipo de servicio" value={form.serviceType || ""} options={serviceTypes} placeholder="Buscar servicio..." onChange={(option) => setForm({ ...form, serviceType: option?.label || "" })} />
      {canChooseGroup ? (
        <SearchableSelect label="Grupo de trabajo" value={form.workGroupId || ""} options={groups} placeholder="Buscar grupo..." onChange={(option) => setForm({ ...form, workGroupId: option?.value || "", workGroupName: option?.label || "" })} />
      ) : (
        <Field label="Grupo de trabajo">
          <input className={inputClass} value={selectedGroup?.label || form.workGroupName || "Empresa del usuario"} readOnly />
        </Field>
      )}
      <Field label="Administrador de contrato"><input className={inputClass} value={form.contractAdministrator || ""} onChange={(e) => setForm({ ...form, contractAdministrator: e.target.value })} /></Field>
      <Field label="Correo del administrador"><input type="email" className={inputClass} value={form.contractAdministratorEmail || ""} onChange={(e) => setForm({ ...form, contractAdministratorEmail: e.target.value })} /></Field>
      <Field label="Telefono del administrador"><input className={inputClass} value={form.contractAdministratorPhone || ""} onChange={(e) => setForm({ ...form, contractAdministratorPhone: e.target.value })} /></Field>
      <Field label="Fecha inicio"><input required type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
      <Field label="Fecha fin"><input type="date" className={inputClass} value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
      <Field label="Estado">
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceContract["status"] })}>
          <option value="active">Activo</option>
          <option value="paused">Pausado</option>
          <option value="finished">Finalizado</option>
        </select>
      </Field>
    </Modal>
  );
}

function HierarchySection({
  contract,
  kits,
  products,
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
  onViewKit,
}: {
  contract: ServiceContract;
  kits: SupplyKit[];
  products: SupplyProduct[];
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
  onViewKit: (kit: SupplyKit) => void;
}) {
  void products;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold text-[#173C61]">Lugares de trabajo</h2>
        <button onClick={onNewWorkplace} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]">Agregar lugar</button>
      </div>

      <div className="space-y-4">
        {(contract.workplaces || []).map((workplace) => {
          const kit = kits.find((item) => item.contractId === contract._id && item.workplaceId === workplace.id);
          return (
          <details key={workplace.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-bold text-[#173C61]">{workplace.name}</h3>
                  <p className="text-sm text-slate-600">{workplace.address || "Sin direccion"} | {workplace.supervisorName || "Sin supervisor"}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {workplace.areas.length} areas | {countWorkplaceShifts(workplace)} turnos | {countWorkplaceStaff(workplace)} trabajadores
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Kit mensual: {kit?.kitCode || "sin asignar"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {kit ? (
                    <button
                      type="button"
                      onClick={() => onViewKit(kit)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100"
                    >
                      Ver kit
                    </button>
                  ) : (
                    <Link
                      href={`/admin/kits-insumos?contractId=${encodeURIComponent(contract._id || "")}&workplaceId=${encodeURIComponent(workplace.id)}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100"
                    >
                      Asignar kit de insumos
                    </Link>
                  )}
                  <ActionButtons onEdit={() => onEditWorkplace(workplace)} onDelete={() => onDeleteWorkplace(workplace.id)} />
                </div>
              </div>
            </summary>

            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <button onClick={() => onNewArea(workplace.id)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100">Agregar area</button>
              </div>
              {workplace.areas.map((area) => (
                <details key={area.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="font-bold text-[#173C61]">{area.name}</h4>
                        <p className="text-sm text-slate-600">{area.areaType || "Sin tipo"} | {area.cleaningFrequency || "Sin frecuencia"} | {area.internalLocation || "Sin ubicacion"}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {area.shifts.length} turnos | {countAreaStaff(area)} trabajadores
                        </p>
                      </div>
                      <ActionButtons onEdit={() => onEditArea(workplace.id, area)} onDelete={() => onDeleteArea(workplace.id, area.id)} />
                    </div>
                  </summary>

                  <div className="mt-4 space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => onNewShift(workplace.id, area.id)} className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-[#173C61] hover:bg-slate-100">Agregar horario / turno</button>
                    </div>
                    {area.shifts.map((shift) => (
                      <details key={shift.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <h5 className="font-bold text-[#173C61]">{shift.shiftName}</h5>
                              <p className="text-sm text-slate-600">
                                {shift.startTime} a {shift.endTime} | {formatDays(shift.workDays)}
                                {Number(shift.lunchBreakMinutes || 0) > 0 ? ` | Almuerzo ${shift.lunchBreakMinutes} min` : ""}
                              </p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                {shift.assignedStaff.length} trabajadores asignados
                              </p>
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
          );
        })}
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
  const [form, setForm] = useState<ContractShift>(shift || { id: "", shiftName: "", startTime: "", endTime: "", lunchBreakMinutes: 0, workDays: [], observation: "", status: "active", assignedStaff: [] });
  function toggleDay(day: string) {
    setForm((current) => ({ ...current, workDays: current.workDays.includes(day) ? current.workDays.filter((item) => item !== day) : [...current.workDays, day] }));
  }
  function updateLunchBreakMinutes(value: string) {
    const lunchBreakMinutes = Math.max(0, Number(value || 0));
    setForm({ ...form, lunchBreakMinutes });
  }
  return (
    <Modal title={shift ? "Editar horario / turno" : "Nuevo horario / turno"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Nombre del turno"><input required className={inputClass} value={form.shiftName} onChange={(e) => setForm({ ...form, shiftName: e.target.value })} /></Field>
      <Field label="Hora de inicio"><input required type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
      <Field label="Hora de fin"><input required type="time" className={inputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
      <Field label="Almuerzo no trabajado (minutos)"><input type="number" min="0" step="15" className={inputClass} value={form.lunchBreakMinutes || 0} onChange={(e) => updateLunchBreakMinutes(e.target.value)} /></Field>
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

function StaffModal({
  workers,
  currentContract,
  contracts,
  targetShift,
  onAssign,
  onClose,
}: {
  workers: Worker[];
  currentContract: ServiceContract;
  contracts: ServiceContract[];
  targetShift?: ContractShift;
  onAssign: (workers: Worker[]) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const visibleWorkers = workers.filter((worker) => `${worker.firstName} ${worker.lastName} ${worker.documentId} ${worker.position}`.toLowerCase().includes(term.toLowerCase()));
  const selectedWorkers = workers.filter((worker) => worker._id && selectedWorkerIds.includes(worker._id));
  function toggleWorker(workerId: string) {
    const worker = workers.find((item) => item._id === workerId);
    if (!worker || getWorkerAvailability(worker, currentContract, contracts, targetShift).blocked) return;
    setSelectedWorkerIds((current) => current.includes(workerId) ? current.filter((id) => id !== workerId) : [...current, workerId]);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex justify-between gap-3">
          <h2 className="text-xl font-bold text-[#173C61]">Asignar personal</h2>
          <button onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>
        <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          Puedes asignar un trabajador de otro grupo o contrato siempre que sus horarios no se crucen.
        </p>
        <input className={inputClass} placeholder="Buscar por nombre, cedula o cargo..." value={term} onChange={(e) => setTerm(e.target.value)} />
        <div className="mt-4 max-h-96 space-y-2 overflow-auto">
          {visibleWorkers.map((worker) => {
            const availability = getWorkerAvailability(worker, currentContract, contracts, targetShift);
            const isSelected = Boolean(worker._id && selectedWorkerIds.includes(worker._id));
            return (
              <button
                key={worker._id}
                type="button"
                disabled={availability.blocked}
                onClick={() => worker._id && toggleWorker(worker._id)}
                className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
                  availability.blocked
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-75"
                    : isSelected
                      ? "border-[#33C3C9] bg-[#E6F8F9] hover:bg-[#E6F8F9]"
                      : "border-slate-200 hover:bg-[#E6F8F9]"
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border bg-white text-xs font-bold ${availability.blocked ? "border-slate-200 text-slate-400" : "border-slate-300 text-[#173C61]"}`}>
                  {isSelected ? "OK" : ""}
                </span>
                <span>
                  <span className={`block font-semibold ${availability.blocked ? "text-slate-500" : "text-[#173C61]"}`}>{worker.firstName} {worker.lastName}</span>
                  <span className="text-sm text-slate-600">{worker.documentId} | {worker.position} | {worker.phone}</span>
                  {availability.reason && <span className="mt-1 block text-xs font-semibold text-red-600">{availability.reason}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-600">
            {selectedWorkers.length ? `${selectedWorkers.length} trabajador(es) seleccionado(s).` : "Selecciona uno o varios trabajadores y luego confirma con Agregar."}
          </p>
          <button
            type="button"
            disabled={!selectedWorkers.length}
            onClick={() => onAssign(selectedWorkers)}
            className="rounded-md bg-[#173C61] px-5 py-3 text-sm font-bold text-white hover:bg-[#218F93] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar seleccionados
          </button>
        </div>
      </section>
    </div>
  );
}

function KitModal({
  kit,
  products,
  onSave,
  onClose,
}: {
  kit: SupplyKit;
  products: SupplyProduct[];
  onSave: (kit: SupplyKit) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SupplyKit>({ ...kit, items: kit.items || [] });
  const [itemForm, setItemForm] = useState<SupplyKitItem>({ id: "", productId: "", productCode: "", productName: "", productCategory: "", unit: "", quantity: 1 });
  const [message, setMessage] = useState("");
  const productOptions = products
    .filter((product) => product.status === "active")
    .map((product) => ({ value: product._id || product.code, label: `${product.code} - ${product.name} | ${product.category}` }));
  const totalItems = (form.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  function addItem() {
    if (!itemForm.productName || Number(itemForm.quantity || 0) <= 0) {
      setMessage("Selecciona un insumo y una cantidad mayor a cero.");
      return;
    }
    const exists = (form.items || []).some((item) => (item.productId || item.productCode) === (itemForm.productId || itemForm.productCode));
    if (exists) {
      setMessage("Ese insumo ya esta en el kit. Ajusta su cantidad o quitalo antes de volver a agregarlo.");
      return;
    }
    setForm((current) => ({ ...current, items: [...(current.items || []), { ...itemForm, id: createId() }] }));
    setItemForm({ id: "", productId: "", productCode: "", productName: "", productCategory: "", unit: "", quantity: 1 });
    setMessage("");
  }

  function updateItem(itemId: string, quantity: number) {
    setForm((current) => ({
      ...current,
      items: (current.items || []).map((item) => item.id === itemId ? { ...item, quantity } : item),
    }));
  }

  function removeItem(itemId: string) {
    setForm((current) => ({ ...current, items: (current.items || []).filter((item) => item.id !== itemId) }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Kit de insumos mensual</h2>
            <p className="mt-1 text-sm text-slate-600">{form.kitCode || "Sin codigo"} | {form.clientName} | {form.workplaceName}</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>

        {message && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoBox label="Codigo" value={form.kitCode || "Sin codigo"} />
          <InfoBox label="Frecuencia" value="Mensual" />
          <InfoBox label="Contrato" value={form.contractName || form.clientName} />
          <InfoBox label="Lugar de trabajo" value={form.workplaceName || "Sin lugar"} />
          <InfoBox label="Supervisor" value={form.supervisorName || "Sin supervisor"} />
          <InfoBox label="Total referencial" value={`${totalItems} unidades`} />
        </div>

        <section className="mt-5 rounded-lg border border-slate-200 p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="font-bold text-[#173C61]">Lista de insumos</h3>
            <button type="button" onClick={() => printKit(form)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-[#173C61] hover:bg-slate-50">
              Imprimir kit
            </button>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_8rem_auto]">
            <SearchableSelect
              label="Producto disponible"
              value={itemForm.productId || itemForm.productCode || ""}
              options={productOptions}
              placeholder="Buscar insumo..."
              onChange={(option) => {
                const product = products.find((item) => (item._id || item.code) === option?.value);
                setItemForm({
                  id: "",
                  productId: product?._id || "",
                  productCode: product?.code || "",
                  productName: product?.name || "",
                  productCategory: product?.category || "",
                  unit: product?.unit || "",
                  quantity: 1,
                });
              }}
            />
            <Field label="Cantidad">
              <input type="number" min="0.01" step="0.01" className={inputClass} value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: Number(event.target.value) })} />
            </Field>
            <div className="flex items-end">
              <button type="button" onClick={addItem} className="rounded-md bg-[#173C61] px-4 py-3 text-sm font-bold text-white hover:bg-[#218F93]">Agregar</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Codigo</th>
                  <th className="px-3 py-2">Nombre de producto</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2 text-right">Quitar</th>
                </tr>
              </thead>
              <tbody>
                {(form.items || []).map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold text-[#173C61]">{item.productCode}</td>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">{item.productCategory}</td>
                    <td className="px-3 py-2">
                      <input type="number" min="0.01" step="0.01" className="w-28 rounded-md border border-slate-300 px-3 py-2" value={item.quantity} onChange={(event) => updateItem(item.id, Number(event.target.value))} />
                      <span className="ml-2 text-xs font-semibold text-slate-500">{item.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="font-bold text-red-700 hover:text-red-900" onClick={() => removeItem(item.id)}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
          Observaciones
          <textarea className={`${inputClass} min-h-24`} value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => printKit(form)} className="rounded-md border border-slate-300 bg-white px-5 py-3 font-bold text-[#173C61] hover:bg-slate-50">Imprimir</button>
          <button type="button" onClick={() => onSave(form)} className="rounded-md bg-[#173C61] px-5 py-3 font-bold text-white hover:bg-[#218F93]">Actualizar kit</button>
        </div>
      </section>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-[#173C61]">{value || "Sin dato"}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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

function countWorkplaceShifts(workplace: ContractWorkplace) {
  return workplace.areas.reduce((total, area) => total + area.shifts.length, 0);
}

function countWorkplaceStaff(workplace: ContractWorkplace) {
  return workplace.areas.reduce((total, area) => total + countAreaStaff(area), 0);
}

function countAreaStaff(area: ContractArea) {
  return area.shifts.reduce((total, shift) => total + shift.assignedStaff.length, 0);
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
              lunchBreakMinutes: 0,
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

function canChooseGroup(user: SessionUser | null) {
  return Boolean(user?.roles.some((role) => ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "accounting"].includes(role)));
}

function getDefaultWorkGroup(user: SessionUser | null, groups: SelectOption[]) {
  if (canChooseGroup(user)) return null;
  const userGroup = user?.workGroups?.[0];
  if (userGroup) return { value: userGroup.id, label: userGroup.name };
  return groups.length === 1 ? groups[0] : null;
}

function hasUnsavedChanges(form: ServiceContract, selectedContract: ServiceContract | undefined, isCreatingNew: boolean) {
  const base = isCreatingNew ? createEmptyContract() : selectedContract ? normalizeContract(selectedContract) : createEmptyContract();
  return stableContractJson(form) !== stableContractJson(base);
}

function stableContractJson(contract: ServiceContract) {
  return JSON.stringify(buildContractPayload(contract));
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

function replaceShiftStaff(contract: ServiceContract, workplaceId: string, areaId: string, shiftId: string, staff: AssignedContractStaff[]) {
  return mapShifts(contract, workplaceId, areaId, shiftId, (shift) => ({ ...shift, assignedStaff: staff }));
}

function getWorkerAvailability(worker: Worker, currentContract: ServiceContract, contracts: ServiceContract[], targetShift?: ContractShift) {
  if (!worker._id) return { blocked: true, reason: "No disponible: trabajador sin identificador." };
  if (worker.status !== "active") return { blocked: true, reason: "No disponible: estado inactivo." };
  if (!targetShift) return { blocked: true, reason: "Selecciona un horario valido." };
  const alreadyAssigned = targetShift.assignedStaff.some((staff) => staff.workerId === worker._id && staff.assignmentStatus === "active");
  if (alreadyAssigned) return { blocked: true, reason: "No disponible: ya esta asignado a este horario." };
  const conflict = findWorkerScheduleConflict(currentContract, contracts, worker._id, targetShift);
  if (conflict) return { blocked: true, reason: `No disponible: horario cruzado con ${conflict.shiftName} en ${conflict.contractName}.` };
  return { blocked: false, reason: "" };
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

function printKit(kit: SupplyKit) {
  const rows = (kit.items || [])
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.productCode || "")}</td>
        <td>${escapeHtml(item.productName || "")}</td>
        <td>${escapeHtml(item.productCategory || "")}</td>
        <td>${escapeHtml(`${item.quantity || 0} ${item.unit || ""}`)}</td>
      </tr>
    `)
    .join("");
  const total = (kit.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(kit.kitCode || "Kit de insumos mensual")}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f2742; margin: 32px; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          p { margin: 4px 0; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 22px 0; font-size: 13px; }
          .box { border: 1px solid #cbd5e1; padding: 10px; }
          .label { display: block; color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          table { border-collapse: collapse; width: 100%; margin-top: 18px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; color: #173C61; text-transform: uppercase; font-size: 10px; }
          .total { margin-top: 12px; font-weight: 700; text-align: right; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 82px; }
          .signature { text-align: center; font-size: 12px; }
          .line { border-top: 1px solid #0f2742; margin-bottom: 8px; }
          @media print { body { margin: 18mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Kit de insumos mensual</h1>
        <p><strong>Codigo:</strong> ${escapeHtml(kit.kitCode || "Sin codigo")}</p>
        <p><strong>Frecuencia:</strong> Mensual</p>
        <section class="meta">
          <div class="box"><span class="label">Cliente</span>${escapeHtml(kit.clientName || "")}</div>
          <div class="box"><span class="label">Contrato</span>${escapeHtml(kit.contractName || kit.clientName || "")}</div>
          <div class="box"><span class="label">Lugar de trabajo</span>${escapeHtml(kit.workplaceName || "")}</div>
          <div class="box"><span class="label">Supervisor</span>${escapeHtml(kit.supervisorName || "")}</div>
        </section>
        <table>
          <thead>
            <tr><th>Orden</th><th>Codigo</th><th>Nombre de producto</th><th>Tipo</th><th>Cantidad</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5">Sin insumos registrados.</td></tr>'}</tbody>
        </table>
        <p class="total">Total referencial: ${escapeHtml(String(total))}</p>
        ${kit.notes ? `<p><strong>Observaciones:</strong> ${escapeHtml(kit.notes)}</p>` : ""}
        <section class="signatures">
          <div class="signature"><div class="line"></div>Supervisor</div>
          <div class="signature"><div class="line"></div>Auxiliar de limpieza</div>
          <div class="signature"><div class="line"></div>Quien recibe</div>
        </section>
        <script>window.print();</script>
      </body>
    </html>
  `;
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

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
