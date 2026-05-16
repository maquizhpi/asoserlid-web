"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import { getDefaultAccessForRoles } from "@/lib/roleAccess";
import { roleLabels } from "@/lib/userRoles";
import type { AdminOverviewItem, AdminUser, AdminUserInput, UserRole, Worker } from "@/types/admin";

const emptyUser: AdminUserInput = {
  workerId: "",
  workerDocumentId: "",
  name: "",
  email: "",
  password: "",
  roles: ["supervisor"],
  moduleAccess: ["workers", "clients", "contracts-shifts", "supervisor-daily-report"],
  active: true,
};

export default function UsersModulePage() {
  const [modules, setModules] = useState<AdminOverviewItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("new");
  const [userForm, setUserForm] = useState<AdminUserInput>(emptyUser);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let mounted = true;

    if (selectedUserId === "new") {
      setUserForm(emptyUser);
      return;
    }

    fetch(`/api/admin/users/${selectedUserId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!mounted) return;
        if (data.user) setUserForm({ ...data.user, password: "" });
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("No se pudo cargar el detalle del usuario.");
      });

    return () => {
      mounted = false;
    };
  }, [selectedUserId]);

  async function loadUsers() {
    const [modulesRes, usersRes, workersRes] = await Promise.all([
      fetch("/api/admin/modules", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
    ]);

    const modulesData = await modulesRes.json().catch(() => ({}));
    const usersData = await usersRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));

    if (modulesRes.ok) setModules(modulesData.modules || []);
    if (usersRes.ok) setUsers(usersData.users || []);
    if (workersRes.ok) setWorkers(workersData.items || []);
    if (!modulesRes.ok || !usersRes.ok || !workersRes.ok) setStatus(modulesData.error || usersData.error || workersData.error || "No autorizado.");
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando usuario...");

    const isNew = selectedUserId === "new";
    const res = await fetch(isNew ? "/api/admin/users" : `/api/admin/users/${selectedUserId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el usuario.");
      return;
    }

    setStatus("Usuario guardado correctamente.");
    await loadUsers();
    setSelectedUserId(data.user?._id || "new");
  }

  async function deleteUser() {
    if (selectedUserId === "new") return;
    if (!window.confirm("Eliminar este usuario?")) return;

    const res = await fetch(`/api/admin/users/${selectedUserId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el usuario.");
      return;
    }

    setStatus("Usuario eliminado.");
    setSelectedUserId("new");
    await loadUsers();
  }

  function toggleRole(role: UserRole) {
    const roles = userForm.roles.includes(role)
      ? userForm.roles.filter((currentRole) => currentRole !== role)
      : [...userForm.roles, role];

    const nextRoles = roles.length ? roles : userForm.roles;
    setUserForm({
      ...userForm,
      roles: nextRoles,
      moduleAccess: Array.from(new Set([...userForm.moduleAccess, ...getDefaultAccessForRoles(nextRoles)])),
    });
  }

  function toggleModuleAccess(moduleKey: string) {
    if (roleModuleAccess.has(moduleKey)) return;
    const moduleAccess = userForm.moduleAccess.includes(moduleKey)
      ? userForm.moduleAccess.filter((currentModule) => currentModule !== moduleKey)
      : [...userForm.moduleAccess, moduleKey];

    setUserForm({ ...userForm, moduleAccess });
  }

  const workerOptions = useMemo(
    () =>
      workers
        .filter((worker) => worker.status === "active")
        .map((worker) => ({
          value: worker._id || worker.documentId,
          label: `${worker.firstName} ${worker.lastName} (${worker.documentId})`,
        })),
    [workers]
  );
  const roleModuleAccess = useMemo(() => new Set(getDefaultAccessForRoles(userForm.roles)), [userForm.roles]);
  const isAdministrator = userForm.roles.includes("administrator");

  return (
    <SystemModulePage moduleKey="users">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button
            onClick={() => setSelectedUserId("new")}
            className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]"
          >
            Nuevo usuario
          </button>

          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUserId(user._id || "new")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedUserId === user._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{user.name}</span>
                <span className="mt-1 block text-xs text-slate-500">{user.email}</span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={saveUser} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <SearchableSelect
              label="Empleado vinculado"
              value={userForm.workerId || ""}
              options={workerOptions}
              placeholder="Buscar empleado por nombre o cedula..."
              onChange={(option) => {
                const worker = workers.find((item) => (item._id || item.documentId) === option?.value);
                setUserForm({
                  ...userForm,
                  workerId: worker?._id || "",
                  workerDocumentId: worker?.documentId || "",
                  name: worker ? `${worker.firstName} ${worker.lastName}` : "",
                  email: worker?.email || userForm.email,
                });
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input required className={inputClass} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </Field>
            <Field label="Correo">
              <input required type="email" className={inputClass} value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={selectedUserId === "new" ? "Contrasena" : "Nueva contrasena"}>
              <input
                required={selectedUserId === "new"}
                type="password"
                minLength={8}
                className={inputClass}
                placeholder={selectedUserId === "new" ? "" : "Dejar vacio para conservar"}
                value={userForm.password || ""}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })} />
              Usuario activo
            </label>
          </div>

          <section className="mt-4 rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-[#173C61]">Roles</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(roleLabels).map(([role, label]) => (
                <label key={role} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={userForm.roles.includes(role as UserRole)} onChange={() => toggleRole(role as UserRole)} />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-[#173C61]">Accesos a modulos</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {modules.map((module) => (
                <label key={module.key} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isAdministrator || roleModuleAccess.has(module.key) || userForm.moduleAccess.includes(module.key)}
                    disabled={isAdministrator || roleModuleAccess.has(module.key)}
                    onChange={() => toggleModuleAccess(module.key)}
                  />
                  <span className="min-w-0 flex-1">{module.title}</span>
                  {(isAdministrator || roleModuleAccess.has(module.key)) && (
                    <span className="rounded-full bg-[#E6F8F9] px-2 py-1 text-[11px] font-bold text-[#173C61]">Por rol</span>
                  )}
                </label>
              ))}
            </div>
          </section>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar usuario</button>
            {selectedUserId !== "new" && (
              <button type="button" onClick={deleteUser} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}
