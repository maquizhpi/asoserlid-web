import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupplyMovement } from "@/types/admin";

const emptyItem: SupplyMovement = {
  clientId: "",
  clientName: "",
  productName: "",
  deliveredQuantity: 0,
  consumedQuantity: 0,
  pendingQuantity: 0,
  movementDate: new Date().toISOString().slice(0, 10),
  responsible: "",
  notes: "",
};

export default function SupplyControlPage() {
  return (
    <SystemModulePage moduleKey="supply-control">
      <SimpleCrudModule<SupplyMovement>
        endpoint="/api/admin/supply-movements"
        emptyItem={emptyItem}
        titleKey="clientName"
        subtitleKey="productName"
        newLabel="Nueva entrega / consumo"
        saveLabel="Guardar movimiento"
        fields={[
          { key: "movementDate", label: "Fecha", type: "date", required: true },
          { key: "clientName", label: "Cliente", required: true },
          { key: "productName", label: "Producto / insumo", required: true },
          { key: "deliveredQuantity", label: "Entregado", required: true },
          { key: "consumedQuantity", label: "Consumido", required: true },
          { key: "pendingQuantity", label: "Pendiente", required: true },
          { key: "responsible", label: "Responsable", required: true },
          { key: "notes", label: "Observaciones", type: "textarea" },
        ]}
      />
    </SystemModulePage>
  );
}
