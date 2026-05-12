import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client } from "@/types/admin";

const emptyClient: Client = {
  name: "",
  taxId: "",
  address: "",
  contactName: "",
  contactPhone: "",
  status: "active",
};

export default function ClientsPage() {
  return (
    <SystemModulePage moduleKey="clients">
      <SimpleCrudModule<Client>
        endpoint="/api/admin/clients"
        emptyItem={emptyClient}
        titleKey="name"
        subtitleKey="taxId"
        newLabel="Nuevo cliente"
        saveLabel="Guardar cliente"
        importConfig={{
          title: "Importar clientes",
          endpoint: "/api/admin/imports/clients",
          templateHref: "/api/admin/imports/clients",
        }}
        searchableKeys={["name", "taxId", "address", "contactName", "contactPhone"]}
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
          { key: "name", label: "Nombre", required: true },
          { key: "taxId", label: "RUC / NIT", required: true },
          { key: "address", label: "Direccion", required: true },
          { key: "contactName", label: "Contacto", required: true },
          { key: "contactPhone", label: "Telefono", required: true },
          { key: "status", label: "Estado", type: "select", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
        ]}
      />
    </SystemModulePage>
  );
}
