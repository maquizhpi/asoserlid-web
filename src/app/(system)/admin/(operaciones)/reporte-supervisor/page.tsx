"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type {
  AssignedContractStaff,
  ContractArea,
  ContractShift,
  ContractWorkplace,
  ServiceContract,
  SupervisorReport,
  SupervisorReportStaff,
} from "@/types/admin";

const emptyReport: SupervisorReport = {
  date: new Date().toISOString().slice(0, 10),
  period: new Date().toISOString().slice(0, 7),
  supervisorId: "",
  supervisor: "",
  workerId: "",
  workerName: "Grupo de trabajo",
  clientId: "",
  clientName: "",
  contractId: "",
  contractName: "",
  workplaceId: "",
  workplaceName: "",
  areaId: "",
  areaName: "",
  shiftId: "",
  shiftName: "",
  workGroupId: "",
  workGroupName: "",
  startTime: "",
  endTime: "",
  totalHours: 0,
  normalHours: 0,
  overtimeHours: 0,
  authorizedOvertimeHours: 0,
  delayMinutes: 0,
  fineAmount: 0,
  permissionHours: 0,
  sicknessHours: 0,
  attendanceStatus: "attended",
  reportStatus: "draft",
  approvalNotes: "",
  notes: "",
  staffReports: [],
};

