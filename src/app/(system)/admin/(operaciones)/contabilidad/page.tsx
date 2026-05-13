"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

export default function AccountingPage() {
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

  const totals = useMemo(() => filtered.reduce(
    (acc, report) => {
      const normal = Number(report.normalHours || 0);
      const overtime = Number(report.overtimeHours || 0);
      const fines = Number(report.fineAmount || 0);
      return {
        normal: acc.normal + normal,
        overtime: acc.overtime + overtime,
        fines: acc.fines + fines,
        delays: acc.delays + Number(report.delayMinutes || 0),
        gross: acc.gross + normal * normalRate + overtime * overtimeRate,
        net: acc.net + normal * normalRate + overtime * overtimeRate - fines,
      };
    },
    { normal: 0, overtime: 0, fines: 0, delays: 0, gross: 0, net: 0 }
  ), [filtered, normalRate, overtimeRate]);

  const grouped = useMemo(() => {
    const map = new Map<string, { worker: string; reports: number; gross: number; fines: number; net: number }>();
    filtered.forEach((report) => {
      const key = report.workerId || report.workerName;
      const normal = Number(report.normalHours || 0);
      const overtime = Number(report.overtimeHours || 0);
      const fines = Number(report.fineAmount || 0);
      const gross = normal * normalRate + overtime * overtimeRate;
      const current = map.get(key) || { worker: report.workerName, reports: 0, gross: 0, fines: 0, net: 0 };
      current.reports += 1;
      current.gross += gross;
      current.fines += fines;
      current.net += gross - fines;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => a.worker.localeCompare(b.worker));
  }, [filtered, normalRate, overtimeRate]);

  const validation = filtered.length === 0
    ? "Sin reportes aprobados para validar."
    : totals.net >= 0
      ? "Cuadre correcto: el neto contable coincide con los reportes aprobados y descuentos."
      : "Revisar: los descuentos superan el bruto calculado.";

  return (
    <SystemModulePage moduleKey="accounting">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
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
        <p className={`mt-4 rounded-md px-4 py-3 text-sm font-semibold ${totals.net < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {validation}
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-5">
        <Summary label="Reportes aprobados" value={String(filtered.length)} />
        <Summary label="Horas normales" value={formatNumber(totals.normal)} />
        <Summary label="Horas extras" value={formatNumber(totals.overtime)} />
        <Summary label="Descuentos" value={`$ ${formatNumber(totals.fines)}`} />
        <Summary label="Neto a pagar" value={`$ ${formatNumber(totals.net)}`} />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Trabajador</span>
          <span>Reportes</span>
          <span>Bruto</span>
          <span>Descuentos</span>
          <span>Neto</span>
        </div>
        {grouped.map((item) => (
          <div key={item.worker} className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-[#173C61]">{item.worker}</span>
            <span>{item.reports}</span>
            <span>$ {formatNumber(item.gross)}</span>
            <span>$ {formatNumber(item.fines)}</span>
            <span className="font-bold text-[#173C61]">$ {formatNumber(item.net)}</span>
          </div>
        ))}
        {grouped.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">Contabilidad solo ve reportes aprobados. Todavia no hay registros para validar.</p>}
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

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}
