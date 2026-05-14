"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ImportCsvModal from "@/components/system/ImportCsvModal";
import { confirmSystem, notifySystem } from "@/components/system/SystemNotifier";

export type CrudField<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "email" | "date" | "textarea" | "select" | "image";
  required?: boolean;
  options?: { value: string; label: string }[];
};

type SimpleCrudModuleProps<T extends Record<string, unknown>> = {
  endpoint: string;
  emptyItem: T;
  fields: CrudField<T>[];
  titleKey: keyof T & string;
  subtitleKey?: keyof T & string;
  newLabel: string;
  saveLabel: string;
  importConfig?: {
    title: string;
    endpoint: string;
    templateHref: string;
  };
  searchableKeys?: (keyof T & string)[];
  filters?: {
    key: keyof T & string;
    label: string;
    options: { value: string; label: string }[];
  }[];
};

export default function SimpleCrudModule<T extends Record<string, unknown>>({
  endpoint,
  emptyItem,
  fields,
  titleKey,
  subtitleKey,
  newLabel,
  saveLabel,
  importConfig,
  searchableKeys,
  filters = [],
}: SimpleCrudModuleProps<T>) {
  const [items, setItems] = useState<(T & { _id?: string })[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<T>(emptyItem);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const selectedItem = useMemo(() => items.find((item) => item._id === selectedId), [items, selectedId]);
  const visibleItems = useMemo(() => {
    const keys = searchableKeys?.length ? searchableKeys : [titleKey, subtitleKey].filter(Boolean) as (keyof T & string)[];
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch = !term || keys.some((key) => String(item[key] || "").toLowerCase().includes(term));
      const matchesFilters = filters.every((filter) => {
        const value = filterValues[filter.key];
        return !value || String(item[filter.key] || "") === value;
      });
      return matchesSearch && matchesFilters;
    });
  }, [filterValues, filters, items, search, searchableKeys, subtitleKey, titleKey]);

  const loadItems = useCallback(async () => {
    const res = await fetch(endpoint, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setItems(data.items || []);
    if (!res.ok) notifySystem(data.error || "No se pudo cargar la informacion.", { tone: "error" });
  }, [endpoint]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setForm(selectedItem || emptyItem);
  }, [selectedItem, emptyItem]);

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    notifySystem("Guardando registro...", { tone: "info" });

    const isNew = selectedId === "new";
    const res = await fetch(isNew ? endpoint : `${endpoint}/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      notifySystem(data.error || "No se pudo guardar.", { tone: "error" });
      return;
    }

    notifySystem("Registro guardado correctamente.", { tone: "success" });
    await loadItems();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteItem() {
    if (selectedId === "new") return;
    const confirmed = await confirmSystem("Vas a eliminar este registro. Esta accion no se puede deshacer.", {
      tone: "warning",
      confirmLabel: "Eliminar",
    });
    if (!confirmed) return;

    const res = await fetch(`${endpoint}/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo eliminar.", { tone: "error" });
      return;
    }

    notifySystem("Registro eliminado correctamente.", { tone: "success" });
    setSelectedId("new");
    await loadItems();
  }

  function updateField(key: keyof T & string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(key: keyof T & string, file: File) {
    notifySystem("Cargando imagen...", { tone: "info" });
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/uploads", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifySystem(data.error || "No se pudo cargar la imagen.", { tone: "error" });
      return;
    }
    updateField(key, data.imageUrl);
    notifySystem("Imagen cargada. Guarda el registro para conservar el cambio.", { tone: "success" });
  }

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-2">
            <button onClick={() => setSelectedId("new")} className="w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
              {newLabel}
            </button>
            {importConfig && (
              <ImportCsvModal
                title={importConfig.title}
                endpoint={importConfig.endpoint}
                templateHref={importConfig.templateHref}
                onImported={loadItems}
              />
            )}
          </div>

          <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <input
              className={inputClass}
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filters.map((filter) => (
              <select
                key={filter.key}
                className={inputClass}
                value={filterValues[filter.key] || ""}
                onChange={(e) => setFilterValues((current) => ({ ...current, [filter.key]: e.target.value }))}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ))}
            {(search || Object.values(filterValues).some(Boolean)) && (
              <button type="button" onClick={() => { setSearch(""); setFilterValues({}); }} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleItems.map((item) => (
              <button
                key={item._id}
                onClick={() => setSelectedId(item._id || "new")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedId === item._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{String(item[titleKey] || "Sin nombre")}</span>
                {subtitleKey && <span className="mt-1 block text-xs text-slate-500">{String(item[subtitleKey] || "")}</span>}
              </button>
            ))}
            {visibleItems.length === 0 && <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Sin resultados.</p>}
          </div>
        </aside>

        <form onSubmit={saveItem} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className={`grid gap-2 text-sm font-semibold text-slate-700 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                {field.label}
                {field.type === "textarea" ? (
                  <textarea className={`${inputClass} min-h-28`} value={String(form[field.key] || "")} onChange={(e) => updateField(field.key, e.target.value)} />
                ) : field.type === "select" ? (
                  <select className={inputClass} required={field.required} value={String(form[field.key] || "")} onChange={(e) => updateField(field.key, e.target.value)}>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : field.type === "image" ? (
                  <div className="grid gap-3">
                    {String(form[field.key] || "") && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={String(form[field.key])} alt="" className="h-36 w-full rounded-md border border-slate-200 object-contain" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className={inputClass}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(field.key, file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <input
                      required={field.required}
                      className={inputClass}
                      value={String(form[field.key] || "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder="Tambien puedes pegar una URL"
                    />
                  </div>
                ) : (
                  <input
                    required={field.required}
                    type={field.type || "text"}
                    className={inputClass}
                    value={String(form[field.key] || "")}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">{saveLabel}</button>
            {selectedId !== "new" && (
              <button type="button" onClick={deleteItem} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
                Eliminar
              </button>
            )}
          </div>
        </form>
      </section>
    </>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";
