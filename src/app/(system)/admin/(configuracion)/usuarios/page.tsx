"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { AdminUser, AdminUserInput } from "@/types/admin";

const emptyUser: AdminUserInput = {
  name: "",
  email: "",
  password: "",
  roles: ["administrator"],
  moduleAccess: [],
  active: true,
};

export default function UsersModulePage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("new");
  const [userForm, setUserForm] = useState<AdminUserInput>(emptyUser);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId === "new") {
      setUserForm(emptyUser);
      return;
    }

    let mounted = true;
    fetch(`/api/admin/users/${selectedUserId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => { if (mounted && data.user) setUserForm({ ...data.user, password: "" }); })
      .catch(() => { if (mounted) setStatus("No se pudo cargar el usuario."); });

    return () => { mounted = false; };
  }, [selectedUserId]);

  async function loadUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setUsers(data.users || []);
    else setStatus(data.error || "No autorizado.");
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    setStatus("Guardando...");

    const isNew = selectedUserId === "new";
    const res = await fetch(isNew ? "/api/admin/users" : `/api/admin/users/${selectedUserId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...userForm, roles: ["administrator"], moduleAccess: [] }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(data.error || "No se pudo guardar."); return; }

    setStatus("Usuario guardado.");
    await loadUsers();
    setSelectedUserId(data.user?._id || "new");
  }

  async function deleteUser() {
    if (selectedUserId === "new") return;
    if (!window.confirm("Eliminar este usuario?")) return;

    const res = await fetch(`/api/admin/users/${selectedUserId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(data.error || "No se pudo eliminar."); return; }

    setStatus("Usuario eliminado.");
    setSelectedUserId("new");
    await loadUsers();
  }

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

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Todos los usuarios del panel web tienen rol de <strong>Administrador</strong> con acceso completo al contenido.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar</button>
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
