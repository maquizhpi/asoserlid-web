import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { GalleryImage } from "@/types/admin";

const emptyItem: GalleryImage = {
  title: "",
  category: "Servicios realizados",
  imageUrl: "",
  alt: "",
  status: "active",
};

export default function GalleryAdminPage() {
  return (
    <SystemModulePage moduleKey="gallery">
      <SimpleCrudModule<GalleryImage>
        endpoint="/api/admin/gallery"
        emptyItem={emptyItem}
        titleKey="title"
        subtitleKey="category"
        newLabel="Nueva imagen"
        saveLabel="Guardar imagen"
        searchableKeys={["title", "category", "alt"]}
        fields={[
          { key: "title", label: "Titulo", required: true },
          { key: "category", label: "Categoria", required: true },
          { key: "imageUrl", label: "Imagen", type: "image", required: true },
          { key: "alt", label: "Texto alternativo" },
          { key: "status", label: "Estado", type: "select", options: [
            { value: "active", label: "Visible" },
            { value: "inactive", label: "Oculta" },
          ] },
        ]}
      />
    </SystemModulePage>
  );
}
