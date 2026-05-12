import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { SupplyProduct } from "@/types/admin";

const emptyProduct: SupplyProduct = {
  code: "",
  auxiliaryCode: "",
  name: "",
  category: "GENERAL",
  brand: "",
  unit: "UNIDAD",
  unitsPerBox: 1,
  stock: 0,
  iva: "SI",
  cost: 0,
  salePrice: 0,
  technicalInfo: "",
  notes: "",
  status: "active",
};

export default function SupplyProductsPage() {
  return (
    <SystemModulePage moduleKey="supply-products">
      <SimpleCrudModule<SupplyProduct>
        endpoint="/api/admin/supply-products"
        emptyItem={emptyProduct}
        titleKey="name"
        subtitleKey="code"
        newLabel="Nuevo producto / insumo"
        saveLabel="Guardar producto"
        searchableKeys={["code", "auxiliaryCode", "name", "category", "brand", "unit"]}
        filters={[
          {
            key: "status",
            label: "Todos los estados",
            options: [
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ],
          },
          {
            key: "category",
            label: "Todas las categorias",
            options: [
              { value: "GENERAL", label: "General" },
              { value: "PRODUCTOS QUIMICOS", label: "Productos quimicos" },
              { value: "EQUIPOS", label: "Equipos" },
              { value: "HERRAMIENTAS", label: "Herramientas" },
            ],
          },
        ]}
        fields={[
          { key: "code", label: "Codigo principal", required: true },
          { key: "auxiliaryCode", label: "Codigo auxiliar" },
          { key: "name", label: "Nombre del producto", required: true },
          { key: "category", label: "Tipo de insumo / categoria", required: true },
          { key: "brand", label: "Marca" },
          { key: "unit", label: "Unidad de medida", required: true },
          { key: "unitsPerBox", label: "Unidades por caja" },
          { key: "stock", label: "Stock disponible" },
          { key: "iva", label: "IVA" },
          { key: "cost", label: "Costo" },
          { key: "salePrice", label: "P.V.P" },
          { key: "technicalInfo", label: "Informacion tecnica", type: "textarea" },
          { key: "notes", label: "Observacion", type: "textarea" },
          { key: "status", label: "Estado", type: "select", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
        ]}
      />
    </SystemModulePage>
  );
}
