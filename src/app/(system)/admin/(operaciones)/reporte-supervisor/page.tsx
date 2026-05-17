"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import { notifySystem } from "@/components/system/SystemNotifier";
import type {
  AssignedContractStaff,
  ContractArea,
  ContractShift,
  ContractWorkplace,
  ServiceContract,
  SupervisorReport,
  SupervisorReportStaff,
} from "@/types/admin";

type SessionUser = {
  name: string;
  email: string;
  roles: string[];
  moduleAccess: string[];
};

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
  lunchBreakMinutes: 0,
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<SupervisorReport>(emptyReport);
  const [status, setStatus] = useState<string | null>(null);

  const selectedReport = useMemo(() => reports.find((report) => report._id === selectedId), [reports, selectedId]);
  const selectedContract = useMemo(() => contracts.find((contract) => contract._id === form.contractId), [contracts, form.contractId]);
  const selectedWorkplace = useMemo(() => selectedContract?.workplaces?.find((workplace) => workplace.id === form.workplaceId), [selectedContract, form.workplaceId]);
  const selectedArea = useMemo(() => selectedWorkplace?.areas.find((area) => area.id === form.areaId), [selectedWorkplace, form.areaId]);

  const isAdministrator = Boolean(sessionUser?.roles.includes("administrator"));
  const canSubmitAttendance = Boolean(sessionUser?.roles.some((role) => ["administrator", "general_manager", "general_supervisor", "supervisor", "operations"].includes(role)));
  const visibleContracts = useMemo(() => filterContractsBySession(contracts, sessionUser), [contracts, sessionUser]);
  const visibleReports = useMemo(() => filterReportsBySession(reports, sessionUser), [reports, sessionUser]);
  const contractOptions = useMemo(
    () => visibleContracts.map((contract) => ({ value: contract._id || "", label: `${contract.clientName} - ${contract.serviceType}` })),
    [visibleContracts]
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
    () => (selectedArea?.shifts || []).filter((item) => item.status === "active").map((item) => ({
      value: item.id,
      label: `${item.shiftName} (${item.startTime} - ${item.endTime}${Number(item.lunchBreakMinutes || 0) > 0 ? `, almuerzo ${item.lunchBreakMinutes} min` : ""})`,
    })),
    [selectedArea]
  );
  const existingAttendance = useMemo(() => findAttendanceReport(reports, form), [reports, form]);
  const isApprovedLocked = form.reportStatus === "approved" && !isAdministrator;
  const isSubmittedLocked = form.reportStatus === "submitted" && selectedId !== "new";
  const isReadOnly = isApprovedLocked || isSubmittedLocked || !canSubmitAttendance;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedReport) setForm(normalizeReport(selectedReport));
  }, [selectedReport]);

  async function loadData() {
    const [reportsRes, contractsRes, meRes] = await Promise.all([
      fetch("/api/admin/supervisor-reports", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
      fetch("/api/admin/me", { cache: "no-store" }),
    ]);
    const reportsData = await reportsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));
    const meData = await meRes.json().catch(() => ({}));

    if (reportsRes.ok) setReports((reportsData.items || []).map(normalizeReport));
    if (contractsRes.ok) setContracts(((contractsData.items || []) as ServiceContract[]).map(normalizeContract).filter((contract) => contract.status !== "finished"));
    if (meRes.ok) setSessionUser(meData.user || null);
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
    const nextReport = summarizeReport({
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
      lunchBreakMinutes: Number(nextShift?.lunchBreakMinutes || 0),
      staffReports,
    });
    const existing = findAttendanceReport(reports, nextReport);
    if (existing) {
      setSelectedId(existing._id || "new");
      setForm(normalizeReport(existing));
      notifySystem(`Asistencia registrada para este dia: ${statusLabel(existing.reportStatus)}.`, { tone: existing.reportStatus === "approved" ? "success" : "info", title: "Asistencia registrada" });
      return;
    }
    setForm(nextReport);
  }

  function updateStaff(staffId: string, next: Partial<SupervisorReportStaff>) {
    if (isReadOnly) return notifySystem("Este reporte ya fue enviado o aprobado y no se puede modificar.", { tone: "warning" });
    const staffReports = (form.staffReports || []).map((staff) => {
      if (staff.id !== staffId) return staff;
      return calculateStaffHours({ ...staff, ...next });
    });
    setForm(summarizeReport({ ...form, staffReports }));
  }

  async function uploadStaffSupportDocument(staffId: string, file?: File) {
    if (isReadOnly) return notifySystem("Este reporte ya fue enviado o aprobado y no se puede modificar.", { tone: "warning" });
    if (!file) return;
    setStatus("Subiendo documento de respaldo...");

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("folderName", "reportes-supervisor");
    const uploadRes = await fetch("/api/admin/document-upload", { method: "POST", body: uploadForm });
    const uploadData = await uploadRes.json().catch(() => ({}));

    if (!uploadRes.ok) {
      setStatus(uploadData.error || "No se pudo subir el documento de respaldo.");
      notifySystem(uploadData.error || "No se pudo subir el documento de respaldo.", { tone: "error", title: "No se pudo completar" });
      return;
    }

    updateStaff(staffId, {
      supportDocumentUrl: uploadData.url,
      supportDocumentPublicId: uploadData.publicId,
      supportDocumentName: uploadData.name || file.name,
    });
    setStatus("Documento de respaldo cargado. Guarda el reporte para conservar el cambio.");
    notifySystem("Documento de respaldo cargado. Guarda el reporte para conservar el cambio.", { tone: "success", title: "Documento cargado" });
  }

  function updateStaffAttendance(staffId: string, attendanceStatus: SupervisorReportStaff["attendanceStatus"]) {
    if (isReadOnly) return notifySystem("Este reporte ya fue enviado o aprobado y no se puede modificar.", { tone: "warning" });
    const scheduledHours = calculateWorkedHours(form.startTime || "", form.endTime || "", form.lunchBreakMinutes || 0);
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
    if (!canSubmitAttendance) {
      setStatus("Tu rol puede revisar la informacion, pero no enviar asistencia.");
      return;
    }
    if (isApprovedLocked) {
      setStatus("Este reporte ya esta aprobado. Solo el administrador puede modificarlo.");
      return;
    }
    if (isSubmittedLocked && nextStatus !== "submitted") {
      setStatus("Este reporte ya fue enviado. No se puede modificar; espera aprobacion u observacion.");
      return;
    }
    const payload = summarizeReport({ ...form, reportStatus: nextStatus, period: form.period || form.date.slice(0, 7) });
    if (!payload.contractId || !payload.workplaceId || !payload.areaId || !payload.shiftId) {
      setStatus("Selecciona contrato, lugar, area y turno antes de guardar.");
      return;
    }
    if (!payload.staffReports?.length) {
      setStatus("El turno seleccionado no tiene personal asignado.");
      return;
    }
    const duplicate = findAttendanceReport(reports, payload);
    if (duplicate && duplicate._id !== selectedId) {
      setStatus("La asistencia de este contrato, lugar, area y turno ya fue registrada para este dia.");
      notifySystem("La asistencia diaria ya esta registrada para este contrato/lugar/area/turno.", { tone: "warning", title: "Asistencia registrada" });
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
    if (isApprovedLocked) {
      setStatus("Este reporte ya esta aprobado. Solo el administrador puede eliminarlo.");
      return;
    }
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
            {visibleReports.map((report) => {
              const signal = reportSignal(report.reportStatus);
              return (
                <button
                  key={report._id}
                  onClick={() => setSelectedId(report._id || "new")}
                  className={`w-full rounded-md border-l-4 px-4 py-3 text-left transition ${signal.card} ${
                    selectedId === report._id ? "ring-2 ring-[#173C61]/35" : "hover:shadow-sm"
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
            {visibleReports.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">No hay reportes para mostrar.</p>}
          </div>
        </aside>

        <form onSubmit={(e) => saveReport(e)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <section className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#173C61]">Contratos visibles</h2>
                <p className="text-sm text-slate-600">Selecciona un contrato para ver sus lugares, areas, turnos y asistencia.</p>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-sm font-bold text-[#173C61]">{visibleContracts.length} contrato(s)</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {visibleContracts.map((contract) => (
                <button
                  key={contract._id}
                  type="button"
                  onClick={() => selectContract({ value: contract._id || "", label: `${contract.clientName} - ${contract.serviceType}` })}
                  className={`rounded-md border px-4 py-3 text-left transition ${form.contractId === contract._id ? "border-[#33C3C9] bg-[#E6F8F9]" : "border-slate-200 bg-white hover:border-[#33C3C9]"}`}
                >
                  <strong className="block text-[#173C61]">{contract.clientName}</strong>
                  <span className="text-xs text-slate-500">{contract.serviceType} | {contract.workGroupName || "Sin grupo"}</span>
                </button>
              ))}
            </div>
          </section>

          {existingAttendance && (
            <p className={`mb-4 rounded-md border px-4 py-3 text-sm font-bold ${existingAttendance.reportStatus === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-cyan-200 bg-cyan-50 text-[#173C61]"}`}>
              Estado: asistencia registrada para este dia ({statusLabel(existingAttendance.reportStatus)}).
            </p>
          )}
          {isReadOnly && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              Este reporte esta bloqueado. {form.reportStatus === "approved" ? "Ya fue aprobado; solo el administrador puede modificarlo." : "Ya fue enviado para aprobacion."}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input required type="date" className={inputClass} value={form.date} disabled={isReadOnly} onChange={(e) => setForm({ ...form, date: e.target.value, period: e.target.value.slice(0, 7) })} />
            </Field>
            <Field label="Periodo">
              <input type="month" className={inputClass} value={form.period || form.date.slice(0, 7)} disabled={isReadOnly} onChange={(e) => setForm({ ...form, period: e.target.value })} />
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
                <p className="text-sm text-slate-600">
                  {form.workplaceName || "Lugar"} / {form.areaName || "Area"} / {form.shiftName || "Turno"}
                  {Number(form.lunchBreakMinutes || 0) > 0 ? ` / Almuerzo descontado: ${form.lunchBreakMinutes} min` : ""}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Se carga cumplido segun horario. Edita solo atrasos, faltas, permisos, enfermedad, horas extra o multas.
                </p>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-sm font-bold text-[#173C61]">{form.staffReports?.length || 0} trabajadores</span>
            </div>

            <div className="space-y-3">
              {(form.staffReports || []).map((staff) => {
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

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Asistencia">
                      <select className={inputClass} value={staff.attendanceStatus} disabled={isReadOnly} onChange={(e) => updateStaffAttendance(staff.id, e.target.value as SupervisorReportStaff["attendanceStatus"])}>
                        <option value="attended">Asistio</option>
                        <option value="absent">Falto</option>
                        <option value="permission">Permiso</option>
                        <option value="sick">Enfermedad</option>
                        <option value="late">Retraso</option>
                        <option value="replacement">Reemplazo</option>
                      </select>
                    </Field>
                    <Field label="Hora entrada"><input type="time" className={inputClass} value={staff.startTime || ""} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { startTime: e.target.value })} /></Field>
                    <Field label="Hora salida"><input type="time" className={inputClass} value={staff.endTime || ""} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { endTime: e.target.value })} /></Field>
                    <Field label="Horas normales"><input className={inputClass} value={formatNumber(staff.normalHours)} readOnly /></Field>
                    <Field label="Almuerzo descontado"><input className={inputClass} value={`${staff.lunchBreakMinutes || 0} min`} readOnly /></Field>
                    <Field label="Horas extras autorizadas"><input type="number" min="0" step="0.25" className={inputClass} value={staff.authorizedOvertimeHours || 0} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { authorizedOvertimeHours: Number(e.target.value) })} /></Field>
                    <Field label="Horas extras"><input className={inputClass} value={formatNumber(staff.overtimeHours)} readOnly /></Field>
                    <Field label="Atraso minutos"><input type="number" min="0" className={inputClass} value={staff.delayMinutes || 0} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { delayMinutes: Number(e.target.value) })} /></Field>
                    <Field label="Multa / descuento"><input type="number" min="0" step="0.01" className={inputClass} value={staff.fineAmount || 0} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { fineAmount: Number(e.target.value) })} /></Field>
                    <Field label="Horas permiso"><input type="number" min="0" step="0.25" className={inputClass} value={staff.permissionHours || 0} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { permissionHours: Number(e.target.value) })} /></Field>
                    <Field label="Asunto del respaldo"><input className={inputClass} value={staff.supportDocumentSubject || ""} disabled={isReadOnly} placeholder="Ej. multa por atraso, permiso medico..." onChange={(e) => updateStaff(staff.id, { supportDocumentSubject: e.target.value })} /></Field>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                      Documento de respaldo
                      <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className={inputClass} disabled={isReadOnly} onChange={(e) => uploadStaffSupportDocument(staff.id, e.target.files?.[0])} />
                      {staff.supportDocumentUrl && (
                        <a className="text-xs font-bold text-[#173C61] underline" href={staff.supportDocumentUrl} target="_blank" rel="noreferrer">
                          Ver respaldo: {staff.supportDocumentName || "documento cargado"}
                        </a>
                      )}
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-3">
                      Novedad
                      <textarea className={`${inputClass} min-h-20`} value={staff.notes || ""} disabled={isReadOnly} onChange={(e) => updateStaff(staff.id, { notes: e.target.value })} />
                    </label>
                  </div>
                </details>
                );
              })}
              {(!form.staffReports || form.staffReports.length === 0) && <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">Selecciona un turno con personal asignado.</p>}
            </div>
          </section>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Novedades generales del contrato
            <textarea className={`${inputClass} min-h-24`} value={form.notes || ""} disabled={isReadOnly} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Info label="Total horas" value={formatNumber(form.totalHours)} />
            <Info label="Horas normales" value={formatNumber(form.normalHours)} />
            <Info label="Horas extras" value={formatNumber(form.overtimeHours)} />
            <Info label="Multas" value={`$ ${formatNumber(form.fineAmount)}`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button disabled={isReadOnly} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93] disabled:cursor-not-allowed disabled:opacity-50">Guardar reporte</button>
            <button disabled={isReadOnly} type="button" onClick={() => saveReport(undefined, "submitted")} className="rounded-md bg-[#218F93] px-5 py-3 font-semibold text-white hover:bg-[#173C61] disabled:cursor-not-allowed disabled:opacity-50">
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
      lunchBreakMinutes: Number(shift?.lunchBreakMinutes || 0),
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

  const totalHours = calculateWorkedHours(staff.startTime || "", staff.endTime || "", staff.lunchBreakMinutes || 0);
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
          lunchBreakMinutes: report.lunchBreakMinutes,
          totalHours: report.totalHours,
          normalHours: report.normalHours,
          overtimeHours: report.overtimeHours,
          authorizedOvertimeHours: report.authorizedOvertimeHours,
          delayMinutes: report.delayMinutes,
          fineAmount: report.fineAmount,
          permissionHours: report.permissionHours,
          sicknessHours: report.sicknessHours,
          attendanceStatus: report.attendanceStatus,
          supportDocumentSubject: report.staffReports?.[0]?.supportDocumentSubject,
          supportDocumentUrl: report.staffReports?.[0]?.supportDocumentUrl,
          supportDocumentPublicId: report.staffReports?.[0]?.supportDocumentPublicId,
          supportDocumentName: report.staffReports?.[0]?.supportDocumentName,
          notes: report.notes,
        }]
      : [];
  return summarizeReport({ ...emptyReport, ...report, period: report.period || report.date?.slice(0, 7), staffReports });
}

