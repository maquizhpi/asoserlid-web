import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { ServiceType } from "@/types/admin";

const emptyService: ServiceType = {
  code: "",
  name: "",
  detail: "",
  activities: "",
  imageUrl: "",
  imagePublicId: "",
  regularPrice: 0,
  discountPercent: 0,
  offerPrice: 0,
  status: "active",
};

export default function ServiceTypesPage() {
  return (
    <SystemModulePage moduleKey="service-types">
      <SimpleCrudModule<ServiceType>
        endpoint="/api/admin/service-types"
        emptyItem={emptyService}
        titleKey="name"
        subtitleKey="code"
        newLabel="Nuevo tipo de servicio"
        saveLabel="Guardar tipo"
        searchableKeys={["code", "name"]}
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
        fields={[
          { key: "code", label: "Codigo", required: true },
          { key: "name", label: "Tipo de servicio", required: true },
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
      />
    </SystemModulePage>
  );
}
