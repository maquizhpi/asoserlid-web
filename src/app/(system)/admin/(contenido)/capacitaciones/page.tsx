import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { CourseItem } from "@/types/admin";

const emptyItem: CourseItem = {
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  status: "active",
};

export default function CoursesAdminPage() {
  return (
    <SystemModulePage moduleKey="courses">
      <SimpleCrudModule<CourseItem>
        endpoint="/api/admin/courses"
        emptyItem={emptyItem}
        titleKey="title"
        subtitleKey="subtitle"
        newLabel="Nueva capacitacion"
        saveLabel="Guardar capacitacion"
        searchableKeys={["title", "subtitle", "description"]}
        fields={[
          { key: "title", label: "Titulo del curso", required: true },
          { key: "subtitle", label: "Subtitulo (tema principal)", required: true },
          { key: "description", label: "Descripcion completa", type: "textarea" },
          { key: "imageUrl", label: "Imagen Cloudinary", type: "image", uploadFolder: "asoserlid/cursos" },
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
