"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

export default function ExportsPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", client: "", worker: "", supervisor: "" });

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const res = await fetch("/api/admin/supervisor-reports", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar reportes.");
      return;
    }
    setReports(data.items || []);
  }

  const filtered = useMemo(() => reports.filter((report) => {
    if (filters.fromDate && report.date < filters.fromDate) return false;
    if (filters.toDate && report.date > filters.toDate) return false;
    if (filters.client && !report.clientName.toLowerCase().includes(filters.client.toLowerCase())) return false;
    if (filters.worker && !report.workerName.toLowerCase().includes(filters.worker.toLowerCase())) return false;
    if (filters.supervisor && !report.supervisor.toLowerCase().includes(filters.supervisor.toLowerCase())) return false;
    return true;
  }), [filters, reports]);

  function exportCsv() {
    const header = ["Fecha", "Trabajador", "Supervisor", "Cliente", "Asistencia", "Horas normales", "Horas extras", "Multas", "Estado", "Novedades"];
    const rows = filtered.map((report) => [
      report.date,
      report.workerName,
      report.supervisor,
      report.clientName,
      attendanceLabel(report.attendanceStatus),
      formatNumber(report.normalHours),
      formatNumber(report.overtimeHours),
      formatNumber(report.fineAmount),
      statusLabel(report.reportStatus),
      report.notes || "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reportes-asoserlid.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SystemModulePage moduleKey="exports">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-5">
          <Field label="Desde">
            <input type="date" className={inputClass} value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
          </Field>
          <Field label="Hasta">
            <input type="date" className={inputClass} value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          </Field>
          <Field label="Cliente">
            <input className={inputClass} value={filters.client} onChange={(e) => setFilters({ ...filters, client: e.target.value })} />
          </Field>
          <Field label="Trabajador">
            <input className={inputClass} value={filters.worker} onChange={(e) => setFilters({ ...filters, worker: e.target.value })} />
          </Field>
          <Field label="Supervisor">
            <input className={inputClass} value={filters.supervisor} onChange={(e) => setFilters({ ...filters, supervisor: e.target.value })} />
          </Field>
        </div>
        <button onClick={exportCsv} className="mt-4 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">
          Descargar Excel CSV
        </button>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Fecha</span>
          <span>Trabajador</span>
          <span>Cliente</span>
          <span>Normales</span>
          <span>Extras</span>
          <span>Estado</span>
        </div>
        {filtered.map((report) => (
          <div key={report._id} className="grid grid-cols-[1fr_1fr_1fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span>{report.date}</span>
            <span className="font-semibold text-[#173C61]">{report.workerName}</span>
            <span>{report.clientName}</span>
            <span>{formatNumber(report.normalHours)}</span>
            <span>{formatNumber(report.overtimeHours)}</span>
            <span>{statusLabel(report.reportStatus)}</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No hay reportes con esos filtros.</p>}
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}

function statusLabel(status?: SupervisorReport["reportStatus"]) {
  return { draft: "Borrador", submitted: "Enviado", observed: "Observado", approved: "Aprobado", rejected: "Rechazado" }[status || "draft"];
}

function attendanceLabel(status: SupervisorReport["attendanceStatus"]) {
  return { attended: "Asistio", absent: "Falto", permission: "Permiso", sick: "Enfermedad", late: "Retraso", replacement: "Reemplazo" }[status];
}
