"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/system/SearchableSelect";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupervisorReport, SupervisorReportStaff, WorkGroup } from "@/types/admin";

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
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
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
    const [res, groupsRes] = await Promise.all([
      fetch("/api/admin/supervisor-reports", { cache: "no-store" }),
      fetch("/api/admin/work-groups", { cache: "no-store" }).catch(() => null),
    ]);
    const data = await res.json().catch(() => ({}));
    const groupsData = groupsRes ? await groupsRes.json().catch(() => ({})) : {};
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar reportes aprobados.");
      return;
    }
    setReports((data.items || []).filter((report: SupervisorReport) => report.reportStatus === "approved"));
    if (groupsRes?.ok) setWorkGroups(groupsData.items || []);
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

      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          period={period}
          normalRate={normalRate}
          overtimeRate={overtimeRate}
          company={findPaymentCompany(selectedPayment, workGroups)}
          onClose={() => setSelectedPayment(null)}
        />
      )}
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

type PayrollDraft = {
  sueldo: number;
  sueldoGanado: number;
  horasSuplementarias: number;
  horasNocturnas: number;
  movilizacion: number;
  horasExtras: number;
  decimoTercero: number;
  decimoCuarto: number;
  fondosReserva: number;
  aporteIess: number;
  anticipos: number;
  multas: number;
  aporteAsociacion: number;
  prestamosIess: number;
  efectivo: number;
};

type PayrollFieldKey = keyof PayrollDraft;

