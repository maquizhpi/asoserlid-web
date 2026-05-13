"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { AuditLog } from "@/types/admin";

export default function AuditsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState({ user: "", module: "", action: "" });

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const res = await fetch("/api/admin/audits", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudieron cargar auditorias.");
      return;
    }
    setLogs(data.items || []);
  }

  async function restoreLog(log: AuditLog) {
    if (!log._id) return;
    if (!window.confirm("Restaurar este registro al estado guardado en la auditoria?")) return;

    setStatus("Restaurando registro desde auditoria...");
    const res = await fetch(`/api/admin/audits/${log._id}/restore`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo restaurar el registro.");
      return;
    }

    setStatus("Registro restaurado correctamente.");
    await loadLogs();
  }

  const filtered = useMemo(() => logs.filter((log) => {
    if (filters.user && !String(log.userEmail || "").toLowerCase().includes(filters.user.toLowerCase())) return false;
    if (filters.module && log.moduleKey !== filters.module) return false;
    if (filters.action && log.action !== filters.action) return false;
    return true;
  }), [filters, logs]);

  const moduleOptions = useMemo(() => Array.from(new Set(logs.map((log) => log.moduleKey))).sort(), [logs]);

  return (
    <SystemModulePage moduleKey="audits">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Usuario">
            <input className={inputClass} value={filters.user} onChange={(event) => setFilters({ ...filters, user: event.target.value })} />
          </Field>
          <Field label="Modulo">
            <select className={inputClass} value={filters.module} onChange={(event) => setFilters({ ...filters, module: event.target.value })}>
              <option value="">Todos</option>
              {moduleOptions.map((moduleKey) => <option key={moduleKey} value={moduleKey}>{moduleKey}</option>)}
            </select>
          </Field>
          <Field label="Accion">
            <select className={inputClass} value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}>
              <option value="">Todas</option>
              <option value="create">Crear</option>
              <option value="update">Actualizar</option>
              <option value="delete">Eliminar</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[0.9fr_0.8fr_0.8fr_1fr_1.4fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Fecha</span>
          <span>Usuario</span>
          <span>Modulo</span>
          <span>Registro</span>
          <span>Resumen</span>
          <span>Restaurar</span>
        </div>
        {filtered.map((log) => (
          <div key={log._id} className="grid grid-cols-[0.9fr_0.8fr_0.8fr_1fr_1.4fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span>{formatDate(log.createdAt)}</span>
            <span className="font-semibold text-[#173C61]">{log.userEmail || "Sistema"}</span>
            <span>{log.moduleKey}</span>
            <span>{log.recordLabel || log.recordId || "-"}</span>
            <span><ActionBadge action={log.action} /> {log.summary}</span>
            <span>
              {canRestore(log) ? (
                <button onClick={() => restoreLog(log)} className="rounded-md border border-[#33C3C9]/40 px-3 py-1.5 text-xs font-bold text-[#173C61] hover:bg-[#E6F8F9]">
                  Restaurar
                </button>
              ) : (
                <span className="text-xs text-slate-400">{log.restoredAt ? "Restaurada" : "No disponible"}</span>
              )}
            </span>
          </div>
        ))}
        {filtered.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No hay cambios registrados con esos filtros.</p>}
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function ActionBadge({ action }: { action: AuditLog["action"] }) {
  const label = { create: "Crear", update: "Editar", delete: "Eliminar" }[action];
  const color = action === "delete" ? "bg-red-50 text-red-700" : action === "update" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`mr-2 rounded-full px-2 py-1 text-xs font-bold ${color}`}>{label}</span>;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function canRestore(log: AuditLog) {
  if (log.restoredAt) return false;
  if (log.action !== "update" && log.action !== "delete") return false;
  return Boolean(log.beforeSnapshot && log.recordId && log.collection);
}
