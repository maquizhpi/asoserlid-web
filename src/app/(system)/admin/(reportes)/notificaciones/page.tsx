import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { InternalNotification } from "@/types/admin";

const emptyItem: InternalNotification = {
  title: "",
  role: "all",
  message: "",
  dueDate: "",
  status: "active",
};

export default function NotificationsPage() {
  return (
    <SystemModulePage moduleKey="notifications">
      <SimpleCrudModule<InternalNotification>
        endpoint="/api/admin/notifications"
        emptyItem={emptyItem}
        titleKey="title"
        subtitleKey="role"
        newLabel="Nueva notificacion"
        saveLabel="Guardar notificacion"
        fields={[
          { key: "title", label: "Titulo", required: true },
          { key: "role", label: "Rol", type: "select", options: [
            { value: "all", label: "Todos" },
            { value: "administrator", label: "Administrador" },
            { value: "supervisor", label: "Supervisor" },
            { value: "operations", label: "Operaciones" },
            { value: "human_resources", label: "RR. HH." },
            { value: "accounting", label: "Contabilidad" },
            { value: "advertising", label: "Publicidad" },
            { value: "legal_representative", label: "Representante legal" },
            { value: "client", label: "Cliente" },
            { value: "worker", label: "Trabajador" },
          ] },
          { key: "dueDate", label: "Fecha limite", type: "date" },
          { key: "status", label: "Estado", type: "select", options: [{ value: "active", label: "Activa" }, { value: "read", label: "Leida" }, { value: "archived", label: "Archivada" }] },
          { key: "message", label: "Mensaje", type: "textarea", required: true },
        ]}
      />
    </SystemModulePage>
  );
}
