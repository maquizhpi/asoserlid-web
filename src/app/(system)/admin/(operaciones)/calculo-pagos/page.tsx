"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport, SupervisorReportStaff } from "@/types/admin";

type PaymentRecord = {
  reportId?: string;
  date: string;
  period: string;
  workerId: string;
  workerName: string;
  documentId?: string;
  position?: string;
  clientId?: string;
  clientName: string;
  contractId?: string;
  contractName: string;
  workplaceName?: string;
  areaName?: string;
  shiftName?: string;
  workGroupId?: string;
  workGroupName?: string;
  attendanceStatus: SupervisorReportStaff["attendanceStatus"];
  normalHours: number;
  overtimeHours: number;
  delayMinutes: number;
  fines: number;
  permissionHours: number;
  sicknessHours: number;
  notes?: string;
};

type WorkerPayment = {
  workerKey: string;
  workerName: string;
  documentId?: string;
  position?: string;
  records: PaymentRecord[];
  days: number;
  normalHours: number;
  overtimeHours: number;
  permissionHours: number;
  sicknessHours: number;
  fines: number;
  delayMinutes: number;
  gross: number;
  total: number;
};

type TabKey = "consolidated" | "details";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function PaymentCalculationPage() {
  const [reports, setReports] = useState<SupervisorReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [period, setPeriod] = useState(currentMonth);
  const [workGroupId, setWorkGroupId] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [search, setSearch] = useState("");
  const [normalRate, setNormalRate] = useState(2.5);
  const [overtimeRate, setOvertimeRate] = useState(3.75);
  const [activeTab, setActiveTab] = useState<TabKey>("consolidated");
  const [selectedPayment, setSelectedPayment] = useState<WorkerPayment | null>(null);

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

  const records = useMemo(() => reports.flatMap(flattenReport), [reports]);

  const options = useMemo(() => ({
    groups: uniqueOptions(records.map((record) => ({ value: record.workGroupId || record.workGroupName || "", label: record.workGroupName || "Sin grupo" }))),
    clients: uniqueOptions(records.map((record) => ({ value: record.clientId || record.clientName, label: record.clientName }))),
    contracts: uniqueOptions(records.map((record) => ({ value: record.contractId || record.contractName, label: record.contractName }))),
  }), [records]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      if (period && record.period !== period) return false;
      if (workGroupId && (record.workGroupId || record.workGroupName || "") !== workGroupId) return false;
      if (clientId && (record.clientId || record.clientName) !== clientId) return false;
      if (contractId && (record.contractId || record.contractName) !== contractId) return false;
      if (term) {
        const haystack = [
          record.workerName,
          record.documentId,
          record.position,
          record.clientName,
          record.contractName,
          record.workplaceName,
          record.areaName,
          record.shiftName,
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [clientId, contractId, period, records, search, workGroupId]);

  const payments = useMemo(() => buildPayments(filteredRecords, normalRate, overtimeRate), [filteredRecords, normalRate, overtimeRate]);

  const totals = useMemo(() => payments.reduce(
    (acc, payment) => ({
      workers: acc.workers + 1,
      records: acc.records + payment.records.length,
      normalHours: acc.normalHours + payment.normalHours,
      overtimeHours: acc.overtimeHours + payment.overtimeHours,
      gross: acc.gross + payment.gross,
      fines: acc.fines + payment.fines,
      total: acc.total + payment.total,
    }),
    { workers: 0, records: 0, normalHours: 0, overtimeHours: 0, gross: 0, fines: 0, total: 0 }
  ), [payments]);

  function exportCsv() {
    const rows = [
      ["Trabajador", "Cedula", "Cargo", "Dias", "Horas normales", "Horas extras", "Atrasos min", "Bruto", "Descuentos", "Neto"],
      ...payments.map((payment) => [
        payment.workerName,
        payment.documentId || "",
        payment.position || "",
        String(payment.days),
        formatNumber(payment.normalHours),
        formatNumber(payment.overtimeHours),
        String(payment.delayMinutes),
        formatNumber(payment.gross),
        formatNumber(payment.fines),
        formatNumber(payment.total),
      ]),
    ];
    downloadCsv(`consolidado-roles-${period || "periodo"}.csv`, rows);
  }

  function printConsolidated() {
    const rows = payments.map((payment) => `
      <tr>
        <td>${escapeHtml(payment.workerName)}</td>
        <td>${escapeHtml(payment.documentId || "")}</td>
        <td>${payment.days}</td>
        <td>${formatNumber(payment.normalHours)}</td>
        <td>${formatNumber(payment.overtimeHours)}</td>
        <td>$ ${formatNumber(payment.fines)}</td>
        <td>$ ${formatNumber(payment.total)}</td>
      </tr>
    `).join("");

    printHtml("Consolidado mensual de roles", `
      <p><strong>Periodo:</strong> ${escapeHtml(period || "Todos")}</p>
      <p><strong>Trabajadores:</strong> ${totals.workers} | <strong>Total neto:</strong> $ ${formatNumber(totals.total)}</p>
      <table>
        <thead><tr><th>Trabajador</th><th>Cedula</th><th>Dias</th><th>Normales</th><th>Extras</th><th>Descuentos</th><th>Neto</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='7'>Sin datos</td></tr>"}</tbody>
      </table>
    `);
  }

  return (
    <SystemModulePage moduleKey="payment-calculation">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-4">
          <Field label="Mes visible">
            <input type="month" className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
          <SearchableSelect label="Grupo de trabajo" value={workGroupId} options={[{ value: "", label: "Todos" }, ...options.groups]} placeholder="Todos los grupos..." onChange={(option) => setWorkGroupId(option?.value || "")} />
          <SearchableSelect label="Cliente" value={clientId} options={[{ value: "", label: "Todos" }, ...options.clients]} placeholder="Todos los clientes..." onChange={(option) => setClientId(option?.value || "")} />
          <SearchableSelect label="Contrato" value={contractId} options={[{ value: "", label: "Todos" }, ...options.contracts]} placeholder="Todos los contratos..." onChange={(option) => setContractId(option?.value || "")} />
          <Field label="Buscar trabajador">
            <input className={inputClass} placeholder="Nombre, cedula, cargo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Valor hora normal">
            <input type="number" min="0" step="0.01" className={inputClass} value={normalRate} onChange={(e) => setNormalRate(Number(e.target.value))} />
          </Field>
          <Field label="Valor hora extra">
            <input type="number" min="0" step="0.01" className={inputClass} value={overtimeRate} onChange={(e) => setOvertimeRate(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={exportCsv} className="rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93]">Exportar consolidado CSV</button>
          <button onClick={printConsolidated} className="rounded-md border border-[#173C61] px-5 py-3 font-semibold text-[#173C61] hover:bg-[#E6F8F9]">Reporte mensual general</button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Summary label="Trabajadores" value={String(totals.workers)} />
        <Summary label="Registros" value={String(totals.records)} />
        <Summary label="Horas normales" value={formatNumber(totals.normalHours)} />
        <Summary label="Horas extras" value={formatNumber(totals.overtimeHours)} />
        <Summary label="Descuentos" value={`$ ${formatNumber(totals.fines)}`} />
        <Summary label="Total neto" value={`$ ${formatNumber(totals.total)}`} />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <TabButton active={activeTab === "consolidated"} onClick={() => setActiveTab("consolidated")}>Consolidado mensual</TabButton>
          <TabButton active={activeTab === "details"} onClick={() => setActiveTab("details")}>Detalle rol por trabajador</TabButton>
        </div>

        {activeTab === "consolidated" ? (
          <ResponsiveTable
            columns={["Trabajador", "Dias", "Normales", "Extras", "Atrasos", "Descuentos", "Neto"]}
            rows={payments.map((payment) => ({
              key: payment.workerKey,
              cells: [
                <strong key="worker" className="text-[#173C61]">{payment.workerName}</strong>,
                payment.days,
                formatNumber(payment.normalHours),
                formatNumber(payment.overtimeHours),
                `${payment.delayMinutes} min`,
                `$ ${formatNumber(payment.fines)}`,
                <strong key="net" className="text-[#173C61]">$ {formatNumber(payment.total)}</strong>,
              ],
              onClick: () => setSelectedPayment(payment),
            }))}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {payments.map((payment) => (
              <button key={payment.workerKey} type="button" onClick={() => setSelectedPayment(payment)} className="rounded-md border border-slate-200 bg-slate-50 p-4 text-left hover:border-[#33C3C9] hover:bg-[#E6F8F9]">
                <h3 className="font-bold text-[#173C61]">{payment.workerName}</h3>
                <p className="mt-1 text-sm text-slate-600">{payment.documentId || "Sin cedula"} | {payment.position || "Sin cargo"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <InfoLine label="Dias" value={String(payment.days)} />
                  <InfoLine label="Neto" value={`$ ${formatNumber(payment.total)}`} />
                </div>
              </button>
            ))}
          </div>
        )}

        {payments.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No hay reportes aprobados en el periodo seleccionado.</p>}
      </section>

      {selectedPayment && <PaymentModal payment={selectedPayment} period={period} onClose={() => setSelectedPayment(null)} />}
    </SystemModulePage>
  );
}

function flattenReport(report: SupervisorReport): PaymentRecord[] {
  const staff = report.staffReports?.length
    ? report.staffReports
    : [{
        id: report.workerId || report.workerName,
        workerId: report.workerId || "",
        workerName: report.workerName,
        documentId: "",
        position: "",
        normalHours: report.normalHours,
        overtimeHours: report.overtimeHours,
        delayMinutes: report.delayMinutes,
        fineAmount: report.fineAmount,
        permissionHours: report.permissionHours,
        sicknessHours: report.sicknessHours,
        attendanceStatus: report.attendanceStatus,
        notes: report.notes,
      } as SupervisorReportStaff];

  return staff.map((item) => ({
    reportId: report._id,
    date: report.date,
    period: report.period || report.date.slice(0, 7),
    workerId: item.workerId || item.id,
    workerName: item.workerName,
    documentId: item.documentId,
    position: item.position,
    clientId: report.clientId,
    clientName: report.clientName,
    contractId: report.contractId,
    contractName: report.contractName || report.clientName,
    workplaceName: report.workplaceName,
    areaName: report.areaName,
    shiftName: report.shiftName,
    workGroupId: report.workGroupId,
    workGroupName: report.workGroupName,
    attendanceStatus: item.attendanceStatus,
    normalHours: Number(item.normalHours || 0),
    overtimeHours: Number(item.overtimeHours || 0),
    delayMinutes: Number(item.delayMinutes || 0),
    fines: Number(item.fineAmount || 0),
    permissionHours: Number(item.permissionHours || 0),
    sicknessHours: Number(item.sicknessHours || 0),
    notes: item.notes,
  }));
}

function buildPayments(records: PaymentRecord[], normalRate: number, overtimeRate: number) {
  const grouped = new Map<string, WorkerPayment>();
  records.forEach((record) => {
    const key = record.workerId || record.workerName;
    const current = grouped.get(key) || {
      workerKey: key,
      workerName: record.workerName,
      documentId: record.documentId,
      position: record.position,
      records: [],
      days: 0,
      normalHours: 0,
      overtimeHours: 0,
      permissionHours: 0,
      sicknessHours: 0,
      fines: 0,
      delayMinutes: 0,
      gross: 0,
      total: 0,
    };
    current.records.push(record);
    current.days = new Set(current.records.map((item) => item.date)).size;
    current.normalHours += record.normalHours;
    current.overtimeHours += record.overtimeHours;
    current.permissionHours += record.permissionHours;
    current.sicknessHours += record.sicknessHours;
    current.fines += record.fines;
    current.delayMinutes += record.delayMinutes;
    current.gross = current.normalHours * normalRate + current.overtimeHours * overtimeRate;
    current.total = current.gross - current.fines;
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).sort((a, b) => a.workerName.localeCompare(b.workerName));
}

function PaymentModal({ payment, period, onClose }: { payment: WorkerPayment; period: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Rol de pagos mensual</h2>
            <p className="mt-1 text-sm text-slate-600">{payment.workerName} | {payment.documentId || "Sin cedula"} | {period}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => printWorkerRole(payment, period)} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-bold text-white hover:bg-[#218F93]">Imprimir rol</button>
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar</button>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-4">
          <Summary label="Dias" value={String(payment.days)} />
          <Summary label="Bruto" value={`$ ${formatNumber(payment.gross)}`} />
          <Summary label="Descuentos" value={`$ ${formatNumber(payment.fines)}`} />
          <Summary label="Neto" value={`$ ${formatNumber(payment.total)}`} />
        </section>

        <div className="mt-5">
          <ResponsiveTable
            columns={["Fecha", "Cliente", "Contrato", "Lugar / area", "Asistencia", "Normales", "Extras", "Descuento"]}
            rows={payment.records.map((record) => ({
              key: `${record.reportId}-${record.workerId}-${record.date}-${record.shiftName}`,
              cells: [
                record.date,
                record.clientName,
                record.contractName,
                `${record.workplaceName || "-"} / ${record.areaName || "-"}`,
                attendanceLabel(record.attendanceStatus),
                formatNumber(record.normalHours),
                formatNumber(record.overtimeHours),
                `$ ${formatNumber(record.fines)}`,
              ],
            }))}
          />
        </div>
      </section>
    </div>
  );
}

function ResponsiveTable({ columns, rows }: { columns: string[]; rows: Array<{ key: string; cells: React.ReactNode[]; onClick?: () => void }> }) {
  return (
    <div className="overflow-auto rounded-md border border-slate-200">
      <div className="min-w-[56rem]">
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#173C61]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((column) => <span key={column}>{column}</span>)}
        </div>
        {rows.map((row) => (
          <button key={row.key} type="button" onClick={row.onClick} className={`grid w-full gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 ${row.onClick ? "hover:bg-[#E6F8F9]" : ""}`} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {row.cells.map((cell, index) => <span key={index}>{cell}</span>)}
          </button>
        ))}
      </div>
    </div>
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-md px-4 py-2 text-sm font-bold ${active ? "bg-[#173C61] text-white" : "border border-slate-300 text-[#173C61] hover:bg-slate-50"}`}>{children}</button>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="font-bold text-[#173C61]">{value}</p>
    </div>
  );
}

function uniqueOptions(options: Array<{ value: string; label: string }>) {
  return options
    .filter((option) => option.value && option.label)
    .filter((option, index, all) => all.findIndex((item) => item.value === option.value) === index)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printWorkerRole(payment: WorkerPayment, period: string) {
  const rows = payment.records.map((record) => `
    <tr>
      <td>${escapeHtml(record.date)}</td>
      <td>${escapeHtml(record.clientName)}</td>
      <td>${escapeHtml(record.contractName)}</td>
      <td>${formatNumber(record.normalHours)}</td>
      <td>${formatNumber(record.overtimeHours)}</td>
      <td>$ ${formatNumber(record.fines)}</td>
    </tr>
  `).join("");

  printHtml("Rol de pagos mensual", `
    <p><strong>Periodo:</strong> ${escapeHtml(period)}</p>
    <p><strong>Trabajador:</strong> ${escapeHtml(payment.workerName)} | <strong>Cedula:</strong> ${escapeHtml(payment.documentId || "-")}</p>
    <table>
      <tbody>
        <tr><th>Total bruto</th><td>$ ${formatNumber(payment.gross)}</td><th>Descuentos</th><td>$ ${formatNumber(payment.fines)}</td><th>Neto</th><td>$ ${formatNumber(payment.total)}</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Contrato</th><th>Normales</th><th>Extras</th><th>Descuento</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='6'>Sin datos</td></tr>"}</tbody>
    </table>
    <section class="signatures">
      <div><span></span><p>Trabajador</p></div>
      <div><span></span><p>Responsable de revision</p></div>
    </section>
  `);
}

function printHtml(title: string, body: string) {
  const printWindow = window.open("", "_blank", "width=1000,height=760");
  if (!printWindow) return;
  printWindow.document.write(`
    <html><head><title>${escapeHtml(title)}</title><style>
      body { font-family: Arial, sans-serif; color: #1f2937; padding: 28px; }
      h1 { color: #173C61; margin-bottom: 6px; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #d8e0ea; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #edf6f7; color: #173C61; }
      .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 48px; margin-top: 80px; }
      .signatures span { display: block; border-top: 1px solid #173C61; }
      .signatures p { text-align: center; font-size: 12px; font-weight: 700; color: #173C61; }
    </style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}

function attendanceLabel(status: SupervisorReportStaff["attendanceStatus"]) {
  return { attended: "Asistio", absent: "Falto", permission: "Permiso", sick: "Enfermedad", late: "Retraso", replacement: "Reemplazo" }[status];
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}
