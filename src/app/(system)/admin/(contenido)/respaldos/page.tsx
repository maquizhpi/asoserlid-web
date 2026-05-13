"use client";

import { useState } from "react";
import SystemModulePage from "@/components/system/SystemModulePage";

export default function BackupsPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function downloadBackup() {
    setLoading(true);
    setStatus("Generando respaldo...");
    const res = await fetch("/api/admin/backup", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setStatus(data.error || "No se pudo generar el respaldo.");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asoserlid-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Respaldo generado y descargado correctamente.");
  }

  return (
    <SystemModulePage moduleKey="backups">
      {status && <p className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{status}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#173C61]">Respaldo de informacion</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Exporta en JSON la informacion operativa principal del sistema. El registro queda guardado en auditoria con usuario, fecha y hora.
        </p>
        <button
          onClick={downloadBackup}
          disabled={loading}
          className="mt-5 rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white hover:bg-[#218F93] disabled:opacity-60"
        >
          {loading ? "Generando..." : "Descargar respaldo"}
        </button>
      </section>
    </SystemModulePage>
  );
}
