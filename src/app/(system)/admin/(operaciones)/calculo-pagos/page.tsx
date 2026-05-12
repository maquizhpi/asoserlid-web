"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

type WorkerPayment = {
  workerName: string;
  normalHours: number;
  overtimeHours: number;
  fines: number;
  delayMinutes: number;
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
      const current = grouped.get(key) || { workerName: report.workerName, normalHours: 0, overtimeHours: 0, fines: 0, delayMinutes: 0, total: 0 };
      current.normalHours += Number(report.normalHours || 0);
      current.overtimeHours += Number(report.overtimeHours || 0);
      current.fines += Number(report.fineAmount || 0);
      current.delayMinutes += Number(report.delayMinutes || 0);
      current.total = current.normalHours * normalRate + current.overtimeHours * overtimeRate - current.fines;
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }, [filtered, normalRate, overtimeRate]);

  return (
    <SystemModulePage moduleKey="payment-calculation">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-4">
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
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]">
          <span>Trabajador</span>
          <span>Normales</span>
          <span>Extras</span>
          <span>Atrasos</span>
          <span>Descuentos</span>
          <span>Total</span>
        </div>
        {payments.map((payment) => (
          <div key={payment.workerName} className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-[#173C61]">{payment.workerName}</span>
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

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}
