"use client";

import { useEffect, useMemo, useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { HiringProcess } from "@/types/admin";

export default function ProcessCalendarPage() {
  const [processes, setProcesses] = useState<HiringProcess[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProcesses();
  }, []);

  async function loadProcesses() {
    const res = await fetch("/api/admin/hiring-processes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "No se pudo cargar procesos.");
      return;
    }
    setProcesses(data.items || []);
  }

  const ordered = useMemo(() => [...processes].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [processes]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SystemModulePage moduleKey="process-calendar">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}
      <section className="grid gap-3">
        {ordered.map((process) => {
          const isLate = process.dueDate < today && !["completed", "cancelled"].includes(process.status);
          return (
            <article key={process._id} className={`rounded-lg border bg-white p-4 shadow-sm ${isLate ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#173C61]">{process.processNumber} - {process.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{process.timeline}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isLate ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{isLate ? "Vencido" : process.status}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Inicio: {process.startDate} | Vence: {process.dueDate}</p>
            </article>
          );
        })}
        {ordered.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay procesos registrados.</p>}
      </section>
    </SystemModulePage>
  );
}
