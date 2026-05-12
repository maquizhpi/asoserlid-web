"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport, Worker, WorkerDocument } from "@/types/admin";

export default function LaborHistoryPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [workers, setWorkers] = useState<SelectOption[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [reportsRes, documentsRes, workersRes] = await Promise.all([
      fetch("/api/admin/supervisor-reports", { cache: "no-store" }),
      fetch("/api/admin/worker-documents", { cache: "no-store" }),
      fetch("/api/admin/workers", { cache: "no-store" }),
    ]);
    const reportsData = await reportsRes.json().catch(() => ({}));
    const documentsData = await documentsRes.json().catch(() => ({}));
    const workersData = await workersRes.json().catch(() => ({}));

    if (reportsRes.ok) setReports(reportsData.items || []);
    if (documentsRes.ok) setDocuments(documentsData.items || []);
    if (workersRes.ok) setWorkers(((workersData.items || []) as Worker[]).map((worker) => ({ value: worker._id || "", label: `${worker.firstName} ${worker.lastName}`.trim() })));
    if (!reportsRes.ok || !documentsRes.ok || !workersRes.ok) setStatus(reportsData.error || documentsData.error || workersData.error || "No se pudo cargar historial.");
  }

  const workerName = workers.find((worker) => worker.value === workerId)?.label || "";
  const workerReports = useMemo(() => reports.filter((report) => report.workerId === workerId || report.workerName === workerName), [reports, workerId, workerName]);
  const workerDocuments = useMemo(() => documents.filter((document) => document.workerId === workerId || document.workerName === workerName), [documents, workerId, workerName]);
  const totals = workerReports.reduce((acc, report) => ({
    absences: acc.absences + (report.attendanceStatus === "absent" ? 1 : 0),
    permissions: acc.permissions + (report.attendanceStatus === "permission" ? 1 : 0),
    fines: acc.fines + Number(report.fineAmount || 0),
  }), { absences: 0, permissions: 0, fines: 0 });

  return (
    <SystemModulePage moduleKey="labor-history">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <SearchableSelect label="Trabajador" value={workerId} options={workers} placeholder="Buscar trabajador..." onChange={(option) => setWorkerId(option?.value || "")} />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Summary label="Faltas" value={String(totals.absences)} />
        <Summary label="Permisos" value={String(totals.permissions)} />
        <Summary label="Multas acumuladas" value={`$ ${totals.fines.toFixed(2)}`} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Asistencia y novedades">
          {workerReports.map((report) => <Item key={report._id} title={`${report.date} - ${attendanceLabel(report.attendanceStatus)}`} detail={`${report.clientName} - ${report.notes || "Sin novedades"}`} />)}
          {workerReports.length === 0 && <p className="text-sm text-slate-500">Selecciona un trabajador para ver su historial.</p>}
        </Panel>
        <Panel title="Documentos laborales">
          {workerDocuments.map((document) => <Item key={document._id} title={`${document.documentType} - ${document.status}`} detail={document.expirationDate ? `Vence: ${document.expirationDate}` : "Sin vencimiento"} />)}
          {workerDocuments.length === 0 && <p className="text-sm text-slate-500">Sin documentos registrados.</p>}
        </Panel>
      </section>
    </SystemModulePage>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#173C61]">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-[#173C61]">{title}</h2>{children}</section>;
}

function Item({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3"><p className="font-semibold text-[#173C61]">{title}</p><p className="text-sm text-slate-600">{detail}</p></div>;
}

function attendanceLabel(status: SupervisorReport["attendanceStatus"]) {
  return { attended: "Asistio", absent: "Falto", permission: "Permiso", sick: "Enfermedad", late: "Retraso", replacement: "Reemplazo" }[status];
}
