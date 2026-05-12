"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport } from "@/types/admin";

export default function ReportApprovalsPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const selected = useMemo(() => reports.find((report) => report._id === selectedId) || reports[0], [reports, selectedId]);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (selected?._id && !selectedId) setSelectedId(selected._id);
    setApprovalNotes(selected?.approvalNotes || "");
  }, [selected, selectedId]);

  async function loadReports() {
    const res = await fetch("/api/admin/supervisor-reports", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar reportes.");
      return;
    }
    setReports((data.items || []).filter((report: SupervisorReport) => report.reportStatus !== "draft"));
  }

  async function changeStatus(nextStatus: SupervisorReport["reportStatus"]) {
    if (!selected?._id || !nextStatus) return;
    setStatus("Actualizando reporte...");

    const res = await fetch(`/api/admin/supervisor-reports/${selected._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...selected, reportStatus: nextStatus, approvalNotes }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo actualizar el reporte.");
      return;
    }

    setStatus("Reporte actualizado.");
    await loadReports();
  }

  return (
    <SystemModulePage moduleKey="report-approvals">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Reportes enviados</h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <button
                key={report._id}
                onClick={() => setSelectedId(report._id || "")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selected?._id === report._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{report.workerName}</span>
                <span className="mt-1 block text-xs text-slate-500">{report.date} - {statusLabel(report.reportStatus)}</span>
              </button>
            ))}
            {reports.length === 0 && <p className="text-sm text-slate-500">No hay reportes enviados.</p>}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {selected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Trabajador" value={selected.workerName} />
                <Info label="Supervisor" value={selected.supervisor} />
                <Info label="Cliente" value={selected.clientName} />
                <Info label="Fecha" value={selected.date} />
                <Info label="Horas normales" value={formatNumber(selected.normalHours)} />
                <Info label="Horas extras" value={formatNumber(selected.overtimeHours)} />
                <Info label="Asistencia" value={attendanceLabel(selected.attendanceStatus)} />
                <Info label="Multas" value={`$ ${formatNumber(selected.fineAmount)}`} />
                <Info label="Estado" value={statusLabel(selected.reportStatus)} />
              </div>

              <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
                Observacion de aprobacion
                <textarea className={`${inputClass} min-h-28`} value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} />
              </label>

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => changeStatus("approved")} className="rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">Aprobar</button>
                <button onClick={() => changeStatus("observed")} className="rounded-md bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700">Observar</button>
                <button onClick={() => changeStatus("rejected")} className="rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">Rechazar</button>
              </div>
            </>
          ) : (
            <p className="text-slate-600">Selecciona un reporte para revisar.</p>
          )}
        </section>
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-[#173C61]">{value || "Sin dato"}</p>
    </div>
  );
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
