"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import { getDefaultAccessForRoles } from "@/lib/roleAccess";
import { roleLabels } from "@/lib/userRoles";
import type { AdminOverviewItem, AdminUser, AdminUserInput, UserRole, Worker } from "@/types/admin";

const moduleGroups = [
  { title: "Contenido web", description: "Publicaciones, galeria y respaldo institucional.", keys: ["blog", "gallery", "certifications", "backups", "audits"] },
  { title: "Talento humano", description: "Personal, ingresos, documentos e historial laboral.", keys: ["workers", "worker-intake", "worker-documents", "labor-history"] },
  { title: "Clientes y contratos", description: "Empresas, clientes, contratos, lugares, areas, horarios y asignaciones.", keys: ["clients", "contracts-shifts", "work-groups"] },
  { title: "Operaciones", description: "Asistencia diaria, aprobaciones y control operativo.", keys: ["supervisor-daily-report", "report-approvals", "supply-control"] },
  { title: "Contratacion publica", description: "Procesos, cronograma, alertas y seguimiento.", keys: ["hiring-processes", "process-calendar", "process-tracking"] },
  { title: "Recursos e inventario", description: "Equipos, productos y kits por empresa.", keys: ["machines", "supply-products", "supply-kits"] },
  { title: "Finanzas y contabilidad", description: "Contabilidad, calculo de pagos y dashboards contables.", keys: ["dashboard-accounting", "accounting", "payment-calculation"] },
  { title: "Reportes y comunicacion", description: "Dashboards, exportaciones y notificaciones internas.", keys: ["dashboard-supervisor", "exports", "notifications"] },
  { title: "Administracion y seguridad", description: "Usuarios, roles, catalogos y configuracion del SIT.", keys: ["users", "roles", "catalogs", "service-types"] },
];

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
    });
  }

  function toggleModuleAccess(moduleKey: string) {
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
  const modulesByKey = useMemo(() => new Map(modules.map((module) => [module.key, module])), [modules]);
  const groupedModules = useMemo(() => {
    const seen = new Set<string>();
    const groups = moduleGroups
      .map((group) => {
        const groupModules = group.keys
          .map((key) => modulesByKey.get(key))
          .filter((module): module is AdminOverviewItem => Boolean(module));
        groupModules.forEach((module) => seen.add(module.key));
        return { ...group, modules: groupModules };
      })
      .filter((group) => group.modules.length > 0);
    const remaining = modules.filter((module) => !seen.has(module.key));
    if (remaining.length) {
      groups.push({
        title: "Otros modulos",
        description: "Accesos adicionales no clasificados.",
        keys: remaining.map((module) => module.key),
        modules: remaining,
      });
    }
    return groups;
  }, [modules, modulesByKey]);

  function isModuleChecked(moduleKey: string) {
    return isAdministrator || userForm.moduleAccess.includes(moduleKey);
  }

  const effectiveModuleCount = modules.filter((module) => isModuleChecked(module.key)).length;

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-bold text-[#173C61]">Accesos a modulos</h3>
                <p className="mt-1 text-sm text-slate-500">Organizados por submodulos del SIT. Los permisos sugeridos por rol se pueden cambiar manualmente.</p>
              </div>
              <span className="rounded-full bg-[#E6F8F9] px-3 py-1 text-xs font-bold text-[#173C61]">
                {effectiveModuleCount} activo(s)
              </span>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {groupedModules.map((group) => (
                <section key={group.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 border-b border-slate-100 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#173C61]">{group.title}</h4>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{group.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                        {group.modules.filter((module) => isModuleChecked(module.key)).length}/{group.modules.length}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {group.modules.map((module) => {
                      const suggested = roleModuleAccess.has(module.key);
                      const checked = isModuleChecked(module.key);
                      return (
                        <label
                          key={module.key}
                          className={`flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                            checked
                              ? "border-[#33C3C9]/35 bg-[#F0FCFD] text-[#173C61]"
                              : "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200"
                          } cursor-pointer`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModuleAccess(module.key)}
                          />
                          <span className="min-w-0 flex-1 font-medium">{module.title}</span>
                          {suggested && <span className="rounded-full bg-[#E6F8F9] px-2 py-1 text-[11px] font-bold text-[#173C61]">Sugerido</span>}
                        </label>
                      );
                    })}
                  </div>
                </section>
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
