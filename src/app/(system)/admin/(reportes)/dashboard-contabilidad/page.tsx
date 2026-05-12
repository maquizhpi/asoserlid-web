"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

export default function AccountingDashboardPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/supervisor-reports", { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => ok ? setReports(data.items || []) : setStatus(data.error || "No se pudo cargar dashboard."));
  }, []);

  const stats = useMemo(() => {
    const approved = reports.filter((report) => report.reportStatus === "approved");
    return {
      pending: reports.filter((report) => report.reportStatus === "submitted").length,
      approved: approved.length,
      normalHours: approved.reduce((sum, report) => sum + Number(report.normalHours || 0), 0),
      overtimeHours: approved.reduce((sum, report) => sum + Number(report.overtimeHours || 0), 0),
    };
  }, [reports]);

  return (
    <SystemModulePage moduleKey="dashboard-accounting">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}
      <section className="grid gap-4 sm:grid-cols-4">
        <Card label="Pendientes" value={String(stats.pending)} />
        <Card label="Aprobados" value={String(stats.approved)} />
        <Card label="Horas normales" value={stats.normalHours.toFixed(2)} />
        <Card label="Horas extras" value={stats.overtimeHours.toFixed(2)} />
      </section>
    </SystemModulePage>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#173C61]">{value}</p></div>;
}
