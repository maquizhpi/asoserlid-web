"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { WorkGroup, WorkGroupBankAccount, Worker } from "@/types/admin";

type WorkerOption = SelectOption & {
  documentId?: string;
  email?: string;
  phone?: string;
};

const emptyGroup: WorkGroup = {
  name: "",
  commercialName: "",
  legalName: "",
  taxId: "",
  address: "",
  companyEmail: "",
  companyPhone: "",
  description: "",
  logoUrl: "",
  logoPublicId: "",
  legalRepresentativeId: "",
  legalRepresentativeName: "",
  legalRepresentativeDocumentId: "",
  supervisorId: "",
  supervisorName: "",
  bankAccounts: [],
  status: "active",
};

export default function WorkGroupsPage() {
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<WorkGroup>(emptyGroup);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const selectedGroup = useMemo(() => groups.find((group) => group._id === selectedId), [groups, selectedId]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm(selectedGroup ? normalizeGroup(selectedGroup) : emptyGroup);
  }, [selectedGroup]);

  async function loadData() {
    const [groupsRes, workersRes] = await Promise.all([
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }).catch(() => null),
    ]);
    const groupsData = await groupsRes.json().catch(() => ({}));
    const workersData = workersRes ? await workersRes.json().catch(() => ({})) : {};

    if (groupsRes.ok) setGroups((groupsData.items || []).map(normalizeGroup));
    if (workersRes?.ok) {
      setWorkers((workersData.items || [])
        .filter((item: Worker) => item.status === "active")
        .map((item: Worker) => ({
          value: item._id || item.documentId,
          label: `${item.firstName} ${item.lastName} (${item.documentId})`,
          documentId: item.documentId,
          email: item.email,
          phone: item.phone,
        })));
    }
    if (!groupsRes.ok) setStatus(groupsData.error || "No se pudo cargar grupos.");
  }

  async function saveGroup(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando grupo...");

    const payload = {
      ...form,
      name: (form.commercialName || form.name || "").trim(),
      commercialName: (form.commercialName || form.name || "").trim(),
      bankAccounts: (form.bankAccounts || []).filter((account) => account.bankName || account.accountNumber || account.accountType),
    };
    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/work-groups" : `/api/admin/work-groups/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  async function uploadLogo(file?: File) {
    if (!file) return;
    setUploadingLogo(true);
    setStatus("Subiendo logo...");
    const body = new FormData();
    body.append("file", file);
    body.append("folder", "asoserlid/grupos-trabajo");
    const res = await fetch("/api/admin/cloudinary-upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploadingLogo(false);
    if (!res.ok) {
      setStatus(data.error || "No se pudo subir el logo.");
      return;
    }
    setForm((current) => ({ ...current, logoUrl: data.url || "", logoPublicId: data.publicId || "" }));
    setStatus("Logo cargado correctamente.");
  }

  function setRepresentative(option: WorkerOption | null) {
    setForm({
      ...form,
      legalRepresentativeId: option?.value || "",
      legalRepresentativeName: option?.label || "",
      legalRepresentativeDocumentId: option?.documentId || "",
      supervisorId: option?.value || "",
      supervisorName: option?.label || "",
    });
  }

  function addBankAccount() {
    setForm({ ...form, bankAccounts: [...(form.bankAccounts || []), { id: crypto.randomUUID(), bankName: "", accountType: "", accountNumber: "", accountHolder: "", notes: "" }] });
  }

  function updateBankAccount(id: string, patch: Partial<WorkGroupBankAccount>) {
    setForm({ ...form, bankAccounts: (form.bankAccounts || []).map((account) => account.id === id ? { ...account, ...patch } : account) });
  }

  function removeBankAccount(id: string) {
    setForm({ ...form, bankAccounts: (form.bankAccounts || []).filter((account) => account.id !== id) });
  }

  return (
    <SystemModulePage moduleKey="work-groups">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={() => setSelectedId("new")} className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
            Nuevo grupo
          </button>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedId(group._id || "new")}
                className={`flex w-full gap-3 rounded-md border px-4 py-3 text-left transition ${
                  selectedId === group._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <LogoPreview group={group} compact />
                <span>
                  <span className="block font-semibold text-[#173C61]">{group.commercialName || group.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{group.legalRepresentativeName || group.supervisorName || "Sin representante legal"}</span>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{group.taxId || "Sin RUC"}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={saveGroup} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
            <LogoPreview group={form} />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Logo del grupo / empresa
              <input type="file" accept="image/*" className={inputClass} disabled={uploadingLogo} onChange={(e) => uploadLogo(e.target.files?.[0])} />
              <span className="text-xs font-normal text-slate-500">{uploadingLogo ? "Subiendo logo..." : "Se usara en roles y reportes del grupo."}</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre comercial / grupo">
              <input required className={inputClass} value={form.commercialName || form.name} onChange={(e) => setForm({ ...form, commercialName: e.target.value, name: e.target.value })} />
            </Field>
            <Field label="RUC">
              <input className={inputClass} value={form.taxId || ""} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </Field>
            <Field label="Razon social">
              <input className={inputClass} value={form.legalName || ""} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkGroup["status"] })}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
            <SearchableSelect
              label="Representante legal"
              value={form.legalRepresentativeId || ""}
              options={workers}
              placeholder="Buscar trabajador..."
              onChange={(option) => setRepresentative(option as WorkerOption | null)}
            />
            <Field label="Cedula del representante">
              <input className={inputClass} value={form.legalRepresentativeDocumentId || ""} readOnly />
            </Field>
            <Field label="Correo de la empresa">
              <input type="email" className={inputClass} value={form.companyEmail || ""} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} />
            </Field>
            <Field label="Celular">
              <input className={inputClass} value={form.companyPhone || ""} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} />
            </Field>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Direccion
            <input className={inputClass} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Descripcion
            <textarea className={`${inputClass} min-h-24`} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <section className="mt-5 rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#173C61]">Cuentas bancarias</h3>
                <p className="text-xs text-slate-500">Los numeros de cuenta se guardan cifrados en la base de datos.</p>
              </div>
              <button type="button" onClick={addBankAccount} className="rounded-md border border-[#173C61] px-4 py-2 text-sm font-bold text-[#173C61] hover:bg-[#E6F8F9]">Agregar cuenta</button>
            </div>
            <div className="space-y-3">
              {(form.bankAccounts || []).map((account) => (
                <div key={account.id} className="grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[1fr_0.8fr_1fr_1fr_auto]">
                  <input className={inputClass} placeholder="Banco" value={account.bankName || ""} onChange={(e) => updateBankAccount(account.id, { bankName: e.target.value })} />
                  <select className={inputClass} value={account.accountType || ""} onChange={(e) => updateBankAccount(account.id, { accountType: e.target.value })}>
                    <option value="">Tipo</option>
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                  <input className={inputClass} placeholder="Numero de cuenta" value={account.accountNumber || ""} onChange={(e) => updateBankAccount(account.id, { accountNumber: e.target.value })} />
                  <input className={inputClass} placeholder="Titular" value={account.accountHolder || ""} onChange={(e) => updateBankAccount(account.id, { accountHolder: e.target.value })} />
                  <button type="button" onClick={() => removeBankAccount(account.id)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50">Quitar</button>
                </div>
              ))}
              {(form.bankAccounts || []).length === 0 && <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">Sin cuentas registradas.</p>}
            </div>
          </section>

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

function normalizeGroup(group: WorkGroup): WorkGroup {
  return {
    ...emptyGroup,
    ...group,
    name: group.commercialName || group.name || "",
    commercialName: group.commercialName || group.name || "",
    legalRepresentativeId: group.legalRepresentativeId || group.supervisorId || "",
    legalRepresentativeName: group.legalRepresentativeName || group.supervisorName || "",
    bankAccounts: group.bankAccounts || [],
  };
}

function LogoPreview({ group, compact = false }: { group: WorkGroup; compact?: boolean }) {
  const size = compact ? "h-11 w-11" : "h-24 w-24";
  return (
    <div className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-[#173C61]`}>
      {group.logoUrl ? <img src={group.logoUrl} alt={group.commercialName || group.name} className="h-full w-full object-contain" /> : "SIT"}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}
