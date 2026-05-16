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
            {reports.map((report) => {
              const signal = reportSignal(report.reportStatus);
              return (
                <button
                  key={report._id}
                  onClick={() => setSelectedId(report._id || "")}
                  className={`w-full rounded-md border-l-4 px-4 py-3 text-left transition ${signal.card} ${
                    selected?._id === report._id ? "ring-2 ring-[#173C61]/35" : "hover:shadow-sm"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="block font-semibold text-[#173C61]">{report.clientName}</span>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${signal.badge}`}>
                      <span className={`h-2 w-2 rounded-full ${signal.dot}`} />
                      {statusLabel(report.reportStatus)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{report.date} - {report.workplaceName || report.workerName}</span>
                </button>
              );
            })}
            {reports.length === 0 && <p className="text-sm text-slate-500">No hay reportes enviados.</p>}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {selected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Contrato" value={selected.contractName || selected.clientName} />
                <Info label="Supervisor" value={selected.supervisor} />
                <Info label="Cliente" value={selected.clientName} />
                <Info label="Fecha" value={selected.date} />
                <Info label="Lugar" value={selected.workplaceName || "Sin lugar"} />
                <Info label="Area / turno" value={`${selected.areaName || "Sin area"} - ${selected.shiftName || "Sin turno"}`} />
                <Info label="Horas normales" value={formatNumber(selected.normalHours)} />
                <Info label="Horas extras" value={formatNumber(selected.overtimeHours)} />
                <Info label="Trabajadores" value={String(selected.staffReports?.length || 1)} />
                <Info label="Multas" value={`$ ${formatNumber(selected.fineAmount)}`} />
                <StatusInfo label="Estado" status={selected.reportStatus} />
              </div>

              <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h2 className="mb-3 font-bold text-[#173C61]">Detalle del personal</h2>
                <div className="space-y-3">
                  {getStaffReports(selected).map((staff) => {
                    const signal = staffComplianceSignal(staff);
                    return (
                    <details key={staff.id} className={`rounded-md border-l-4 bg-white p-4 ${signal.card}`}>
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-[#173C61]">{staff.workerName}</h3>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${signal.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${signal.dot}`} />
                                {signal.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">{staff.documentId || "Sin cedula"} | {staff.position || "Sin cargo"} | {attendanceLabel(staff.attendanceStatus)}</p>
                          </div>
                          <p className="text-sm font-bold text-[#173C61]">{formatNumber(staff.totalHours)} h</p>
                        </div>
                      </summary>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <Info label="Entrada" value={staff.startTime || "Sin hora"} />
                        <Info label="Salida" value={staff.endTime || "Sin hora"} />
                        <Info label="Normales" value={formatNumber(staff.normalHours)} />
                        <Info label="Extras" value={formatNumber(staff.overtimeHours)} />
                        <Info label="Atraso" value={`${staff.delayMinutes || 0} min`} />
                        <Info label="Multa" value={`$ ${formatNumber(staff.fineAmount)}`} />
                        <Info label="Permiso" value={formatNumber(staff.permissionHours)} />
                        <Info label="Novedad" value={staff.notes || "Sin novedad"} />
                      </div>
                    </details>
                    );
                  })}
                </div>
              </section>

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

function StatusInfo({ label, status }: { label: string; status?: SupervisorReport["reportStatus"] }) {
  const signal = reportSignal(status);
  return (
    <div className={`rounded-md border-l-4 p-3 ${signal.card}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${signal.badge}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${signal.dot}`} />
        {statusLabel(status)}
      </p>
    </div>
  );
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}

function statusLabel(status?: SupervisorReport["reportStatus"]) {
  return { draft: "Borrador", submitted: "Enviado", observed: "Observado", approved: "Aprobado", rejected: "Rechazado" }[status || "draft"];
}

function getStaffReports(report: SupervisorReport) {
  if (report.staffReports?.length) return report.staffReports;
  return [{
    id: report.workerId || report.workerName,
    workerId: report.workerId || "",
    workerName: report.workerName,
    startTime: report.startTime,
    endTime: report.endTime,
    totalHours: report.totalHours,
    normalHours: report.normalHours,
    overtimeHours: report.overtimeHours,
    delayMinutes: report.delayMinutes,
    fineAmount: report.fineAmount,
    permissionHours: report.permissionHours,
    attendanceStatus: report.attendanceStatus,
    notes: report.notes,
  }];
}

function attendanceLabel(status: SupervisorReport["attendanceStatus"]) {
  return { attended: "Asistio", absent: "Falto", permission: "Permiso", sick: "Enfermedad", late: "Retraso", replacement: "Reemplazo" }[status];
}

function reportSignal(status?: SupervisorReport["reportStatus"]) {
  const signals = {
    approved: {
      card: "border-l-emerald-500 border-slate-200 bg-emerald-50/60",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-600",
    },
    submitted: {
      card: "border-l-amber-500 border-slate-200 bg-amber-50/60",
      badge: "border-amber-200 bg-amber-100 text-amber-800",
      dot: "bg-amber-500",
    },
    observed: {
      card: "border-l-orange-500 border-slate-200 bg-orange-50/60",
      badge: "border-orange-200 bg-orange-100 text-orange-800",
      dot: "bg-orange-500",
    },
    rejected: {
      card: "border-l-red-600 border-slate-200 bg-red-50/60",
      badge: "border-red-200 bg-red-100 text-red-800",
      dot: "bg-red-600",
    },
    draft: {
      card: "border-l-slate-400 border-slate-200 bg-white",
      badge: "border-slate-200 bg-slate-100 text-slate-700",
      dot: "bg-slate-400",
    },
  };
  return signals[status || "draft"];
}

function staffComplianceSignal(staff: ReturnType<typeof getStaffReports>[number]) {
  if (staff.attendanceStatus === "absent" || Number(staff.fineAmount || 0) > 0) {
    return {
      label: "Incumplimiento",
      card: "border-l-red-600 border-slate-200",
      badge: "border-red-200 bg-red-100 text-red-800",
      dot: "bg-red-600",
    };
  }
  if (staff.attendanceStatus === "late" || staff.attendanceStatus === "permission" || staff.attendanceStatus === "sick" || Number(staff.delayMinutes || 0) > 0) {
    return {
      label: "Con novedad",
      card: "border-l-amber-500 border-slate-200",
      badge: "border-amber-200 bg-amber-100 text-amber-800",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "Cumplido",
    card: "border-l-emerald-500 border-slate-200",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-600",
  };
}
