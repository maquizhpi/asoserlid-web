"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, ServiceContract, SupplyKit, SupplyKitItem, SupplyProduct } from "@/types/admin";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
const buttonClass = "rounded-md bg-[#173C61] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2d49]";
const secondaryButtonClass = "rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#173C61] transition hover:bg-slate-50";
const dangerButtonClass = "rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50";

const emptyKit: SupplyKit = {
  clientId: "",
  clientName: "",
  contractId: "",
  contractName: "",
  workplaceId: "",
  workplaceName: "",
  productName: "Kit mensual",
  items: [],
  quantity: 0,
  frequency: "Mensual",
  kitPeriod: new Date().toISOString().slice(0, 7),
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
  clientId?: string;
  clientName: string;
};

export default function SupplyKitsPage() {
  const [kits, setKits] = useState<SupplyKit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<SupplyKit>(emptyKit);
  const [itemForm, setItemForm] = useState<SupplyKitItem>(emptyKitItem);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    const [kitsRes, clientsRes, contractsRes, productsRes] = await Promise.all([
      fetch("/api/admin/supply-kits", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
      fetch("/api/admin/supply-products", { cache: "no-store" }),
    ]);

    const [kitsData, clientsData, contractsData, productsData] = await Promise.all([
      kitsRes.json().catch(() => ({})),
      clientsRes.json().catch(() => ({})),
      contractsRes.json().catch(() => ({})),
      productsRes.json().catch(() => ({})),
    ]);

    if (kitsRes.ok) setKits((kitsData.items || []).map(normalizeKit));
    if (clientsRes.ok) setClients(clientsData.items || []);
    if (contractsRes.ok) setContracts(contractsData.items || []);
    if (productsRes.ok) setProducts(productsData.items || []);
    if (!kitsRes.ok || !clientsRes.ok || !contractsRes.ok || !productsRes.ok) {
      setStatus("No se pudo cargar toda la informacion de kits, clientes, contratos o productos.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          clientId: contract.clientId,
          clientName: contract.clientName,
        }))
      )
      .filter((option) => !selectedClientKey || option.clientId === selectedClientKey || option.clientName === form.clientName);
  }, [contracts, form.clientId, form.clientName]);

  const totalItems = useMemo(() => (form.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), [form.items]);

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
    setForm(emptyKit);
    setItemForm(emptyKitItem);
    setStatus(null);
  }

  function selectKit(kit: SupplyKit) {
    setSelectedId(kit._id || "new");
    setForm({ ...emptyKit, ...normalizeKit(kit) });
    setItemForm(emptyKitItem);
  }

  function addItemToKit() {
    if (!itemForm.productName || Number(itemForm.quantity) <= 0) {
      setStatus("Selecciona un insumo y una cantidad mayor a cero.");
      return;
    }

    const exists = (form.items || []).some((item) => (item.productId || item.productCode) === (itemForm.productId || itemForm.productCode));
    if (exists) {
      setStatus("Ese insumo ya esta agregado al kit. Puedes quitarlo y volver a agregarlo con otra cantidad.");
      return;
    }

    const nextItems = [...(form.items || []), { ...itemForm, id: crypto.randomUUID() }];
    setForm({ ...form, items: nextItems, quantity: nextItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), productName: `${nextItems.length} insumo(s)` });
    setItemForm(emptyKitItem);
    setStatus(null);
  }

  function removeItem(itemId: string) {
    const nextItems = (form.items || []).filter((item) => item.id !== itemId);
    setForm({ ...form, items: nextItems, quantity: nextItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), productName: nextItems.length ? `${nextItems.length} insumo(s)` : "Kit mensual" });
  }

  async function saveKit(event: FormEvent) {
    event.preventDefault();

    if (!form.clientName || !form.workplaceName) {
      setStatus("Selecciona el cliente y el lugar de trabajo.");
      return;
    }

    if (!(form.items || []).length) {
      setStatus("Agrega al menos un insumo al kit.");
      return;
    }

    setStatus("Guardando kit...");
    const payload = {
      ...form,
      productName: `${form.items?.length || 0} insumo(s)`,
      quantity: totalItems,
    };
    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/supply-kits" : `/api/admin/supply-kits/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el kit.");
      return;
    }

    setStatus("Kit guardado correctamente.");
    await loadData();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteKit() {
    if (selectedId === "new") return;
    if (!window.confirm("Eliminar este kit de insumos?")) return;

    const res = await fetch(`/api/admin/supply-kits/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el kit.");
      return;
    }

    setStatus("Kit eliminado.");
    newKit();
    await loadData();
  }

  return (
    <SystemModulePage moduleKey="supply-kits">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-[#173C61]">{status}</p>}

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
                  {kit.workplaceName || "Sin lugar"} - {kit.kitPeriod || "Sin periodo"} - {(kit.items || []).length} insumo(s)
                </span>
              </button>
            ))}
            {visibleKits.length === 0 && <p className="rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-500">Sin kits registrados.</p>}
          </div>
        </section>

        <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={saveKit}>
          <div className="grid gap-4 lg:grid-cols-2">
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
                }));
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
                }));
              }}
            />

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Periodo mensual
              <input className={inputClass} type="month" value={form.kitPeriod || ""} onChange={(event) => setForm({ ...form, kitPeriod: event.target.value })} />
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
                    <th className="px-3 py-2">Insumo</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.items || []).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-[#173C61]">{item.productCode}</td>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2">{item.productCategory}</td>
                      <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="font-bold text-red-600" onClick={() => removeItem(item.id)}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                  {(form.items || []).length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>Agrega insumos para armar este kit mensual.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

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
  if (kit.items?.length) return kit;
  if (!kit.productName) return { ...kit, items: [] };

  return {
    ...kit,
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
