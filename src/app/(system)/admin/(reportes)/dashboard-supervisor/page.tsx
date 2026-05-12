"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

export default function SupervisorDashboardPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/supervisor-reports", { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => ok ? setReports(data.items || []) : setStatus(data.error || "No se pudo cargar dashboard."));
  }, []);

  const stats = useMemo(() => ({
    submitted: reports.filter((report) => report.reportStatus === "submitted").length,
    observed: reports.filter((report) => report.reportStatus === "observed").length,
    approved: reports.filter((report) => report.reportStatus === "approved").length,
    pending: reports.filter((report) => ["draft", "submitted", "observed"].includes(report.reportStatus || "draft")).length,
  }), [reports]);

  return (
    <SystemModulePage moduleKey="dashboard-supervisor">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}
      <section className="grid gap-4 sm:grid-cols-4">
        <Card label="Pendientes" value={stats.pending} />
        <Card label="Enviados" value={stats.submitted} />
        <Card label="Observados" value={stats.observed} />
        <Card label="Aprobados" value={stats.approved} />
      </section>
    </SystemModulePage>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#173C61]">{value}</p></div>;
}
