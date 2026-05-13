"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

type WorkerPayment = {
  workerKey: string;
  workerName: string;
  reports: number;
  normalHours: number;
  overtimeHours: number;
  fines: number;
  delayMinutes: number;
  gross: number;
  total: number;
};

export default function PaymentCalculationPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [normalRate, setNormalRate] = useState(2.5);
  const [overtimeRate, setOvertimeRate] = useState(3.75);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const res = await fetch("/api/admin/supervisor-reports", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar reportes aprobados.");
      return;
    }
    setReports((data.items || []).filter((report: SupervisorReport) => report.reportStatus === "approved"));
  }

  const filtered = useMemo(() => reports.filter((report) => {
    if (fromDate && report.date < fromDate) return false;
    if (toDate && report.date > toDate) return false;
    return true;
  }), [fromDate, reports, toDate]);

  const payments = useMemo(() => {
    const grouped = new Map<string, WorkerPayment>();
    filtered.forEach((report) => {
      const key = report.workerId || report.workerName;
      const current = grouped.get(key) || {
        workerKey: key,
        workerName: report.workerName,
        reports: 0,
        normalHours: 0,
        overtimeHours: 0,
        fines: 0,
        delayMinutes: 0,
        gross: 0,
        total: 0,
      };
      current.reports += 1;
      current.normalHours += Number(report.normalHours || 0);
      current.overtimeHours += Number(report.overtimeHours || 0);
      current.fines += Number(report.fineAmount || 0);
      current.delayMinutes += Number(report.delayMinutes || 0);
      current.gross = current.normalHours * normalRate + current.overtimeHours * overtimeRate;
      current.total = current.gross - current.fines;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.workerName.localeCompare(b.workerName));
  }, [filtered, normalRate, overtimeRate]);

  const totals = useMemo(() => payments.reduce(
    (acc, payment) => ({
      gross: acc.gross + payment.gross,
      fines: acc.fines + payment.fines,
      total: acc.total + payment.total,
      workers: acc.workers + 1,
    }),
    { gross: 0, fines: 0, total: 0, workers: 0 }
  ), [payments]);

  function exportCsv() {
    const rows = [
      ["Trabajador", "Reportes", "Horas normales", "Horas extras", "Atrasos min", "Bruto", "Descuentos", "Neto"],
      ...payments.map((payment) => [
        payment.workerName,
        String(payment.reports),
        formatNumber(payment.normalHours),
        formatNumber(payment.overtimeHours),
        String(payment.delayMinutes),
        formatNumber(payment.gross),
        formatNumber(payment.fines),
        formatNumber(payment.total),
      ]),
    ];
    downloadCsv("resumen-pago-trabajadores-asoserlid.csv", rows);
  }

  function exportPdf() {
    const rows = payments.map((payment) => `
      <tr>
        <td>${escapeHtml(payment.workerName)}</td>
        <td>${payment.reports}</td>
        <td>${formatNumber(payment.normalHours)}</td>
        <td>${formatNumber(payment.overtimeHours)}</td>
        <td>$ ${formatNumber(payment.fines)}</td>
        <td>$ ${formatNumber(payment.total)}</td>
      </tr>
    `).join("");

    printHtml(`
      <h1>Resumen de pago por trabajador</h1>
      <p>Periodo: ${fromDate || "Inicio"} a ${toDate || "Hoy"}</p>
      <p>Trabajadores: ${totals.workers} | Total neto: $ ${formatNumber(totals.total)}</p>
      <table>
        <thead><tr><th>Trabajador</th><th>Reportes</th><th>Normales</th><th>Extras</th><th>Descuentos</th><th>Neto</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='6'>Sin datos</td></tr>"}</tbody>
      </table>
    `);
  }

  return (
    <SystemModulePage moduleKey="payment-calculation">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Desde">
            <input type="date" className={inputClass} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <input type="date" className={inputClass} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <Field label="Valor hora normal">
            <input type="number" min="0" step="0.01" className={inputClass} value={normalRate} onChange={(e) => setNormalRate(Number(e.target.value))} />
          </Field>
          <Field label="Valor hora extra">
            <input type="number" min="0" step="0.01" className={inputClass} value={overtimeRate} onChange={(e) => setOvertimeRate(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={exportCsv} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Exportar Excel CSV</button>
          <button onClick={exportPdf} className="rounded-md border border-[#173C61] px-5 py-3 font-semibold text-[#173C61] hover:bg-[#E6F8F9]">Exportar PDF</button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Summary label="Trabajadores" value={String(totals.workers)} />
        <Summary label="Total bruto" value={`$ ${formatNumber(totals.gross)}`} />
        <Summary label="Descuentos" value={`$ ${formatNumber(totals.fines)}`} />
        <Summary label="Total neto" value={`$ ${formatNumber(totals.total)}`} />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.3fr_0.6fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Trabajador</span>
          <span>Reportes</span>
          <span>Normales</span>
          <span>Extras</span>
          <span>Atrasos</span>
          <span>Descuentos</span>
          <span>Neto</span>
        </div>
        {payments.map((payment) => (
          <div key={payment.workerKey} className="grid grid-cols-[1.3fr_0.6fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-[#173C61]">{payment.workerName}</span>
            <span>{payment.reports}</span>
            <span>{formatNumber(payment.normalHours)}</span>
            <span>{formatNumber(payment.overtimeHours)}</span>
            <span>{payment.delayMinutes} min</span>
            <span>$ {formatNumber(payment.fines)}</span>
            <span className="font-bold text-[#173C61]">$ {formatNumber(payment.total)}</span>
          </div>
        ))}
        {payments.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No hay reportes aprobados en el periodo seleccionado.</p>}
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

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
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
    <html><head><title>Pagos ASOSERLID</title><style>
      body { font-family: Arial, sans-serif; color: #1f2937; padding: 28px; }
      h1 { color: #173C61; margin-bottom: 6px; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #d8e0ea; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #edf6f7; color: #173C61; }
    </style></head><body>${body}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}
