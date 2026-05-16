import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { CertificationItem } from "@/types/admin";

const emptyItem: CertificationItem = {
  title: "",
  issuer: "",
  category: "Certificacion",
  fileUrl: "",
  fileType: "image",
  status: "active",
};

export default function CertificationsAdminPage() {
  return (
    <SystemModulePage moduleKey="certifications">
      <SimpleCrudModule<CertificationItem>
        endpoint="/api/admin/certifications"
        emptyItem={emptyItem}
        titleKey="title"
        subtitleKey="category"
        newLabel="Nueva certificacion / curso"
        saveLabel="Guardar certificacion / curso"
        searchableKeys={["title", "issuer", "category"]}
        fields={[
          { key: "title", label: "Titulo", required: true },
          { key: "issuer", label: "Entidad emisora" },
          { key: "category", label: "Categoria", type: "select", required: true, options: [
            { value: "Certificacion", label: "Certificacion" },
            { value: "Curso realizado", label: "Curso realizado" },
            { value: "Capacitacion", label: "Capacitacion" },
            { value: "Reconocimiento", label: "Reconocimiento" },
          ] },
          { key: "fileUrl", label: "Imagen o documento Cloudinary", type: "image", required: true, uploadFolder: "asoserlid/certificaciones", accept: "image/*,application/pdf" },
          { key: "fileType", label: "Tipo", type: "select", options: [
            { value: "image", label: "Imagen" },
            { value: "document", label: "Documento" },
          ] },
          { key: "status", label: "Estado", type: "select", options: [
            { value: "active", label: "Visible" },
            { value: "inactive", label: "Oculto" },
          ] },
        ]}
      />
    </SystemModulePage>
  );
}
