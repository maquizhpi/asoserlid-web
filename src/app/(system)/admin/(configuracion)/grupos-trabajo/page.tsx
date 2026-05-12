"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { WorkGroup } from "@/types/admin";

const emptyGroup: WorkGroup = {
  name: "",
  description: "",
  supervisorId: "",
  supervisorName: "",
  status: "active",
};

export default function WorkGroupsPage() {
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<WorkGroup>(emptyGroup);
  const [status, setStatus] = useState<string | null>(null);

  const selectedGroup = useMemo(() => groups.find((group) => group._id === selectedId), [groups, selectedId]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm(selectedGroup || emptyGroup);
  }, [selectedGroup]);

  async function loadData() {
    const [groupsRes, supervisorsRes] = await Promise.all([
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/supervisors", { cache: "no-store" }),
    ]);
    const groupsData = await groupsRes.json().catch(() => ({}));
    const supervisorsData = await supervisorsRes.json().catch(() => ({}));

    if (groupsRes.ok) setGroups(groupsData.items || []);
    if (supervisorsRes.ok) {
      setSupervisors((supervisorsData.items || []).map((item: { id: string; name: string }) => ({ value: item.id, label: item.name })));
    }
    if (!groupsRes.ok || !supervisorsRes.ok) setStatus(groupsData.error || supervisorsData.error || "No se pudo cargar grupos.");
  }

  async function saveGroup(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando grupo...");

    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/work-groups" : `/api/admin/work-groups/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el grupo.");
      return;
    }

    setStatus("Grupo guardado correctamente.");
    await loadData();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteGroup() {
    if (selectedId === "new") return;
    if (!window.confirm("Eliminar este grupo?")) return;

    const res = await fetch(`/api/admin/work-groups/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el grupo.");
      return;
    }

    setStatus("Grupo eliminado.");
    setSelectedId("new");
    await loadData();
  }

  return (
    <SystemModulePage moduleKey="work-groups">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={() => setSelectedId("new")} className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
            Nuevo grupo
          </button>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedId(group._id || "new")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedId === group._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{group.name}</span>
                <span className="mt-1 block text-xs text-slate-500">{group.supervisorName || "Sin supervisor"}</span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={saveGroup} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del grupo">
              <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkGroup["status"] })}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
            <SearchableSelect
              label="Supervisor responsable"
              value={form.supervisorId || ""}
              options={supervisors}
              placeholder="Buscar supervisor..."
              onChange={(option) => setForm({ ...form, supervisorId: option?.value || "", supervisorName: option?.label || "" })}
            />
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Descripcion
            <textarea className={`${inputClass} min-h-28`} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar grupo</button>
            {selectedId !== "new" && (
              <button type="button" onClick={deleteGroup} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
                Eliminar
              </button>
            )}
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

