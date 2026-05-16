"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import { confirmSystem, notifySystem } from "@/components/system/SystemNotifier";
import type { Client, ServiceContract, SupplyKit, SupplyKitDelivery, SupplyKitDeliveryItem, SupplyKitItem, SupplyProduct } from "@/types/admin";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
const buttonClass = "rounded-md bg-[#173C61] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2d49]";
const secondaryButtonClass = "rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#173C61] transition hover:bg-slate-50";
const dangerButtonClass = "rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50";

const emptyKit: SupplyKit = {
  kitCode: "",
  clientId: "",
  clientName: "",
  contractId: "",
  contractName: "",
  workplaceId: "",
  workplaceName: "",
  supervisorId: "",
  supervisorName: "",
  productName: "Kit mensual",
  items: [],
  quantity: 0,
  frequency: "Mensual",
  kitPeriod: "",
  notes: "",
  status: "active",
};

const emptyKitItem: SupplyKitItem = {
  id: "",
  productId: "",
  productCode: "",
  productName: "",
  productCategory: "",
  unit: "",
  quantity: 1,
  notes: "",
};

type WorkplaceOption = {
  value: string;
  label: string;
  contractId: string;
  contractName: string;
  workplaceId: string;
  workplaceName: string;
  supervisorId?: string;
  supervisorName?: string;
  clientId?: string;
  clientName: string;
};

