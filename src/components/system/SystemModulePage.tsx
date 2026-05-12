import { adminModules } from "@/lib/adminModules";
import SystemShell from "@/components/system/SystemShell";

type SystemModulePageProps = {
  moduleKey: string;
  children?: React.ReactNode;
};

export default function SystemModulePage({ moduleKey, children }: SystemModulePageProps) {
  const currentModule = adminModules.find((item) => item.key === moduleKey);

  if (!currentModule) {
    return null;
  }

  return (
    <SystemShell title={currentModule.title} subtitle={currentModule.description} activeKey={currentModule.key}>
      {children || (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-slate-600">
          Base del modulo creada. Aqui conectaremos formularios, tablas, aprobaciones y reportes.
        </div>
      )}
    </SystemShell>
  );
}

