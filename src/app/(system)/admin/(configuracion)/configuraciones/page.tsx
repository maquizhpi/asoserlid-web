import Link from "next/link";
import { settingsModules } from "@/lib/adminModules";
import SystemShell from "@/components/system/SystemShell";

export default function SettingsPage() {
  return (
    <SystemShell title="Configuraciones" subtitle="Catalogos y datos maestros del sistema." activeKey="settings">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {settingsModules.map((module) => (
          <Link
            key={module.key}
            href={module.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#33C3C9] hover:bg-[#F7FEFF]"
          >
            <h2 className="font-bold text-[#173C61]">{module.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{module.description}</p>
          </Link>
        ))}
      </section>
    </SystemShell>
  );
}

