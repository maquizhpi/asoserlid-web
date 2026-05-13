"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

type ReportGroup = {
  key: string;
  label: string;
  reports: number;
  normalHours: number;
  overtimeHours: number;
  fines: number;
  absences: number;
  delays: number;
};

export default function ExportsPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", client: "", worker: "", supervisor: "" });
  const [groupBy, setGroupBy] = useState<"client" | "supervisor" | "month">("client");

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

  const totals = useMemo(() => filtered.reduce(
    (acc, report) => ({
      normalHours: acc.normalHours + Number(report.normalHours || 0),
      overtimeHours: acc.overtimeHours + Number(report.overtimeHours || 0),
      fines: acc.fines + Number(report.fineAmount || 0),
      absences: acc.absences + (report.attendanceStatus === "absent" ? 1 : 0),
      approved: acc.approved + (report.reportStatus === "approved" ? 1 : 0),
    }),
    { normalHours: 0, overtimeHours: 0, fines: 0, absences: 0, approved: 0 }
  ), [filtered]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ReportGroup>();
    filtered.forEach((report) => {
      const key = groupKey(report, groupBy);
      const current = groups.get(key) || {
        key,
        label: key,
        reports: 0,
        normalHours: 0,
        overtimeHours: 0,
        fines: 0,
        absences: 0,
        delays: 0,
      };
      current.reports += 1;
      current.normalHours += Number(report.normalHours || 0);
      current.overtimeHours += Number(report.overtimeHours || 0);
      current.fines += Number(report.fineAmount || 0);
      current.absences += report.attendanceStatus === "absent" ? 1 : 0;
      current.delays += Number(report.delayMinutes || 0);
      groups.set(key, current);
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, groupBy]);

  function exportDetailedCsv() {
    downloadCsv("reportes-detallados-asoserlid.csv", [
      ["Fecha", "Trabajador", "Supervisor", "Cliente", "Asistencia", "Horas normales", "Horas extras", "Multas", "Estado", "Novedades"],
      ...filtered.map((report) => [
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
      ]),
    ]);
  }

  function exportGroupedCsv() {
    downloadCsv("resumen-reportes-asoserlid.csv", [
      [groupLabel(groupBy), "Reportes", "Horas normales", "Horas extras", "Multas", "Faltas", "Minutos atraso"],
      ...grouped.map((group) => [
        group.label,
        String(group.reports),
        formatNumber(group.normalHours),
        formatNumber(group.overtimeHours),
        formatNumber(group.fines),
        String(group.absences),
        String(group.delays),
      ]),
    ]);
  }

  function exportPdf() {
    const rows = grouped.map((group) => `
      <tr>
        <td>${escapeHtml(group.label)}</td>
        <td>${group.reports}</td>
        <td>${formatNumber(group.normalHours)}</td>
        <td>${formatNumber(group.overtimeHours)}</td>
        <td>$ ${formatNumber(group.fines)}</td>
        <td>${group.absences}</td>
      </tr>
    `).join("");

    printHtml(`
      <h1>Reporte ${escapeHtml(groupLabel(groupBy).toLowerCase())}</h1>
      <p>Periodo: ${filters.fromDate || "Inicio"} a ${filters.toDate || "Hoy"}</p>
      <p>Total reportes: ${filtered.length} | Aprobados: ${totals.approved}</p>
      <table>
        <thead><tr><th>${escapeHtml(groupLabel(groupBy))}</th><th>Reportes</th><th>Normales</th><th>Extras</th><th>Multas</th><th>Faltas</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='6'>Sin datos</td></tr>"}</tbody>
      </table>
    `);
  }

  return (
    <SystemModulePage moduleKey="exports">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-6">
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
          <Field label="Resumen">
            <select className={inputClass} value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
              <option value="client">Por cliente</option>
              <option value="supervisor">Por supervisor</option>
              <option value="month">Mensual de asistencia</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={exportDetailedCsv} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Exportar Excel CSV</button>
          <button onClick={exportGroupedCsv} className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Exportar resumen</button>
          <button onClick={exportPdf} className="rounded-md border border-[#173C61] px-5 py-3 font-semibold text-[#173C61] hover:bg-[#E6F8F9]">Exportar PDF</button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Summary label="Reportes filtrados" value={String(filtered.length)} />
        <Summary label="Aprobados" value={String(totals.approved)} />
        <Summary label="Horas totales" value={formatNumber(totals.normalHours + totals.overtimeHours)} />
        <Summary label="Multas" value={`$ ${formatNumber(totals.fines)}`} />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>{groupLabel(groupBy)}</span>
          <span>Reportes</span>
          <span>Normales</span>
          <span>Extras</span>
          <span>Multas</span>
          <span>Faltas</span>
        </div>
        {grouped.map((group) => (
          <div key={group.key} className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-[#173C61]">{group.label}</span>
            <span>{group.reports}</span>
            <span>{formatNumber(group.normalHours)}</span>
            <span>{formatNumber(group.overtimeHours)}</span>
            <span>$ {formatNumber(group.fines)}</span>
            <span>{group.absences}</span>
          </div>
        ))}
        {grouped.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No hay reportes con esos filtros.</p>}
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#173C61]">{value}</p>
    </div>
  );
}

function groupKey(report: SupervisorReport, groupBy: "client" | "supervisor" | "month") {
  if (groupBy === "supervisor") return report.supervisor || "Sin supervisor";
  if (groupBy === "month") return report.date.slice(0, 7) || "Sin mes";
  return report.clientName || "Sin cliente";
}

function groupLabel(groupBy: "client" | "supervisor" | "month") {
  return { client: "Cliente", supervisor: "Supervisor", month: "Mes" }[groupBy];
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printHtml(body: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>Reporte ASOSERLID</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 28px; }
          h1 { color: #173C61; margin-bottom: 6px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #d8e0ea; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #edf6f7; color: #173C61; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
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