function normalizeContract(contract: ServiceContract): ServiceContract {
  return { ...contract, workplaces: contract.workplaces || [] };
}

function findAttendanceReport(reports: SupervisorReport[], report: SupervisorReport) {
  if (!report.date || !report.contractId || !report.workplaceId || !report.areaId || !report.shiftId) return undefined;
  return reports.find((item) =>
    item.date === report.date &&
    item.contractId === report.contractId &&
    item.workplaceId === report.workplaceId &&
    item.areaId === report.areaId &&
    item.shiftId === report.shiftId
  );
}

function filterContractsBySession(contracts: ServiceContract[], user: SessionUser | null) {
  if (!user || user.roles.some((role) => ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "operations", "accounting", "legal_representative"].includes(role))) return contracts;
  if (!user.roles.includes("supervisor")) return contracts;
  const identity = userIdentity(user);
  return contracts.filter((contract) =>
    (contract.workplaces || []).some((workplace) => {
      const supervisor = `${workplace.supervisorName || ""} ${workplace.supervisorId || ""}`.toLowerCase();
      return Boolean(supervisor && identityIncludes(identity, supervisor));
    })
  );
}

function filterReportsBySession(reports: SupervisorReport[], user: SessionUser | null) {
  if (!user || user.roles.some((role) => ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "operations", "accounting", "legal_representative"].includes(role))) return reports;
  if (!user.roles.includes("supervisor")) return reports;
  const identity = userIdentity(user);
  return reports.filter((report) => identityIncludes(identity, `${report.supervisor || ""} ${report.supervisorId || ""}`.toLowerCase()));
}

function userIdentity(user: SessionUser) {
  return `${user.name || ""} ${user.email || ""}`.toLowerCase();
}

function identityIncludes(identity: string, target: string) {
  const normalized = target.trim().toLowerCase();
  if (!normalized) return false;
  return identity.includes(normalized) || normalized.split(/\s+/).some((part) => part.length > 3 && identity.includes(part));
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

function calculateWorkedHours(startTime: string, endTime: string, lunchBreakMinutes = 0) {
  const totalMinutes = calculateHours(startTime, endTime) * 60;
  const workedMinutes = Math.max(totalMinutes - Number(lunchBreakMinutes || 0), 0);
  return Number((workedMinutes / 60).toFixed(2));
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

function staffComplianceSignal(staff: SupervisorReportStaff) {
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
