"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

export default function AccountingPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);

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

  const totals = useMemo(() => reports.reduce(
    (acc, report) => ({
      normal: acc.normal + Number(report.normalHours || 0),
      overtime: acc.overtime + Number(report.overtimeHours || 0),
      fines: acc.fines + Number(report.fineAmount || 0),
      delays: acc.delays + Number(report.delayMinutes || 0),
    }),
    { normal: 0, overtime: 0, fines: 0, delays: 0 }
  ), [reports]);

  return (
    <SystemModulePage moduleKey="accounting">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-4 sm:grid-cols-4">
        <Summary label="Reportes aprobados" value={String(reports.length)} />
        <Summary label="Horas normales" value={formatNumber(totals.normal)} />
        <Summary label="Horas extras" value={formatNumber(totals.overtime)} />
        <Summary label="Multas" value={`$ ${formatNumber(totals.fines)}`} />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_0.6fr_0.6fr_0.6fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Trabajador</span>
          <span>Cliente</span>
          <span>Fecha</span>
          <span>Normales</span>
          <span>Extras</span>
          <span>Multas</span>
        </div>
        {reports.map((report) => (
          <div key={report._id} className="grid grid-cols-[1fr_1fr_1fr_0.6fr_0.6fr_0.6fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-[#173C61]">{report.workerName}</span>
            <span>{report.clientName}</span>
            <span>{report.date}</span>
            <span>{formatNumber(report.normalHours)}</span>
            <span>{formatNumber(report.overtimeHours)}</span>
            <span>$ {formatNumber(report.fineAmount)}</span>
          </div>
        ))}
        {reports.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">Contabilidad solo ve reportes aprobados. Todavia no hay registros.</p>}
      </section>
    </SystemModulePage>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#173C61]">{value}</p>
    </div>
  );
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}
