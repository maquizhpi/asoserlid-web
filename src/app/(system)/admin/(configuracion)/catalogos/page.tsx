import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { EmployeePosition } from "@/types/admin";

const emptyPosition: EmployeePosition = {
  code: "",
  name: "",
  description: "",
  status: "active",
};

export default function CatalogsPage() {
  return (
    <SystemModulePage moduleKey="catalogs">
      <SimpleCrudModule<EmployeePosition>
        endpoint="/api/admin/employee-positions"
        emptyItem={emptyPosition}
        fields={[
          { key: "code", label: "Codigo de cargo", required: true },
          { key: "name", label: "Nombre del cargo", required: true },
          { key: "description", label: "Descripcion", type: "textarea" },
          {
            key: "status",
            label: "Estado",
            type: "select",
            required: true,
            options: [
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ],
          },
        ]}
        titleKey="name"
        subtitleKey="code"
        newLabel="Nuevo cargo"
        saveLabel="Guardar cargo"
        searchableKeys={["code", "name", "description"]}
        filters={[
          {
            key: "status",
            label: "Todos los estados",
            options: [
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ],
          },
        ]}
      />
    </SystemModulePage>
  );
}
