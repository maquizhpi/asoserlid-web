"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, SupplyKit, SupplyMovement, SupplyProduct } from "@/types/admin";

const emptyItem: SupplyMovement = {
  clientId: "",
  clientName: "",
  productName: "",
  deliveredQuantity: 0,
  consumedQuantity: 0,
  pendingQuantity: 0,
  movementDate: new Date().toISOString().slice(0, 10),
  responsible: "",
  notes: "",
};

export default function SupplyControlPage() {
  const [movements, setMovements] = useState<SupplyMovement[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [kits, setKits] = useState<SupplyKit[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<SupplyMovement>(emptyItem);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const delivered = Number(form.deliveredQuantity || 0);
    const consumed = Number(form.consumedQuantity || 0);
    setForm((current) => ({ ...current, pendingQuantity: Math.max(delivered - consumed, 0) }));
  }, [form.deliveredQuantity, form.consumedQuantity]);

  async function loadData() {
    const [movementsRes, clientsRes, productsRes, kitsRes] = await Promise.all([
      fetch("/api/admin/supply-movements", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/supply-products", { cache: "no-store" }),
      fetch("/api/admin/supply-kits", { cache: "no-store" }),
    ]);
    const [movementsData, clientsData, productsData, kitsData] = await Promise.all([
      movementsRes.json().catch(() => ({})),
      clientsRes.json().catch(() => ({})),
      productsRes.json().catch(() => ({})),
      kitsRes.json().catch(() => ({})),
    ]);

    if (movementsRes.ok) setMovements(movementsData.items || []);
    if (clientsRes.ok) setClients((clientsData.items || []).map((client: Client) => ({ value: client._id || client.name, label: client.name })));
    if (productsRes.ok) setProducts((productsData.items || []).map((product: SupplyProduct) => ({ value: product._id || product.name, label: product.name })));
    if (kitsRes.ok) setKits(kitsData.items || []);
    if (!movementsRes.ok || !clientsRes.ok || !productsRes.ok || !kitsRes.ok) {
      setStatus(movementsData.error || clientsData.error || productsData.error || kitsData.error || "No se pudo cargar toda la informacion.");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return movements;
    return movements.filter((movement) =>
      [movement.clientName, movement.productName, movement.responsible]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [movements, search]);

  const balances = useMemo(() => {
    const map = new Map<string, { clientName: string; productName: string; delivered: number; consumed: number; pending: number; expected: number }>();
    movements.forEach((movement) => {
      const key = `${movement.clientName}::${movement.productName}`;
      const current = map.get(key) || {
        clientName: movement.clientName,
        productName: movement.productName,
        delivered: 0,
        consumed: 0,
        pending: 0,
        expected: expectedKitQuantity(kits, movement.clientName, movement.productName),
      };
      current.delivered += Number(movement.deliveredQuantity || 0);
      current.consumed += Number(movement.consumedQuantity || 0);
      current.pending = Math.max(current.delivered - current.consumed, 0);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => `${a.clientName}${a.productName}`.localeCompare(`${b.clientName}${b.productName}`));
  }, [kits, movements]);

  function startNew() {
    setSelectedId("new");
    setForm(emptyItem);
  }

  function selectMovement(movement: SupplyMovement) {
    setSelectedId(movement._id || "new");
    setForm(movement);
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando movimiento...");
    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/supply-movements" : `/api/admin/supply-movements/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar.");
      return;
    }
    setStatus("Movimiento guardado correctamente.");
    await loadData();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteItem() {
    if (selectedId === "new") return;
    if (!window.confirm("Eliminar este movimiento?")) return;
    const res = await fetch(`/api/admin/supply-movements/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar.");
      return;
    }
    setStatus("Movimiento eliminado.");
    startNew();
    await loadData();
  }

  return (
    <SystemModulePage moduleKey="supply-control">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={startNew} className="w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
            Nueva entrega / consumo
          </button>
          <input className={`${inputClass} mt-4`} placeholder="Buscar por cliente, producto o responsable..." value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="mt-4 space-y-2">
            {visible.map((movement) => (
              <button
                key={movement._id}
                onClick={() => selectMovement(movement)}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedId === movement._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{movement.clientName}</span>
                <span className="mt-1 block text-xs text-slate-500">{movement.productName} | saldo {formatNumber(movement.pendingQuantity)}</span>
              </button>
            ))}
            {visible.length === 0 && <p className="rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-500">Sin movimientos.</p>}
          </div>
        </aside>

        <form onSubmit={saveItem} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input type="date" required className={inputClass} value={form.movementDate} onChange={(e) => setForm({ ...form, movementDate: e.target.value })} />
            </Field>
            <SearchableSelect
              label="Cliente"
              value={form.clientId || ""}
              options={clients}
              placeholder="Buscar cliente..."
              onChange={(option) => setForm({ ...form, clientId: option?.value || "", clientName: option?.label || "" })}
            />
            <SearchableSelect
              label="Producto / insumo"
              value={products.find((option) => option.label === form.productName)?.value || ""}
              options={products}
              placeholder="Buscar insumo..."
              onChange={(option) => setForm({ ...form, productName: option?.label || "" })}
            />
            <Field label="Responsable">
              <input required className={inputClass} value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
            </Field>
            <Field label="Entregado">
              <input type="number" min="0" step="0.01" required className={inputClass} value={form.deliveredQuantity} onChange={(e) => setForm({ ...form, deliveredQuantity: Number(e.target.value) })} />
            </Field>
            <Field label="Consumido">
              <input type="number" min="0" step="0.01" required className={inputClass} value={form.consumedQuantity} onChange={(e) => setForm({ ...form, consumedQuantity: Number(e.target.value) })} />
            </Field>
            <Field label="Saldo calculado">
              <input readOnly className={`${inputClass} bg-slate-100 font-bold text-[#173C61]`} value={formatNumber(form.pendingQuantity)} />
            </Field>
            <Field label="Kit mensual esperado">
              <input readOnly className={`${inputClass} bg-slate-100 text-slate-600`} value={formatNumber(expectedKitQuantity(kits, form.clientName, form.productName))} />
            </Field>
          </div>
          <Field label="Observaciones">
            <textarea className={`${inputClass} mt-4 min-h-28`} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar movimiento</button>
            {selectedId !== "new" && <button type="button" onClick={deleteItem} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>}
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Cliente</span>
          <span>Producto</span>
          <span>Kit</span>
          <span>Entregado</span>
          <span>Consumido</span>
          <span>Saldo</span>
        </div>
        {balances.map((item) => (
          <div key={`${item.clientName}-${item.productName}`} className="grid grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-[#173C61]">{item.clientName}</span>
            <span>{item.productName}</span>
            <span>{formatNumber(item.expected)}</span>
            <span>{formatNumber(item.delivered)}</span>
            <span>{formatNumber(item.consumed)}</span>
            <span className={`font-bold ${item.pending <= item.expected * 0.2 ? "text-amber-700" : "text-[#173C61]"}`}>{formatNumber(item.pending)}</span>
          </div>
        ))}
        {balances.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">Registra entregas o consumos para ver saldos por cliente.</p>}
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function expectedKitQuantity(kits: SupplyKit[], clientName: string, productName: string) {
  if (!clientName || !productName) return 0;
  return kits
    .filter((kit) => kit.status !== "inactive" && kit.clientName === clientName)
    .flatMap((kit) => kit.items?.length ? kit.items : [{ productName: kit.productName, quantity: kit.quantity }])
    .filter((item) => item.productName === productName)
    .reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}
