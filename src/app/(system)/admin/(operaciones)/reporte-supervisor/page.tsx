"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, ServiceContract, SupervisorReport, Worker } from "@/types/admin";

const emptyReport: SupervisorReport = {
  date: new Date().toISOString().slice(0, 10),
  supervisorId: "",
  supervisor: "",
  workerId: "",
  workerName: "",
  clientId: "",
  clientName: "",
  contractId: "",
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
};

export default function SupervisorDailyReportPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerOptions, setWorkerOptions] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [contracts, setContracts] = useState<SelectOption[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState<SupervisorReport>(emptyReport);
  const [status, setStatus] = useState<string | null>(null);

  const selectedReport = useMemo(() => reports.find((report) => report._id === selectedId), [reports, selectedId]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm(selectedReport || emptyReport);
  }, [selectedReport]);

  async function loadData() {
    const [reportsRes, supervisorsRes, workersRes, clientsRes, contractsRes] = await Promise.all([
      fetch("/api/admin/supervisor-reports", { cache: "no-store" }),
      fetch("/api/admin/supervisors", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/contracts", { cache: "no-store" }),
    ]);
    const reportsData = await reportsRes.json().catch(() => ({}));
    const supervisorsData = await supervisorsRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));
    const clientsData = await clientsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));

    if (reportsRes.ok) setReports(reportsData.items || []);
    if (supervisorsRes.ok) setSupervisors((supervisorsData.items || []).map((item: { id: string; name: string }) => ({ value: item.id, label: item.name })));
    if (workersRes.ok) {
      const workerItems = (workersData.items || []) as Worker[];
      setWorkers(workerItems);
      setWorkerOptions(workerItems.map((worker) => ({ value: worker._id || "", label: `${worker.firstName} ${worker.lastName}`.trim() })));
    }
    if (clientsRes.ok) setClients(((clientsData.items || []) as Client[]).map((client) => ({ value: client._id || "", label: client.name })));
    if (contractsRes.ok) {
      setContracts(
        ((contractsData.items || []) as ServiceContract[]).map((contract) => ({
          value: contract._id || "",
          label: `${contract.clientName} - ${contract.area} - ${contract.shift}`,
        }))
      );
    }

    if (!reportsRes.ok || !supervisorsRes.ok || !workersRes.ok || !clientsRes.ok || !contractsRes.ok) {
      setStatus(reportsData.error || supervisorsData.error || workersData.error || clientsData.error || contractsData.error || "No se pudo cargar reportes.");
    }
  }

  function selectWorker(option: SelectOption | null) {
    const worker = workers.find((item) => item._id === option?.value);
    setForm({
      ...form,
      workerId: option?.value || "",
      workerName: option?.label || "",
      clientId: worker?.assignedClientId || form.clientId || "",
      clientName: worker?.assignedClient || form.clientName || "",
      contractId: worker?.assignedContractId || form.contractId || "",
      workGroupId: worker?.workGroupId || form.workGroupId || "",
      workGroupName: worker?.workGroupName || form.workGroupName || "",
    });
  }

  function updateTimes(next: Partial<SupervisorReport>) {
    const updated = { ...form, ...next };
    const totalHours = calculateHours(updated.startTime || "", updated.endTime || "");
    const authorizedOvertimeHours = Number(updated.authorizedOvertimeHours || 0);
    updated.totalHours = totalHours;
    updated.normalHours = Math.min(totalHours, 8);
    updated.overtimeHours = Math.min(Math.max(totalHours - 8, 0), authorizedOvertimeHours);
    setForm(updated);
  }

  async function saveReport(e: FormEvent, nextStatus = form.reportStatus || "draft") {
    e.preventDefault();
    setStatus("Guardando reporte...");

    const isNew = selectedId === "new";
    const payload = { ...form, reportStatus: nextStatus };
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
    setSelectedId("new");
    await loadData();
  }

  return (
    <SystemModulePage moduleKey="supervisor-daily-report">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={() => setSelectedId("new")} className="mb-4 w-full rounded-md bg-[#173C61] px-4 py-3 font-semibold text-white hover:bg-[#218F93]">
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
                <span className="block font-semibold text-[#173C61]">{report.workerName}</span>
                <span className="mt-1 block text-xs text-slate-500">{report.date} - {report.clientName}</span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={(e) => saveReport(e)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input required type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <SearchableSelect
              label="Supervisor"
              value={form.supervisorId || ""}
              options={supervisors}
              placeholder="Buscar supervisor..."
              onChange={(option) => setForm({ ...form, supervisorId: option?.value || "", supervisor: option?.label || "" })}
            />
            <SearchableSelect
              label="Trabajador"
              value={form.workerId || ""}
              options={workerOptions}
              placeholder="Buscar trabajador..."
              onChange={selectWorker}
            />
            <SearchableSelect
              label="Cliente"
              value={form.clientId || ""}
              options={clients}
              placeholder="Buscar cliente..."
              onChange={(option) => setForm({ ...form, clientId: option?.value || "", clientName: option?.label || "" })}
            />
            <SearchableSelect
              label="Contrato / turno"
              value={form.contractId || ""}
              options={contracts}
              placeholder="Buscar contrato..."
              onChange={(option) => setForm({ ...form, contractId: option?.value || "" })}
            />
            <Field label="Grupo de trabajo">
              <input className={inputClass} value={form.workGroupName || "Sin grupo vinculado"} readOnly />
            </Field>
            <Field label="Asistencia">
              <select className={inputClass} value={form.attendanceStatus} onChange={(e) => setForm({ ...form, attendanceStatus: e.target.value as SupervisorReport["attendanceStatus"] })}>
                <option value="attended">Asistio</option>
                <option value="absent">Falto</option>
                <option value="permission">Permiso</option>
                <option value="sick">Enfermedad</option>
                <option value="late">Retraso</option>
                <option value="replacement">Reemplazo</option>
              </select>
            </Field>
            <Field label="Hora entrada">
              <input type="time" className={inputClass} value={form.startTime || ""} onChange={(e) => updateTimes({ startTime: e.target.value })} />
            </Field>
            <Field label="Hora salida">
              <input type="time" className={inputClass} value={form.endTime || ""} onChange={(e) => updateTimes({ endTime: e.target.value })} />
            </Field>
            <Field label="Total horas">
              <input className={inputClass} value={formatNumber(form.totalHours)} readOnly />
            </Field>
            <Field label="Horas normales">
              <input className={inputClass} value={formatNumber(form.normalHours)} readOnly />
            </Field>
            <Field label="Horas extras autorizadas">
              <input type="number" min="0" step="0.25" className={inputClass} value={form.authorizedOvertimeHours || 0} onChange={(e) => updateTimes({ authorizedOvertimeHours: Number(e.target.value) })} />
            </Field>
            <Field label="Horas extras calculadas">
              <input className={inputClass} value={formatNumber(form.overtimeHours)} readOnly />
            </Field>
            <Field label="Atraso en minutos">
              <input type="number" min="0" className={inputClass} value={form.delayMinutes || 0} onChange={(e) => setForm({ ...form, delayMinutes: Number(e.target.value) })} />
            </Field>
            <Field label="Multa / descuento">
              <input type="number" min="0" step="0.01" className={inputClass} value={form.fineAmount || 0} onChange={(e) => setForm({ ...form, fineAmount: Number(e.target.value) })} />
            </Field>
            <Field label="Horas permiso">
              <input type="number" min="0" step="0.25" className={inputClass} value={form.permissionHours || 0} onChange={(e) => setForm({ ...form, permissionHours: Number(e.target.value) })} />
            </Field>
            <Field label="Horas enfermedad">
              <input type="number" min="0" step="0.25" className={inputClass} value={form.sicknessHours || 0} onChange={(e) => setForm({ ...form, sicknessHours: Number(e.target.value) })} />
            </Field>
            <Field label="Estado del reporte">
              <input className={inputClass} value={statusLabel(form.reportStatus)} readOnly />
            </Field>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Novedades
            <textarea className={`${inputClass} min-h-28`} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Guardar reporte</button>
            <button type="button" onClick={(e) => saveReport(e as unknown as FormEvent, "submitted")} className="rounded-md bg-[#218F93] px-5 py-3 font-semibold text-white hover:bg-[#173C61]">
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

function calculateHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end < start) end += 24 * 60;
  return Number(((end - start) / 60).toFixed(2));
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}

function statusLabel(status?: SupervisorReport["reportStatus"]) {
  const labels = {
    draft: "Borrador",
    submitted: "Enviado",
    observed: "Observado",
    approved: "Aprobado",
    rejected: "Rechazado",
  };
  return labels[status || "draft"];
}
