import SystemModulePage from "@/components/system/SystemModulePage";

const requirements = [
  {
    story: "Como administrador quiero iniciar sesion con usuario y contrasena para acceder al sistema de forma segura",
    priority: "Alta",
    criteria: "El sistema permite login, logout y protege rutas privadas.",
  },
  {
    story: "Como administrador quiero crear roles especificos para limitar el acceso segun el cargo",
    priority: "Alta",
    criteria: "Existen roles: administrador, supervisor, operaciones, RR. HH., contabilidad, cliente y trabajador.",
  },
  {
    story: "Como administrador quiero crear, editar, activar y desactivar usuarios",
    priority: "Alta",
    criteria: "Se puede gestionar usuarios desde un panel administrativo.",
  },
];

export default function RolesPage() {
  return (
    <SystemModulePage moduleKey="roles">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_7rem_1fr] border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
          <span>Historia de usuario</span>
          <span>Prioridad</span>
          <span>Criterio de aceptacion</span>
        </div>
        <div className="divide-y divide-slate-100">
          {requirements.map((item) => (
            <article key={item.story} className="grid grid-cols-[1fr_7rem_1fr] gap-4 px-4 py-4 text-sm text-slate-700">
              <p>{item.story}</p>
              <p className="font-semibold text-[#173C61]">{item.priority}</p>
              <p>{item.criteria}</p>
            </article>
          ))}
        </div>
      </section>
    </SystemModulePage>
  );
}

