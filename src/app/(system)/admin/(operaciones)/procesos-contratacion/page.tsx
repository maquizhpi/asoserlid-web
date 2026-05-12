import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { HiringProcess } from "@/types/admin";

const emptyItem: HiringProcess = {
  processNumber: "",
  title: "",
  clientName: "",
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  status: "planned",
  timeline: "",
  notes: "",
};

export default function HiringProcessesPage() {
  return (
    <SystemModulePage moduleKey="hiring-processes">
      <SimpleCrudModule<HiringProcess>
        endpoint="/api/admin/hiring-processes"
        emptyItem={emptyItem}
        titleKey="processNumber"
        subtitleKey="title"
        newLabel="Nuevo proceso"
        saveLabel="Guardar proceso"
        fields={[
          { key: "processNumber", label: "Numero de proceso", required: true },
          { key: "title", label: "Nombre del proceso", required: true },
          { key: "clientName", label: "Cliente / entidad" },
          { key: "startDate", label: "Fecha inicio", type: "date", required: true },
          { key: "dueDate", label: "Fecha vencimiento", type: "date", required: true },
          { key: "status", label: "Estado", type: "select", options: [
            { value: "planned", label: "Planificado" },
            { value: "in_progress", label: "En proceso" },
            { value: "paused", label: "Pausado" },
            { value: "completed", label: "Completado" },
            { value: "cancelled", label: "Cancelado" },
          ] },
          { key: "timeline", label: "Cronograma", type: "textarea", required: true },
          { key: "notes", label: "Notas", type: "textarea" },
        ]}
      />
    </SystemModulePage>
  );
}