function PaymentModal({
  payment,
  period,
  normalRate,
  overtimeRate,
  company,
  onClose,
}: {
  payment: WorkerPayment;
  period: string;
  normalRate: number;
  overtimeRate: number;
  company?: WorkGroup;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PayrollDraft>(() => buildPayrollDraft(payment, normalRate, overtimeRate));
  const totals = calculatePayrollTotals(draft);
  const location = payment.records[0]?.workplaceName || payment.records[0]?.clientName || "-";

  function updateDraft(key: PayrollFieldKey, value: string) {
    setDraft((current) => ({ ...current, [key]: Number(value || 0) }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Rol de pagos mensual</h2>
            <p className="mt-1 text-sm text-slate-600">{payment.workerName} | {payment.documentId || "Sin cedula"} | {formatPeriod(period)}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => printWorkerRole(payment, period, draft, company)} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-bold text-white hover:bg-[#218F93]">Imprimir rol</button>
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar</button>
          </div>
        </div>

        <section className="rounded-md border-2 border-slate-900 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[110px_1fr]">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-sm font-bold text-[#173C61]">
              {company?.logoUrl ? <img src={company.logoUrl} alt={company.commercialName || company.name} className="h-full w-full object-contain" /> : "SIT"}
            </div>
            <div className="text-center">
              <h3 className="text-base font-black uppercase text-slate-950">{company?.legalName || company?.commercialName || company?.name || "Empresa / grupo de trabajo"}</h3>
              <p className="mt-1 text-sm font-bold uppercase text-slate-900">Rol de pagos correspondiente al mes de {formatPeriod(period)}</p>
              <p className="mt-1 text-xs text-slate-600">{company?.taxId ? `RUC: ${company.taxId}` : ""} {company?.address ? `| ${company.address}` : ""}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
            <RoleInfo label="Empleado(a)" value={payment.workerName} />
            <RoleInfo label="Ubicacion" value={location} />
            <RoleInfo label="C.C." value={payment.documentId || "-"} />
            <RoleInfo label="Cargo" value={payment.position || "-"} />
          </div>

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <PayrollSection
              title="Ingresos"
              rows={[
                ["Sueldo", "sueldo"],
                ["Sueldo Ganado", "sueldoGanado"],
                ["Horas Suplementarias", "horasSuplementarias"],
                ["Horas Nocturnas", "horasNocturnas"],
                ["Movilizacion", "movilizacion"],
                ["Horas Extras", "horasExtras"],
                ["Decimo Tercer Sueldo", "decimoTercero"],
                ["Decimo cuarto sueldo", "decimoCuarto"],
                ["Fondos de Reserva", "fondosReserva"],
              ]}
              draft={draft}
              onChange={updateDraft}
            />
            <PayrollSection
              title="Egresos"
              rows={[
                ["9.45% aporte Personal IESS", "aporteIess"],
                ["Anticipos", "anticipos"],
                ["Multas", "multas"],
                ["Aporte a la Asociacion", "aporteAsociacion"],
                ["Prestamos IESS", "prestamosIess"],
              ]}
              draft={draft}
              onChange={updateDraft}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <TotalRow label="Total ingresos" value={totals.income} />
            <TotalRow label="Total egresos" value={totals.expense} />
            <TotalRow label="Liquido a recibir" value={totals.net} strong />
            <EditableAmount label="Valor recibido en efectivo" value={draft.efectivo} onChange={(value) => updateDraft("efectivo", value)} />
            <TotalRow label="Valor a recibir mediante transferencia" value={Math.max(totals.net - draft.efectivo, 0)} strong />
          </div>

          <p className="mt-8 text-sm text-slate-700">
            Certifico que he recibido a entera satisfaccion los valores contenidos en el presente comprobante por pago de remuneraciones,
            por lo cual no tengo ningun cargo o reclamo posterior que efectuar a mi empleador.
          </p>

          <div className="mt-16 grid gap-10 md:grid-cols-2">
            <SignatureLine title="Autorizado(f)" name={company?.legalRepresentativeName || "Representante legal"} document={company?.legalRepresentativeDocumentId || ""} subtitle="REPRESENTANTE LEGAL" />
            <SignatureLine title="Recibi (f). Sr.(a)." name={payment.workerName} document={payment.documentId || ""} />
          </div>
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

function buildPayrollDraft(payment: WorkerPayment, normalRate: number, overtimeRate: number): PayrollDraft {
  const sueldoGanado = payment.normalHours * normalRate;
  const horasExtras = payment.overtimeHours * overtimeRate;
  const baseIncome = sueldoGanado + horasExtras;
  const aporteIess = baseIncome * 0.0945;
  return {
    sueldo: sueldoGanado,
    sueldoGanado,
    horasSuplementarias: 0,
    horasNocturnas: 0,
    movilizacion: 0,
    horasExtras,
    decimoTercero: 0,
    decimoCuarto: 0,
    fondosReserva: 0,
    aporteIess,
    anticipos: 0,
    multas: payment.fines,
    aporteAsociacion: 0,
    prestamosIess: 0,
    efectivo: 0,
  };
}

function calculatePayrollTotals(draft: PayrollDraft) {
  const income = draft.sueldoGanado + draft.horasSuplementarias + draft.horasNocturnas + draft.movilizacion + draft.horasExtras + draft.decimoTercero + draft.decimoCuarto + draft.fondosReserva;
  const expense = draft.aporteIess + draft.anticipos + draft.multas + draft.aporteAsociacion + draft.prestamosIess;
  return { income, expense, net: income - expense };
}

function PayrollSection({ title, rows, draft, onChange }: { title: string; rows: Array<[string, PayrollFieldKey]>; draft: PayrollDraft; onChange: (key: PayrollFieldKey, value: string) => void }) {
  return (
    <div>
      <h4 className="border-b-2 border-slate-900 pb-1 text-sm font-black uppercase text-slate-950">{title}</h4>
      <div className="mt-1 space-y-1">
        {rows.map(([label, key]) => (
          <label key={key} className="grid grid-cols-[1fr_8rem] items-center gap-3 text-sm text-slate-900">
            <span>{label}</span>
            <input type="number" min="0" step="0.01" className="border-b border-slate-300 px-2 py-1 text-right font-semibold outline-none focus:border-[#218F93]" value={draft[key]} onChange={(e) => onChange(key, e.target.value)} />
          </label>
        ))}
      </div>
    </div>
  );
}

function RoleInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 text-sm">
      <span className="font-black uppercase text-slate-900">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_9rem] border border-slate-900 text-sm">
      <span className={`px-2 py-1 uppercase ${strong ? "font-black" : "font-bold"}`}>{label}</span>
      <span className="border-l border-slate-900 px-2 py-1 text-right font-black">{formatNumber(value)}</span>
    </div>
  );
}

function EditableAmount({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label className="grid grid-cols-[1fr_9rem] border border-slate-900 text-sm">
      <span className="px-2 py-1 font-bold uppercase">{label}</span>
      <input type="number" min="0" step="0.01" className="border-l border-slate-900 px-2 py-1 text-right font-black outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SignatureLine({ title, name, document, subtitle }: { title: string; name: string; document?: string; subtitle?: string }) {
  return (
    <div className="text-sm text-slate-950">
      <div className="border-t border-dotted border-slate-900 pt-2" />
      <p>{title}</p>
      <p className="mt-1 font-black uppercase">{name}</p>
      {subtitle && <p className="font-black uppercase">{subtitle}</p>}
      {document && <p className="font-black">{document}</p>}
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

function printWorkerRole(payment: WorkerPayment, period: string, draft: PayrollDraft, company?: WorkGroup) {
  const totals = calculatePayrollTotals(draft);
  const location = payment.records[0]?.workplaceName || payment.records[0]?.clientName || "-";
  const incomeRows = [
    ["Sueldo", draft.sueldo],
    ["Sueldo Ganado", draft.sueldoGanado],
    ["Horas Suplementarias", draft.horasSuplementarias],
    ["Horas Nocturnas", draft.horasNocturnas],
    ["Movilizacion", draft.movilizacion],
    ["Horas Extras", draft.horasExtras],
    ["Decimo Tercer Sueldo", draft.decimoTercero],
    ["Decimo cuarto sueldo", draft.decimoCuarto],
    ["Fondos de Reserva", draft.fondosReserva],
  ].map(([label, value]) => `<tr><td>${escapeHtml(String(label))}</td><td>${moneyOrDash(Number(value))}</td></tr>`).join("");
  const expenseRows = [
    ["9.45% aporte Personal IESS", draft.aporteIess],
    ["Anticipos", draft.anticipos],
    ["Multas", draft.multas],
    ["Aporte a la Asociacion", draft.aporteAsociacion],
    ["Prestamos IESS", draft.prestamosIess],
  ].map(([label, value]) => `<tr><td>${escapeHtml(String(label))}</td><td>${moneyOrDash(Number(value))}</td></tr>`).join("");

  printHtml("Rol de pagos mensual", `
    <section class="payroll">
      <div class="header">
        <div class="logo">${company?.logoUrl ? `<img src="${escapeHtml(company.logoUrl)}" />` : "SIT"}</div>
        <div>
          <h1>${escapeHtml(company?.legalName || company?.commercialName || company?.name || "Empresa / grupo de trabajo")}</h1>
          <h2>ROL DE PAGOS CORRESPONDIENTE AL MES DE ${escapeHtml(formatPeriod(period).toUpperCase())}</h2>
          <p>${company?.taxId ? `RUC: ${escapeHtml(company.taxId)}` : ""} ${company?.address ? `| ${escapeHtml(company.address)}` : ""}</p>
        </div>
      </div>
      <div class="worker-grid">
        <strong>EMPLEADO(A):</strong><span>${escapeHtml(payment.workerName)}</span>
        <strong>UBICACION:</strong><span>${escapeHtml(location)}</span>
        <strong>C.C.:</strong><span>${escapeHtml(payment.documentId || "-")}</span>
        <strong>CARGO:</strong><span>${escapeHtml(payment.position || "-")}</span>
      </div>
      <div class="tables">
        <table><thead><tr><th colspan="2">INGRESOS</th></tr></thead><tbody>${incomeRows}<tr class="total"><td>TOTAL INGRESOS</td><td>${formatNumber(totals.income)}</td></tr></tbody></table>
        <table><thead><tr><th colspan="2">EGRESOS</th></tr></thead><tbody>${expenseRows}<tr class="total"><td>TOTAL EGRESOS</td><td>${formatNumber(totals.expense)}</td></tr></tbody></table>
      </div>
      <div class="totals">
        <span>LIQUIDO A RECIBIR</span><strong>${formatNumber(totals.net)}</strong>
        <span>VALOR RECIBIDO EN EFECTIVO</span><strong>${moneyOrDash(draft.efectivo)}</strong>
        <span>VALOR A RECIBIR MEDIANTE TRANSFERENCIA</span><strong>${formatNumber(Math.max(totals.net - draft.efectivo, 0))}</strong>
      </div>
      <p class="certify">Certifico que he recibido a entera satisfaccion los valores contenidos en el presente comprobante por pago de remuneraciones, por lo cual no tengo ningun cargo o reclamo posterior que efectuar a mi empleador.</p>
      <section class="signatures">
        <div><span></span><p>Autorizado(f)</p><strong>${escapeHtml(company?.legalRepresentativeName || "Representante legal")}</strong><b>REPRESENTANTE LEGAL</b><small>${escapeHtml(company?.legalRepresentativeDocumentId || "")}</small></div>
        <div><span></span><p>Recibi (f). Sr.(a).</p><strong>${escapeHtml(payment.workerName)}</strong><small>${escapeHtml(payment.documentId || "")}</small></div>
      </section>
    </section>
  `);
}

function printHtml(title: string, body: string) {
  const printWindow = window.open("", "_blank", "width=1000,height=760");
  if (!printWindow) return;
  printWindow.document.write(`
    <html><head><title>${escapeHtml(title)}</title><style>
      body { font-family: Arial, sans-serif; color: #111827; padding: 18px; }
      .payroll { border: 3px solid #111; padding: 10px 18px 22px; max-width: 1040px; margin: 0 auto; }
      .header { display: grid; grid-template-columns: 92px 1fr; align-items: center; gap: 14px; text-align: center; }
      .logo { width: 80px; height: 80px; display: grid; place-items: center; font-weight: 800; color: #173C61; }
      .logo img { max-width: 80px; max-height: 80px; object-fit: contain; }
      h1 { margin: 0; font-size: 17px; color: #111; text-transform: uppercase; }
      h2 { margin: 10px 0 0; font-size: 15px; color: #111; text-transform: uppercase; }
      .header p { margin: 6px 0 0; font-size: 11px; }
      .worker-grid { display: grid; grid-template-columns: 170px 1fr 150px 1fr; gap: 6px 10px; margin: 28px auto; max-width: 820px; font-size: 14px; }
      .tables { display: grid; grid-template-columns: 1fr 0.85fr; gap: 70px; }
      table { border-collapse: collapse; width: 100%; }
      th { border-bottom: 2px solid #111; text-align: left; padding: 4px; font-size: 14px; }
      td { padding: 4px; font-size: 14px; }
      td:last-child { text-align: right; }
      .total td { border-top: 2px solid #111; font-weight: 800; padding-top: 10px; }
      .totals { display: grid; grid-template-columns: 1fr 140px; max-width: 840px; margin-top: 26px; border: 2px solid #111; }
      .totals span, .totals strong { border-bottom: 1px solid #111; padding: 3px 6px; font-size: 14px; }
      .totals strong { border-left: 2px solid #111; text-align: right; }
      .certify { margin: 58px auto 0; max-width: 840px; font-size: 14px; line-height: 1.45; }
      .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 160px; margin: 70px auto 0; max-width: 840px; }
      .signatures span { display: block; border-top: 2px dotted #111; }
      .signatures p, .signatures strong, .signatures b, .signatures small { display: block; margin: 4px 0 0; font-size: 13px; text-align: left; }
      @media print { body { padding: 0; } }
    </style></head><body>${body}</body></html>
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

function moneyOrDash(value?: number) {
  return Number(value || 0) > 0 ? formatNumber(value) : "-";
}

function findPaymentCompany(payment: WorkerPayment, workGroups: WorkGroup[]) {
  const groupId = payment.records.find((record) => record.workGroupId)?.workGroupId;
  const groupName = payment.records.find((record) => record.workGroupName)?.workGroupName;
  return workGroups.find((group) => group._id === groupId) || workGroups.find((group) => group.name === groupName || group.commercialName === groupName);
}

function formatPeriod(period: string) {
  if (!period) return "Periodo";
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month || 1) - 1, 1);
  return new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(date);
}