export default function SupplyKitsPage() {
  const [kits, setKits] = useState<SupplyKit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [deliveries, setDeliveries] = useState<SupplyKitDelivery[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<SupplyKit>(emptyKit);
  const [itemForm, setItemForm] = useState<SupplyKitItem>(emptyKitItem);
  const [deliveryItemForm, setDeliveryItemForm] = useState<SupplyKitItem>(emptyKitItem);
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth());
  const [selectedReceiverId, setSelectedReceiverId] = useState("");
  const [contractAdministratorName, setContractAdministratorName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    const [kitsRes, clientsRes, contractsRes, productsRes, deliveriesRes] = await Promise.all([
      fetch("/api/admin/supply-kits", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
      fetch("/api/admin/supply-products", { cache: "no-store" }),
      fetch("/api/admin/supply-kit-deliveries", { cache: "no-store" }),
    ]);

    const [kitsData, clientsData, contractsData, productsData, deliveriesData] = await Promise.all([
      kitsRes.json().catch(() => ({})),
      clientsRes.json().catch(() => ({})),
      contractsRes.json().catch(() => ({})),
      productsRes.json().catch(() => ({})),
      deliveriesRes.json().catch(() => ({})),
    ]);

    if (kitsRes.ok) setKits((kitsData.items || []).map(normalizeKit));
    if (clientsRes.ok) setClients(clientsData.items || []);
    if (contractsRes.ok) setContracts(contractsData.items || []);
    if (productsRes.ok) setProducts(productsData.items || []);
    if (deliveriesRes.ok) setDeliveries(deliveriesData.items || []);
    if (!kitsRes.ok || !clientsRes.ok || !contractsRes.ok || !productsRes.ok || !deliveriesRes.ok) {
      notifySystem("No se pudo cargar toda la informacion de kits, clientes, contratos o productos.", { tone: "error" });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contractId = params.get("contractId");
    const workplaceId = params.get("workplaceId");
    if (!contractId || !workplaceId || !contracts.length) return;

    const existing = kits.find((kit) => kit.contractId === contractId && kit.workplaceId === workplaceId);
    if (existing) {
      selectKit(existing);
      return;
    }

    const workplace = getWorkplaceOption(contracts, contractId, workplaceId);
    if (!workplace) return;
    setSelectedId("new");
    setForm({
      ...emptyKit,
      kitCode: buildKitCode(workplace.clientName, workplace.workplaceName),
      clientId: workplace.clientId || "",
      clientName: workplace.clientName,
      contractId: workplace.contractId,
      contractName: workplace.contractName,
      workplaceId: workplace.workplaceId,
      workplaceName: workplace.workplaceName,
      supervisorId: workplace.supervisorId || "",
      supervisorName: workplace.supervisorName || "",
    });
  }, [contracts, kits]);

  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client._id || client.name, label: `${client.name} (${client.taxId})` })),
    [clients]
  );

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product._id || product.code, label: `${product.code} - ${product.name} | ${product.category}` })),
    [products]
  );

  const workplaceOptions = useMemo<WorkplaceOption[]>(() => {
    const selectedClientKey = form.clientId || form.clientName;
    return contracts
      .flatMap((contract) =>
        (contract.workplaces || []).map((workplace) => ({
          value: `${contract._id || contract.clientName}-${workplace.id}`,
          label: `${contract.clientName} / ${workplace.name}`,
          contractId: contract._id || "",
          contractName: `${contract.clientName} - ${contract.serviceType}`,
          workplaceId: workplace.id,
          workplaceName: workplace.name,
          supervisorId: workplace.supervisorId,
          supervisorName: workplace.supervisorName,
          clientId: contract.clientId,
          clientName: contract.clientName,
        }))
      )
      .filter((option) => !selectedClientKey || option.clientId === selectedClientKey || option.clientName === form.clientName);
  }, [contracts, form.clientId, form.clientName]);

  const totalItems = useMemo(() => (form.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), [form.items]);
  const selectedDelivery = useMemo(
    () => deliveries.find((delivery) => delivery.kitId === selectedId && delivery.period === selectedPeriod),
    [deliveries, selectedId, selectedPeriod]
  );
  const workplaceStaff = useMemo(() => getWorkplaceStaff(contracts, form.contractId || "", form.workplaceId || ""), [contracts, form.contractId, form.workplaceId]);
  const selectedReceiver = useMemo(() => workplaceStaff.find((staff) => staff.workerId === selectedReceiverId), [selectedReceiverId, workplaceStaff]);
  const globalStats = useMemo(() => buildDeliveryStats(deliveries), [deliveries]);

  useEffect(() => {
    if (!workplaceStaff.length) {
      setSelectedReceiverId("");
      return;
    }
    if (selectedReceiverId && workplaceStaff.some((staff) => staff.workerId === selectedReceiverId)) return;
    const auxiliary = workplaceStaff.find((staff) => staff.position.toLowerCase().includes("auxiliar"));
    setSelectedReceiverId((auxiliary || workplaceStaff[0]).workerId);
  }, [selectedReceiverId, workplaceStaff]);

  const visibleKits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return kits.filter((kit) => {
      const itemsText = (kit.items || []).map((item) => `${item.productCode} ${item.productName}`).join(" ");
      const text = [kit.clientName, kit.workplaceName, kit.productName, itemsText, kit.frequency, kit.kitPeriod].join(" ").toLowerCase();
      return (!term || text.includes(term)) && (!statusFilter || kit.status === statusFilter);
    });
  }, [kits, search, statusFilter]);

  function newKit() {
    setSelectedId("new");
    setForm({ ...emptyKit, kitCode: buildKitCode() });
    setSelectedReceiverId("");
    setContractAdministratorName("");
    setItemForm(emptyKitItem);
    setDeliveryItemForm(emptyKitItem);
  }

  function selectKit(kit: SupplyKit) {
    setSelectedId(kit._id || "new");
    setForm({ ...emptyKit, ...normalizeKit(kit) });
    setContractAdministratorName("");
    setItemForm(emptyKitItem);
    setDeliveryItemForm(emptyKitItem);
  }

  function addItemToKit() {
    if (!itemForm.productName || Number(itemForm.quantity) <= 0) {
      notifySystem("Selecciona un insumo y una cantidad mayor a cero.", { tone: "warning" });
      return;
    }

    const exists = (form.items || []).some((item) => (item.productId || item.productCode) === (itemForm.productId || itemForm.productCode));
    if (exists) {
      notifySystem("Ese insumo ya esta agregado al kit. Puedes quitarlo y volver a agregarlo con otra cantidad.", { tone: "warning" });
      return;
    }

    const nextItems = [...(form.items || []), { ...itemForm, id: crypto.randomUUID() }];
    setForm({ ...form, items: nextItems, quantity: nextItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), productName: `${nextItems.length} insumo(s)` });
    setItemForm(emptyKitItem);
  }

  function removeItem(itemId: string) {
    const nextItems = (form.items || []).filter((item) => item.id !== itemId);
    setForm({ ...form, items: nextItems, quantity: nextItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), productName: nextItems.length ? `${nextItems.length} insumo(s)` : "Kit mensual" });
  }

  async function saveKit(event: FormEvent) {
    event.preventDefault();

    if (!form.clientName || !form.workplaceName) {
      notifySystem("Selecciona el cliente y el lugar de trabajo.", { tone: "warning" });
      return;
    }

    if (!(form.items || []).length) {
      notifySystem("Agrega al menos un insumo al kit.", { tone: "warning" });
      return;
    }

    notifySystem("Guardando kit mensual...", { tone: "info" });
    const payload = {
      ...form,
      kitCode: form.kitCode || buildKitCode(form.clientName, form.workplaceName),
      productName: `${form.items?.length || 0} insumo(s)`,
      quantity: totalItems,
      frequency: "Mensual",
      kitPeriod: "",
    };
    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/supply-kits" : `/api/admin/supply-kits/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      notifySystem(data.error || "No se pudo guardar el kit.", { tone: "error" });
      return;
    }

    notifySystem("Kit de insumos mensual guardado correctamente.", { tone: "success" });
    await loadData();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteKit() {
    if (selectedId === "new") return;
    const confirmed = await confirmSystem("Vas a eliminar este kit de insumos mensual. Esta accion no se puede deshacer.", {
      tone: "warning",
      confirmLabel: "Eliminar kit",
    });
    if (!confirmed) return;

    const res = await fetch(`/api/admin/supply-kits/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo eliminar el kit.", { tone: "error" });
      return;
    }

    notifySystem("Kit eliminado correctamente.", { tone: "success" });
    newKit();
    await loadData();
  }

  async function generateMonthlyDelivery() {
    if (selectedId === "new" || !form._id) {
      notifySystem("Primero guarda o selecciona un kit mensual.", { tone: "warning" });
      return;
    }
    if (selectedDelivery) {
      notifySystem("Ya existe un registro para este mes. Puedes agregar insumos extra en ese registro.", { tone: "warning" });
      return;
    }
    const baseItems: SupplyKitDeliveryItem[] = (form.items || []).map((item) => ({ ...item, id: crypto.randomUUID(), source: "base" }));
    const payload: SupplyKitDelivery = {
      kitId: form._id,
      kitCode: form.kitCode,
      period: selectedPeriod,
      clientId: form.clientId,
      clientName: form.clientName,
      contractId: form.contractId,
      contractName: form.contractName,
      workplaceId: form.workplaceId,
      workplaceName: form.workplaceName,
      supervisorId: form.supervisorId,
      supervisorName: form.supervisorName,
      items: baseItems,
      totalQuantity: sumDeliveryItems(baseItems),
      responsible: form.supervisorName,
      deliveryDate: new Date().toISOString().slice(0, 10),
      notes: form.notes,
      status: "delivered",
    };
    notifySystem("Generando registro mensual...", { tone: "info" });
    const res = await fetch("/api/admin/supply-kit-deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo generar el registro mensual.", { tone: "error" });
      return;
    }
    notifySystem("Registro mensual generado correctamente.", { tone: "success" });
    await loadData();
  }

  async function addExtraToDelivery() {
    if (!selectedDelivery?._id) {
      notifySystem("Primero genera el registro mensual de este kit.", { tone: "warning" });
      return;
    }
    if (!deliveryItemForm.productName || Number(deliveryItemForm.quantity) <= 0) {
      notifySystem("Selecciona un insumo extra y una cantidad mayor a cero.", { tone: "warning" });
      return;
    }
    const nextItems: SupplyKitDeliveryItem[] = [...(selectedDelivery.items || []), { ...deliveryItemForm, id: crypto.randomUUID(), source: "extra" }];
    const payload: SupplyKitDelivery = {
      ...selectedDelivery,
      items: nextItems,
      totalQuantity: sumDeliveryItems(nextItems),
    };
    const res = await fetch(`/api/admin/supply-kit-deliveries/${selectedDelivery._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo agregar el insumo extra.", { tone: "error" });
      return;
    }
    notifySystem("Insumo extra agregado al registro mensual.", { tone: "success" });
    setDeliveryItemForm(emptyKitItem);
    await loadData();
  }

  function printConsolidatedReport() {
    const html = buildConsolidatedReport(deliveries, selectedPeriod);
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  function printMonthlyReport() {
    if (!selectedDelivery) {
      notifySystem("No existe registro mensual para el mes visible.", { tone: "warning" });
      return;
    }
    const html = buildMonthlyReport(selectedDelivery, {
      auxiliaryName: selectedReceiver ? `${selectedReceiver.firstName} ${selectedReceiver.lastName}` : "",
      supervisorName: form.supervisorName || selectedDelivery.supervisorName || "",
      contractAdministratorName,
    });
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  return (
    <SystemModulePage moduleKey="supply-kits">
      <section className="mb-5 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Kits activos" value={String(kits.filter((kit) => kit.status === "active").length)} />
        <SummaryCard label="Registros mensuales" value={String(globalStats.deliveryCount)} />
        <SummaryCard label="Entregado este mes" value={String(globalStats.currentMonthQuantity)} />
        <SummaryCard label="Insumos extra" value={String(globalStats.extraQuantity)} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[35rem_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button type="button" className={`${buttonClass} mb-4 w-full`} onClick={newKit}>
            Nuevo kit mensual
          </button>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_12rem]">
            <input className={inputClass} placeholder="Buscar por cliente, lugar o insumo..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div className="grid gap-2">
            {visibleKits.map((kit) => (
              <button
                type="button"
                key={kit._id}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  selectedId === kit._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 bg-white hover:border-[#33C3C9]"
                }`}
                onClick={() => selectKit(kit)}
              >
                <strong className="block text-sm text-[#173C61]">{kit.clientName}</strong>
                <span className="text-xs text-slate-600">
                  {kit.kitCode || "Sin codigo"} - {kit.workplaceName || "Sin lugar"} - {(kit.items || []).length} insumo(s)
                </span>
              </button>
            ))}
            {visibleKits.length === 0 && <p className="rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-500">Sin kits registrados.</p>}
          </div>
        </section>

        <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={saveKit}>
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-lg font-bold text-[#173C61]">Detalle del kit mensual</h2>
              <p className="text-xs font-semibold text-slate-500">Mes visible: {selectedPeriod}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Mes
                <input className={inputClass} type="month" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} />
              </label>
              <button className={secondaryButtonClass} type="button" onClick={printConsolidatedReport}>Reporte consolidado</button>
              <button className={secondaryButtonClass} type="button" onClick={printMonthlyReport}>Reporte mensual</button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Codigo del kit
              <input className={inputClass} value={form.kitCode || ""} onChange={(event) => setForm({ ...form, kitCode: event.target.value.toUpperCase() })} placeholder="KIT-MENSUAL-001" />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Frecuencia
              <input className={inputClass} value="Mensual" readOnly />
            </label>

            <SearchableSelect
              label="Cliente"
              value={form.clientId || form.clientName}
              options={clientOptions}
              placeholder="Buscar cliente..."
              onChange={(option) => {
                const client = clients.find((item) => (item._id || item.name) === option?.value);
                setForm((current) => ({
                  ...current,
                  clientId: client?._id || "",
                  clientName: client?.name || "",
                  contractId: "",
                  contractName: "",
                  workplaceId: "",
                  workplaceName: "",
                  supervisorId: "",
                  supervisorName: "",
                  kitCode: selectedId === "new" ? buildKitCode(client?.name || "") : current.kitCode,
                }));
                setSelectedReceiverId("");
                setContractAdministratorName("");
              }}
            />

            <SearchableSelect
              label="Lugar de trabajo"
              value={form.workplaceId ? `${form.contractId || form.clientName}-${form.workplaceId}` : ""}
              options={workplaceOptions}
              placeholder="Buscar lugar de trabajo..."
              onChange={(option) => {
                const workplace = workplaceOptions.find((item) => item.value === option?.value);
                setForm((current) => ({
                  ...current,
                  clientId: workplace?.clientId || current.clientId,
                  clientName: workplace?.clientName || current.clientName,
                  contractId: workplace?.contractId || "",
                  contractName: workplace?.contractName || "",
                  workplaceId: workplace?.workplaceId || "",
                  workplaceName: workplace?.workplaceName || "",
                  supervisorId: workplace?.supervisorId || "",
                  supervisorName: workplace?.supervisorName || "",
                  kitCode: selectedId === "new" ? buildKitCode(workplace?.clientName || current.clientName, workplace?.workplaceName || "") : current.kitCode,
                }));
                setSelectedReceiverId("");
                setContractAdministratorName("");
              }}
            />

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Responsable del lugar
              <input className={inputClass} value={form.supervisorName || "Sin responsable asignado"} readOnly />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Auxiliar de limpieza que recibe
              <select className={inputClass} value={selectedReceiverId} onChange={(event) => setSelectedReceiverId(event.target.value)}>
                <option value="">Selecciona auxiliar...</option>
                {workplaceStaff.map((staff) => (
                  <option key={`${staff.workerId}-${staff.id}`} value={staff.workerId}>
                    {staff.firstName} {staff.lastName} - {staff.position}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Administrador de contrato
              <input className={inputClass} value={contractAdministratorName} onChange={(event) => setContractAdministratorName(event.target.value)} placeholder="Nombre del administrador de contrato" />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Estado
              <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SupplyKit["status"] })}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>

          <section className="mt-5 rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#173C61]">Lista de insumos del kit</h3>
                <p className="text-xs font-semibold text-slate-500">Total referencial: {totalItems}</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_8rem_auto]">
              <SearchableSelect
                label="Producto disponible"
                value={itemForm.productId || itemForm.productCode || itemForm.productName}
                options={productOptions}
                placeholder="Buscar insumo..."
                onChange={(option) => {
                  const product = products.find((item) => (item._id || item.code) === option?.value);
                  setItemForm({
                    ...emptyKitItem,
                    productId: product?._id || "",
                    productCode: product?.code || "",
                    productCategory: product?.category || "",
                    unit: product?.unit || "",
                    productName: product?.name || "",
                  });
                }}
              />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Cantidad
                <input className={inputClass} type="number" min="0.01" step="0.01" value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: Number(event.target.value) })} />
              </label>
              <div className="flex items-end">
                <button className={buttonClass} type="button" onClick={addItemToKit}>Agregar</button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Codigo</th>
                    <th className="px-3 py-2">Nombre de producto</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Observaciones</th>
                    <th className="px-3 py-2 text-right">Quitar</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.items || []).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-[#173C61]">{item.productCode}</td>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2">{item.productCategory}</td>
                      <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2">{item.notes || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="font-bold text-red-600" onClick={() => removeItem(item.id)}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                  {(form.items || []).length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-500" colSpan={6}>Agrega insumos para armar este kit mensual.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <details className="mt-5 rounded-lg border border-slate-200 p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div>
                  <h3 className="font-bold text-[#173C61]">Registro mensual de entrega</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {selectedDelivery ? `Generado | Total ${selectedDelivery.totalQuantity} | Extras ${(selectedDelivery.items || []).filter((item) => item.source === "extra").reduce((sum, item) => sum + Number(item.quantity || 0), 0)}` : "Pendiente de generar para el mes visible"}
                  </p>
                </div>
                <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#173C61]">Ver / ocultar</span>
              </div>
            </summary>

            <div className="mt-4">
              <div className="mb-4 flex justify-end">
                  <button className={buttonClass} type="button" onClick={generateMonthlyDelivery}>
                    {selectedDelivery ? "Registro ya generado" : "Generar registro mensual"}
                  </button>
                </div>

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <SummaryCard label="Estado del mes" value={selectedDelivery ? "Generado" : "Pendiente"} />
                <SummaryCard label="Total entregado" value={String(selectedDelivery?.totalQuantity || 0)} />
                <SummaryCard label="Extras del mes" value={String((selectedDelivery?.items || []).filter((item) => item.source === "extra").reduce((sum, item) => sum + Number(item.quantity || 0), 0))} />
              </div>

              {selectedDelivery ? (
                <>
                <div className="grid gap-3 lg:grid-cols-[1fr_8rem_1fr_auto]">
                  <SearchableSelect
                    label="Insumo adicional"
                    value={deliveryItemForm.productId || deliveryItemForm.productCode || deliveryItemForm.productName}
                    options={productOptions}
                    placeholder="Buscar insumo extra..."
                    onChange={(option) => {
                      const product = products.find((item) => (item._id || item.code) === option?.value);
                      setDeliveryItemForm({
                        ...emptyKitItem,
                        productId: product?._id || "",
                        productCode: product?.code || "",
                        productCategory: product?.category || "",
                        unit: product?.unit || "",
                        productName: product?.name || "",
                      });
                    }}
                  />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Cantidad
                    <input className={inputClass} type="number" min="0.01" step="0.01" value={deliveryItemForm.quantity} onChange={(event) => setDeliveryItemForm({ ...deliveryItemForm, quantity: Number(event.target.value) })} />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Observacion
                    <input className={inputClass} value={deliveryItemForm.notes || ""} onChange={(event) => setDeliveryItemForm({ ...deliveryItemForm, notes: event.target.value })} />
                  </label>
                  <div className="flex items-end">
                    <button className={buttonClass} type="button" onClick={addExtraToDelivery}>Nuevo registro extra</button>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Origen</th>
                        <th className="px-3 py-2">Codigo</th>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDelivery.items || []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold">{item.source === "extra" ? "Extra" : "Kit base"}</td>
                          <td className="px-3 py-2 font-semibold text-[#173C61]">{item.productCode}</td>
                          <td className="px-3 py-2">{item.productName}</td>
                          <td className="px-3 py-2">{item.productCategory}</td>
                          <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2">{item.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Todavia no existe registro para {selectedPeriod}. Al generarlo se copia el kit mensual actual y queda guardado como entrega del mes.
                </p>
              )}
            </div>
          </details>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Observaciones
            <textarea className={inputClass} rows={3} value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className={buttonClass} type="submit">Guardar kit</button>
            <button className={secondaryButtonClass} type="button" onClick={newKit}>Limpiar</button>
            {selectedId !== "new" && <button className={dangerButtonClass} type="button" onClick={deleteKit}>Eliminar</button>}
          </div>
        </form>
      </div>
    </SystemModulePage>
  );
}

function normalizeKit(kit: SupplyKit): SupplyKit {
  const normalized = { ...emptyKit, ...kit, kitCode: kit.kitCode || buildKitCode(kit.clientName, kit.workplaceName), frequency: "Mensual", kitPeriod: "" };
  if (normalized.items?.length) return normalized;
  if (!kit.productName) return { ...normalized, items: [] };

  return {
    ...normalized,
    items: [
      {
        id: crypto.randomUUID(),
        productId: kit.productId,
        productCode: kit.productCode,
        productName: kit.productName,
        productCategory: kit.productCategory,
        unit: kit.unit,
        quantity: kit.quantity || 1,
      },
    ],
  };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#173C61]">{value}</p>
    </div>
  );
}

function sumDeliveryItems(items: SupplyKitDeliveryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function buildDeliveryStats(deliveries: SupplyKitDelivery[]) {
  const month = currentMonth();
  return {
    deliveryCount: deliveries.length,
    currentMonthQuantity: deliveries
      .filter((delivery) => delivery.period === month && delivery.status !== "cancelled")
      .reduce((sum, delivery) => sum + Number(delivery.totalQuantity || 0), 0),
    extraQuantity: deliveries
      .flatMap((delivery) => delivery.items || [])
      .filter((item) => item.source === "extra")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  };
}

function buildConsolidatedReport(deliveries: SupplyKitDelivery[], period: string) {
  const periodDeliveries = deliveries.filter((delivery) => delivery.period === period && delivery.status !== "cancelled");
  const productMap = new Map<string, { code: string; name: string; category: string; unit: string; base: number; extra: number; total: number; observations: string[] }>();
  for (const delivery of periodDeliveries) {
    for (const item of delivery.items || []) {
      const key = item.productId || item.productCode || item.productName;
      const current = productMap.get(key) || { code: item.productCode || "", name: item.productName, category: item.productCategory || "", unit: item.unit || "", base: 0, extra: 0, total: 0, observations: [] };
      const quantity = Number(item.quantity || 0);
      if (item.source === "extra") current.extra += quantity;
      else current.base += quantity;
      current.total += quantity;
      if (item.notes) current.observations.push(item.notes);
      productMap.set(key, current);
    }
  }
  const rows = Array.from(productMap.values()).map((item) => `
    <tr>
      <td>${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${item.base}</td>
      <td>${item.extra}</td>
      <td>${item.total} ${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(Array.from(new Set(item.observations)).join(" | ") || "-")}</td>
    </tr>
  `).join("");
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte consolidado de kits ${escapeHtml(period)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
          h1 { color: #173C61; margin-bottom: 4px; }
          p { margin-top: 0; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f1f5f9; color: #173C61; text-transform: uppercase; font-size: 11px; }
          .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
          .card { border: 1px solid #cbd5e1; padding: 12px; }
          .value { font-size: 22px; font-weight: bold; color: #173C61; }
        </style>
      </head>
      <body>
        <h1>Reporte consolidado de insumos entregados</h1>
        <p>Periodo: ${escapeHtml(period)} | Registros: ${periodDeliveries.length}</p>
        <section class="cards">
          <div class="card"><strong>Total registros</strong><div class="value">${periodDeliveries.length}</div></div>
          <div class="card"><strong>Total entregado</strong><div class="value">${periodDeliveries.reduce((sum, delivery) => sum + Number(delivery.totalQuantity || 0), 0)}</div></div>
          <div class="card"><strong>Insumos extra</strong><div class="value">${periodDeliveries.flatMap((delivery) => delivery.items || []).filter((item) => item.source === "extra").reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</div></div>
        </section>
        <table>
          <thead><tr><th>Codigo</th><th>Producto</th><th>Tipo</th><th>Kit base</th><th>Extra</th><th>Total</th><th>Observaciones</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7">Sin entregas para este periodo.</td></tr>`}</tbody>
        </table>
        <script>window.print();</script>
      </body>
    </html>
  `;
}

function buildMonthlyReport(delivery: SupplyKitDelivery, signatures: { auxiliaryName?: string; supervisorName?: string; contractAdministratorName?: string }) {
  const rows = (delivery.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.source === "extra" ? "Extra" : "Kit base")}</td>
      <td>${escapeHtml(item.productCode || "")}</td>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.productCategory || "")}</td>
      <td>${item.quantity} ${escapeHtml(item.unit || "")}</td>
      <td>${escapeHtml(item.notes || "-")}</td>
    </tr>
  `).join("");
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte mensual ${escapeHtml(delivery.period)} - ${escapeHtml(delivery.clientName)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
          h1 { color: #173C61; margin-bottom: 4px; }
          p { margin: 4px 0; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; color: #173C61; text-transform: uppercase; font-size: 11px; }
          .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 16px; }
          .box { border: 1px solid #cbd5e1; padding: 10px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 70px; text-align: center; font-size: 12px; }
          .line { border-top: 1px solid #0f172a; padding-top: 6px; min-height: 46px; }
          .name { display: block; min-height: 16px; font-weight: bold; color: #173C61; }
          .role { display: block; margin-top: 4px; color: #334155; }
        </style>
      </head>
      <body>
        <h1>Reporte mensual de kit de insumos</h1>
        <p>Periodo: ${escapeHtml(delivery.period)} | Codigo: ${escapeHtml(delivery.kitCode || "")}</p>
        <section class="meta">
          <div class="box"><strong>Cliente</strong><br />${escapeHtml(delivery.clientName)}</div>
          <div class="box"><strong>Lugar de trabajo</strong><br />${escapeHtml(delivery.workplaceName || "")}</div>
          <div class="box"><strong>Contrato</strong><br />${escapeHtml(delivery.contractName || "")}</div>
          <div class="box"><strong>Responsable</strong><br />${escapeHtml(delivery.responsible || delivery.supervisorName || "")}</div>
          <div class="box"><strong>Fecha entrega</strong><br />${escapeHtml(delivery.deliveryDate || "")}</div>
          <div class="box"><strong>Total entregado</strong><br />${delivery.totalQuantity}</div>
        </section>
        <table>
          <thead><tr><th>Origen</th><th>Codigo</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Observaciones</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6">Sin insumos registrados.</td></tr>`}</tbody>
        </table>
        ${delivery.notes ? `<p><strong>Observaciones generales:</strong> ${escapeHtml(delivery.notes)}</p>` : ""}
        <section class="signatures">
          <div class="line">
            <span class="name">${escapeHtml(signatures.auxiliaryName || "")}</span>
            <span class="role">Auxiliar de limpieza</span>
          </div>
          <div class="line">
            <span class="name">${escapeHtml(signatures.supervisorName || "")}</span>
            <span class="role">Supervisor del lugar</span>
          </div>
          <div class="line">
            <span class="name">${escapeHtml(signatures.contractAdministratorName || "")}</span>
            <span class="role">Administrador de contrato</span>
          </div>
        </section>
        <script>window.print();</script>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getWorkplaceOption(contracts: ServiceContract[], contractId: string, workplaceId: string): WorkplaceOption | null {
  const contract = contracts.find((item) => item._id === contractId);
  const workplace = contract?.workplaces?.find((item) => item.id === workplaceId);
  if (!contract || !workplace) return null;
  return {
    value: `${contract._id || contract.clientName}-${workplace.id}`,
    label: `${contract.clientName} / ${workplace.name}`,
    contractId: contract._id || "",
    contractName: `${contract.clientName} - ${contract.serviceType}`,
    workplaceId: workplace.id,
    workplaceName: workplace.name,
    supervisorId: workplace.supervisorId,
    supervisorName: workplace.supervisorName,
    clientId: contract.clientId,
    clientName: contract.clientName,
  };
}

function getWorkplaceStaff(contracts: ServiceContract[], contractId: string, workplaceId: string) {
  const contract = contracts.find((item) => item._id === contractId);
  const workplace = contract?.workplaces?.find((item) => item.id === workplaceId);
  if (!workplace) return [];
  const staff = (workplace.areas || []).flatMap((area) =>
    (area.shifts || []).flatMap((shift) => shift.assignedStaff || [])
  );
  const unique = new Map<string, (typeof staff)[number]>();
  for (const worker of staff) {
    if (worker.assignmentStatus === "inactive") continue;
    unique.set(worker.workerId, worker);
  }
  return Array.from(unique.values()).sort((a, b) => {
    const aAux = a.position.toLowerCase().includes("auxiliar") ? 0 : 1;
    const bAux = b.position.toLowerCase().includes("auxiliar") ? 0 : 1;
    return aAux - bAux || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });
}

function buildKitCode(clientName = "", workplaceName = "") {
  const seed = `${clientName}-${workplaceName}`.trim();
  const slug = seed
    ? seed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24).toUpperCase()
    : String(Date.now()).slice(-6);
  return `KIT-MEN-${slug}`;
}
