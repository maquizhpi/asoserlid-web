"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { ServiceType } from "@/types/admin";

const emptyService: ServiceType = {
  code: "",
  name: "",
  detail: "",
  activities: "",
  imageUrl: "",
  imagePublicId: "",
  regularPrice: 0,
  discountPercent: 0,
  offerPrice: 0,
  status: "active",
};

export default function ServiceTypesPage() {
  const [items, setItems] = useState<ServiceType[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<ServiceType>(emptyService);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const selected = useMemo(() => items.find((item) => item._id === selectedId), [items, selectedId]);
  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => [item.code, item.name, item.detail, item.activities].join(" ").toLowerCase().includes(term));
  }, [items, search]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    setForm(selected || emptyService);
  }, [selected]);

  async function loadItems() {
    const res = await fetch("/api/admin/service-types", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setItems(data.items || []);
    if (!res.ok) setStatus(data.error || "No se pudo cargar tipos de servicio.");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setStatus("Subiendo imagen referencial...");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "asoserlid/servicios");
      const res = await fetch("/api/admin/cloudinary-upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen.");
      setForm((current) => ({ ...current, imageUrl: data.url, imagePublicId: data.publicId }));
      setStatus("Imagen cargada. Guarda el servicio para conservar el cambio.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando tipo de servicio...");

    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/service-types" : `/api/admin/service-types/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el servicio.");
      return;
    }

    setStatus("Tipo de servicio guardado.");
    await loadItems();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteItem() {
    if (selectedId === "new") return;
    if (!window.confirm("Eliminar este tipo de servicio?")) return;
    const res = await fetch(`/api/admin/service-types/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar.");
      return;
    }
    setStatus("Tipo de servicio eliminado.");
    setSelectedId("new");
    await loadItems();
  }

  return (
    <SystemModulePage moduleKey="service-types">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={() => setSelectedId("new")} className="mb-3 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">Nuevo servicio</button>
          <input className={inputClass} placeholder="Buscar servicio..." value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="mt-4 space-y-2">
            {visibleItems.map((item) => (
              <button
                key={item._id}
                onClick={() => setSelectedId(item._id || "new")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${selectedId === item._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className="block font-semibold text-[#173C61]">{item.name}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.code} - {item.status === "active" ? "Activo" : "Inactivo"}</span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={saveItem} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Codigo de servicio"><input required className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Nombre del servicio"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Precio real"><input type="number" min="0" step="0.01" className={inputClass} value={form.regularPrice || 0} onChange={(e) => setForm({ ...form, regularPrice: Number(e.target.value) })} /></Field>
            <Field label="Descuento %"><input type="number" min="0" step="0.01" className={inputClass} value={form.discountPercent || 0} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} /></Field>
            <Field label="Precio oferta"><input type="number" min="0" step="0.01" className={inputClass} value={form.offerPrice || 0} onChange={(e) => setForm({ ...form, offerPrice: Number(e.target.value) })} /></Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceType["status"] })}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
            <Field label="Detalle del servicio"><textarea required className={`${inputClass} min-h-28`} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></Field>
            <Field label="Actividades del servicio"><textarea required className={`${inputClass} min-h-28`} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Imagen referencial">
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt={form.name} className="h-52 w-full rounded-md border border-slate-200 bg-slate-50 object-contain" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  className={inputClass}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                    e.currentTarget.value = "";
                  }}
                />
                <input className={inputClass} placeholder="URL de imagen" value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar servicio</button>
            {selectedId !== "new" && <button type="button" onClick={deleteItem} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">Eliminar</button>}
          </div>
        </form>
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}