export default function SupervisorDailyReportPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<SupervisorReport>(emptyReport);
  const [status, setStatus] = useState<string | null>(null);

  const selectedReport = useMemo(() => reports.find((report) => report._id === selectedId), [reports, selectedId]);
  const selectedContract = useMemo(() => contracts.find((contract) => contract._id === form.contractId), [contracts, form.contractId]);
  const selectedWorkplace = useMemo(() => selectedContract?.workplaces?.find((workplace) => workplace.id === form.workplaceId), [selectedContract, form.workplaceId]);
  const selectedArea = useMemo(() => selectedWorkplace?.areas.find((area) => area.id === form.areaId), [selectedWorkplace, form.areaId]);

  const contractOptions = useMemo(
    () => contracts.map((contract) => ({ value: contract._id || "", label: `${contract.clientName} - ${contract.serviceType}` })),
    [contracts]
  );
  const workplaceOptions = useMemo(
    () => (selectedContract?.workplaces || []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name })),
    [selectedContract]
  );
  const areaOptions = useMemo(
    () => (selectedWorkplace?.areas || []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name })),
    [selectedWorkplace]
  );
  const shiftOptions = useMemo(
    () => (selectedArea?.shifts || []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: `${item.shiftName} (${item.startTime} - ${item.endTime})` })),
    [selectedArea]
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedReport) setForm(normalizeReport(selectedReport));
  }, [selectedReport]);

  async function loadData() {
    const [reportsRes, contractsRes] = await Promise.all([
      fetch("/api/admin/supervisor-reports", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
    ]);
    const reportsData = await reportsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));

    if (reportsRes.ok) setReports((reportsData.items || []).map(normalizeReport));
    if (contractsRes.ok) setContracts(((contractsData.items || []) as ServiceContract[]).map(normalizeContract).filter((contract) => contract.status !== "finished"));
    if (!reportsRes.ok || !contractsRes.ok) {
      setStatus(reportsData.error || contractsData.error || "No se pudo cargar reportes.");
    }
  }

  function startNewReport() {
    setSelectedId("new");
    setForm({ ...emptyReport, date: new Date().toISOString().slice(0, 10), period: new Date().toISOString().slice(0, 7) });
  }

  function selectContract(option: SelectOption | null) {
    const contract = contracts.find((item) => item._id === option?.value);
    const workplace = contract?.workplaces?.find((item) => item.status === "active");
    applySelection(contract, workplace, workplace?.areas.find((item) => item.status === "active"));
  }

  function selectWorkplace(option: SelectOption | null) {
    const workplace = selectedContract?.workplaces?.find((item) => item.id === option?.value);
    applySelection(selectedContract, workplace, workplace?.areas.find((item) => item.status === "active"));
  }

  function selectArea(option: SelectOption | null) {
    const area = selectedWorkplace?.areas.find((item) => item.id === option?.value);
    applySelection(selectedContract, selectedWorkplace, area);
  }

  function selectShift(option: SelectOption | null) {
    const shift = selectedArea?.shifts.find((item) => item.id === option?.value);
    applySelection(selectedContract, selectedWorkplace, selectedArea, shift);
  }

  function applySelection(contract?: ServiceContract, workplace?: ContractWorkplace, area?: ContractArea, shift?: ContractShift) {
    const nextShift = shift || area?.shifts.find((item) => item.status === "active");
    const staffReports = buildStaffReports(nextShift);
    setForm(summarizeReport({
      ...emptyReport,
      _id: selectedId === "new" ? undefined : form._id,
      date: form.date,
      period: form.period || form.date.slice(0, 7),
      reportStatus: form.reportStatus || "draft",
      contractId: contract?._id || "",
      contractName: contract ? `${contract.clientName} - ${contract.serviceType}` : "",
      clientId: contract?.clientId || "",
      clientName: contract?.clientName || "",
      workGroupId: contract?.workGroupId || "",
      workGroupName: contract?.workGroupName || "",
      workplaceId: workplace?.id || "",
      workplaceName: workplace?.name || "",
      supervisorId: workplace?.supervisorId || "",
      supervisor: workplace?.supervisorName || "",
      areaId: area?.id || "",
      areaName: area?.name || "",
      shiftId: nextShift?.id || "",
      shiftName: nextShift?.shiftName || "",
      startTime: nextShift?.startTime || "",
      endTime: nextShift?.endTime || "",
      staffReports,
    }));
  }

  function updateStaff(staffId: string, next: Partial<SupervisorReportStaff>) {
    const staffReports = (form.staffReports || []).map((staff) => {
      if (staff.id !== staffId) return staff;
      return calculateStaffHours({ ...staff, ...next });
    });
    setForm(summarizeReport({ ...form, staffReports }));
  }

  function updateStaffAttendance(staffId: string, attendanceStatus: SupervisorReportStaff["attendanceStatus"]) {
    const scheduledHours = calculateHours(form.startTime || "", form.endTime || "");
    const staffReports = (form.staffReports || []).map((staff) => {
      if (staff.id !== staffId) return staff;

      const resetToSchedule = {
        attendanceStatus,
        startTime: form.startTime || staff.startTime || "",
        endTime: form.endTime || staff.endTime || "",
        permissionHours: 0,
        sicknessHours: 0,
      };

      if (attendanceStatus === "absent") {
        return calculateStaffHours({
          ...staff,
          attendanceStatus,
          startTime: "",
          endTime: "",
          delayMinutes: 0,
          permissionHours: 0,
          sicknessHours: 0,
        });
      }

      if (attendanceStatus === "permission") {
        return calculateStaffHours({
          ...staff,
          attendanceStatus,
          startTime: "",
          endTime: "",
          delayMinutes: 0,
          permissionHours: scheduledHours,
          sicknessHours: 0,
        });
      }

      if (attendanceStatus === "sick") {
        return calculateStaffHours({
          ...staff,
          attendanceStatus,
          startTime: "",
          endTime: "",
          delayMinutes: 0,
          permissionHours: 0,
          sicknessHours: scheduledHours,
        });
      }

      return calculateStaffHours({ ...staff, ...resetToSchedule });
    });
    setForm(summarizeReport({ ...form, staffReports }));
  }

  async function saveReport(e?: FormEvent, nextStatus = form.reportStatus || "draft") {
    e?.preventDefault();
    const payload = summarizeReport({ ...form, reportStatus: nextStatus, period: form.period || form.date.slice(0, 7) });
    if (!payload.contractId || !payload.workplaceId || !payload.areaId || !payload.shiftId) {
      setStatus("Selecciona contrato, lugar, area y turno antes de guardar.");
      return;
    }
    if (!payload.staffReports?.length) {
      setStatus("El turno seleccionado no tiene personal asignado.");
      return;
    }

    setStatus("Guardando reporte...");
    const isNew = selectedId === "new";
    const res = await fetch(isNew ? "/api/admin/supervisor-reports" : `/api/admin/supervisor-reports/${selectedId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || "No se pudo guardar el reporte.");
      return;
    }

    setStatus(nextStatus === "submitted" ? "Reporte enviado para aprobacion." : "Reporte guardado correctamente.");
    await loadData();
    setSelectedId(data.item?._id || "new");
  }

  async function deleteReport() {
    if (selectedId === "new") return;
    if (!window.confirm("Eliminar este reporte?")) return;

    const res = await fetch(`/api/admin/supervisor-reports/${selectedId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo eliminar el reporte.");
      return;
    }

    setStatus("Reporte eliminado.");
    startNewReport();
    await loadData();
  }

  return (
    <SystemModulePage moduleKey="supervisor-daily-report">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={startNewReport} className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
            Nuevo reporte
          </button>

          <div className="space-y-2">
            {reports.map((report) => (
              <button
                key={report._id}
                onClick={() => setSelectedId(report._id || "new")}
                className={`w-full rounded-md border px-4 py-3 text-left transition ${
                  selectedId === report._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-[#173C61]">{report.clientName}</span>
                <span className="mt-1 block text-xs text-slate-500">{report.date} - {report.workplaceName || report.workerName} - {statusLabel(report.reportStatus)}</span>
              </button>
            ))}
            {reports.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">No hay reportes para mostrar.</p>}
          </div>
        </aside>

        <form onSubmit={(e) => saveReport(e)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input required type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, period: e.target.value.slice(0, 7) })} />
            </Field>
            <Field label="Periodo">
              <input type="month" className={inputClass} value={form.period || form.date.slice(0, 7)} onChange={(e) => setForm({ ...form, period: e.target.value })} />
            </Field>
            <SearchableSelect label="Contrato" value={form.contractId || ""} options={contractOptions} placeholder="Buscar contrato..." onChange={selectContract} />
            <Field label="Supervisor">
              <input className={inputClass} value={form.supervisor || "Selecciona un lugar con supervisor"} readOnly />
            </Field>
            <SearchableSelect label="Lugar de trabajo" value={form.workplaceId || ""} options={workplaceOptions} placeholder="Seleccionar lugar..." onChange={selectWorkplace} />
            <SearchableSelect label="Area" value={form.areaId || ""} options={areaOptions} placeholder="Seleccionar area..." onChange={selectArea} />
            <SearchableSelect label="Turno" value={form.shiftId || ""} options={shiftOptions} placeholder="Seleccionar turno..." onChange={selectShift} />
            <Field label="Grupo de trabajo">
              <input className={inputClass} value={form.workGroupName || "Sin grupo vinculado"} readOnly />
            </Field>
          </div>

          <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-[#173C61]">Seguimiento del personal</h2>
                      <p className="text-sm text-slate-600">{form.workplaceName || "Lugar"} / {form.areaName || "Area"} / {form.shiftName || "Turno"}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Se carga cumplido segun horario. Edita solo atrasos, faltas, permisos, enfermedad, horas extra o multas.
                </p>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-sm font-bold text-[#173C61]">{form.staffReports?.length || 0} trabajadores</span>
            </div>

            <div className="space-y-3">
              {(form.staffReports || []).map((staff) => (
                <details key={staff.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-bold text-[#173C61]">{staff.workerName}</h3>
                        <p className="text-sm text-slate-600">{staff.documentId || "Sin cedula"} | {staff.position || "Sin cargo"} | {attendanceLabel(staff.attendanceStatus)}</p>
                      </div>
                      <p className="text-sm font-bold text-[#173C61]">{formatNumber(staff.totalHours)} h</p>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Asistencia">
                      <select className={inputClass} value={staff.attendanceStatus} onChange={(e) => updateStaffAttendance(staff.id, e.target.value as SupervisorReportStaff["attendanceStatus"])}>
                        <option value="attended">Asistio</option>
                        <option value="absent">Falto</option>
                        <option value="permission">Permiso</option>
                        <option value="sick">Enfermedad</option>
                        <option value="late">Retraso</option>
                        <option value="replacement">Reemplazo</option>
                      </select>
                    </Field>
                    <Field label="Hora entrada"><input type="time" className={inputClass} value={staff.startTime || ""} onChange={(e) => updateStaff(staff.id, { startTime: e.target.value })} /></Field>
                    <Field label="Hora salida"><input type="time" className={inputClass} value={staff.endTime || ""} onChange={(e) => updateStaff(staff.id, { endTime: e.target.value })} /></Field>
                    <Field label="Horas normales"><input className={inputClass} value={formatNumber(staff.normalHours)} readOnly /></Field>
                    <Field label="Horas extras autorizadas"><input type="number" min="0" step="0.25" className={inputClass} value={staff.authorizedOvertimeHours || 0} onChange={(e) => updateStaff(staff.id, { authorizedOvertimeHours: Number(e.target.value) })} /></Field>
                    <Field label="Horas extras"><input className={inputClass} value={formatNumber(staff.overtimeHours)} readOnly /></Field>
                    <Field label="Atraso minutos"><input type="number" min="0" className={inputClass} value={staff.delayMinutes || 0} onChange={(e) => updateStaff(staff.id, { delayMinutes: Number(e.target.value) })} /></Field>
                    <Field label="Multa / descuento"><input type="number" min="0" step="0.01" className={inputClass} value={staff.fineAmount || 0} onChange={(e) => updateStaff(staff.id, { fineAmount: Number(e.target.value) })} /></Field>
                    <Field label="Horas permiso"><input type="number" min="0" step="0.25" className={inputClass} value={staff.permissionHours || 0} onChange={(e) => updateStaff(staff.id, { permissionHours: Number(e.target.value) })} /></Field>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-3">
                      Novedad
                      <textarea className={`${inputClass} min-h-20`} value={staff.notes || ""} onChange={(e) => updateStaff(staff.id, { notes: e.target.value })} />
                    </label>
                  </div>
                </details>
              ))}
              {(!form.staffReports || form.staffReports.length === 0) && <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">Selecciona un turno con personal asignado.</p>}
            </div>
          </section>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Novedades generales del contrato
            <textarea className={`${inputClass} min-h-24`} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Info label="Total horas" value={formatNumber(form.totalHours)} />
            <Info label="Horas normales" value={formatNumber(form.normalHours)} />
            <Info label="Horas extras" value={formatNumber(form.overtimeHours)} />
            <Info label="Multas" value={`$ ${formatNumber(form.fineAmount)}`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar reporte</button>
            <button type="button" onClick={() => saveReport(undefined, "submitted")} className="rounded-md bg-[#218F93] px-5 py-3 font-semibold text-white hover:bg-[#173C61]">
              Enviar para aprobacion
            </button>
            {selectedId !== "new" && (
              <button type="button" onClick={deleteReport} className="rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
                Eliminar
              </button>
            )}
          </div>
        </form>
      </section>
    </SystemModulePage>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-[#173C61]">{value}</p>
    </div>
  );
}

function buildStaffReports(shift?: ContractShift): SupervisorReportStaff[] {
  return (shift?.assignedStaff || [])
    .filter((staff) => staff.assignmentStatus === "active")
    .map((staff) => calculateStaffHours({
      id: staff.id || staff.workerId,
      workerId: staff.workerId,
      workerName: staffName(staff),
      documentId: staff.documentId,
      position: staff.position,
      startTime: shift?.startTime || "",
      endTime: shift?.endTime || "",
      totalHours: 0,
      normalHours: 0,
      overtimeHours: 0,
      authorizedOvertimeHours: 0,
      delayMinutes: 0,
      fineAmount: 0,
      permissionHours: 0,
      sicknessHours: 0,
      attendanceStatus: "attended",
      notes: "",
    }));
}

function calculateStaffHours(staff: SupervisorReportStaff) {
  if (["absent", "permission", "sick"].includes(staff.attendanceStatus)) {
    return {
      ...staff,
      totalHours: 0,
      normalHours: 0,
      overtimeHours: 0,
      authorizedOvertimeHours: 0,
    };
  }

  const totalHours = calculateHours(staff.startTime || "", staff.endTime || "");
  const authorizedOvertimeHours = Number(staff.authorizedOvertimeHours || 0);
  return {
    ...staff,
    totalHours,
    normalHours: Math.min(totalHours, 8),
    overtimeHours: Math.min(Math.max(totalHours - 8, 0), authorizedOvertimeHours),
  };
}

function summarizeReport(report: SupervisorReport): SupervisorReport {
  const staffReports = (report.staffReports || []).map(calculateStaffHours);
  const totals = staffReports.reduce(
    (acc, staff) => ({
      totalHours: acc.totalHours + Number(staff.totalHours || 0),
      normalHours: acc.normalHours + Number(staff.normalHours || 0),
      overtimeHours: acc.overtimeHours + Number(staff.overtimeHours || 0),
      authorizedOvertimeHours: acc.authorizedOvertimeHours + Number(staff.authorizedOvertimeHours || 0),
      delayMinutes: acc.delayMinutes + Number(staff.delayMinutes || 0),
      fineAmount: acc.fineAmount + Number(staff.fineAmount || 0),
      permissionHours: acc.permissionHours + Number(staff.permissionHours || 0),
      sicknessHours: acc.sicknessHours + Number(staff.sicknessHours || 0),
    }),
    { totalHours: 0, normalHours: 0, overtimeHours: 0, authorizedOvertimeHours: 0, delayMinutes: 0, fineAmount: 0, permissionHours: 0, sicknessHours: 0 }
  );
  return {
    ...report,
    ...totals,
    staffReports,
    workerId: staffReports.length === 1 ? staffReports[0].workerId : "",
    workerName: staffReports.length === 1 ? staffReports[0].workerName : `${staffReports.length} trabajadores`,
    attendanceStatus: staffReports.some((staff) => staff.attendanceStatus === "absent") ? "absent" : "attended",
  };
}

function normalizeReport(report: SupervisorReport): SupervisorReport {
  const staffReports = report.staffReports?.length
    ? report.staffReports
    : report.workerName
      ? [{
          id: report.workerId || report.workerName,
          workerId: report.workerId || "",
          workerName: report.workerName,
          startTime: report.startTime,
          endTime: report.endTime,
          totalHours: report.totalHours,
          normalHours: report.normalHours,
          overtimeHours: report.overtimeHours,
          authorizedOvertimeHours: report.authorizedOvertimeHours,
          delayMinutes: report.delayMinutes,
          fineAmount: report.fineAmount,
          permissionHours: report.permissionHours,
          sicknessHours: report.sicknessHours,
          attendanceStatus: report.attendanceStatus,
          notes: report.notes,
        }]
      : [];
  return summarizeReport({ ...emptyReport, ...report, period: report.period || report.date?.slice(0, 7), staffReports });
}

function normalizeContract(contract: ServiceContract): ServiceContract {
  return { ...contract, workplaces: contract.workplaces || [] };
}

function calculateHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end < start) end += 24 * 60;
  return Number(((end - start) / 60).toFixed(2));
}

function staffName(staff: AssignedContractStaff) {
  return `${staff.firstName} ${staff.lastName}`.trim();
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}

function statusLabel(status?: SupervisorReport["reportStatus"]) {
  return { draft: "Borrador", submitted: "Enviado", observed: "Observado", approved: "Aprobado", rejected: "Rechazado" }[status || "draft"];
}

function attendanceLabel(status: SupervisorReportStaff["attendanceStatus"]) {
  return { attended: "Asistio", absent: "Falto", permission: "Permiso", sick: "Enfermedad", late: "Retraso", replacement: "Reemplazo" }[status];
}
