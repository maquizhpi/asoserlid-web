import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { ServiceType } from "@/types/admin";

const emptyItem: ServiceType = {
  code: "",
  name: "",
  detail: "",
  activities: "",
  imageUrl: "",
  status: "active",
};

export default function ServicesAdminPage() {
  return (
    <SystemModulePage moduleKey="services">
      <SimpleCrudModule<ServiceType>
        endpoint="/api/admin/services"
        emptyItem={emptyItem}
        titleKey="name"
        subtitleKey="code"
        newLabel="Nuevo servicio"
        saveLabel="Guardar servicio"
        searchableKeys={["name", "code", "detail"]}
        fields={[
          { key: "code", label: "Codigo (slug unico)", required: true },
          { key: "name", label: "Nombre del servicio", required: true },
          { key: "detail", label: "Descripcion corta" },
          { key: "activities", label: "Detalle completo / actividades incluidas", type: "textarea" },
          { key: "imageUrl", label: "Imagen Cloudinary", type: "image", uploadFolder: "asoserlid/servicios" },
          {
            key: "status", label: "Estado", type: "select", options: [
              { value: "active", label: "Visible en la web" },
              { value: "inactive", label: "Oculto" },
            ],
          },
        ]}
      />
    </SystemModulePage>
  );
}
