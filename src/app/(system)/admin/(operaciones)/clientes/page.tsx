"use client";

import { useEffect, useMemo, useState } from "react";
import SimpleCrudModule from "@/components/system/SimpleCrudModule";
import SystemModulePage from "@/components/system/SystemModulePage";
import type { Client, UserRole, WorkGroup } from "@/types/admin";

const emptyClient: Client = {
  name: "",
  taxId: "",
  address: "",
  contactName: "",
  contactPhone: "",
  workGroupId: "",
  workGroupName: "",
  status: "active",
};

export default function ClientsPage() {
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [sessionUser, setSessionUser] = useState<{ roles: UserRole[]; workGroups?: { id: string; name: string }[] } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/work-groups", { cache: "no-store" }),
      fetch("/api/admin/me", { cache: "no-store" }),
    ])
      .then(async ([groupsRes, meRes]) => {
        const groupsData = groupsRes.ok ? await groupsRes.json().catch(() => ({})) : {};
        const meData = meRes.ok ? await meRes.json().catch(() => ({})) : {};
        const scopedGroups = (meData.user?.workGroups || []).map((group: { id: string; name: string }) => ({
          _id: group.id,
          name: group.name,
          commercialName: group.name,
          status: "active",
        }));
        setWorkGroups((groupsData.items || []).length ? groupsData.items : scopedGroups);
        setSessionUser(meData.user || null);
      })
      .catch(() => {
        setWorkGroups([]);
        setSessionUser(null);
      });
  }, []);

  const canChooseOwner = Boolean(sessionUser?.roles.some((role) => ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor", "accounting"].includes(role)));
  const defaultOwner = !canChooseOwner && workGroups.length === 1 ? workGroups[0] : null;
  const clientTemplate = useMemo<Client>(() => ({
    ...emptyClient,
    workGroupId: defaultOwner?._id || "",
    workGroupName: defaultOwner ? defaultOwner.commercialName || defaultOwner.name : "",
  }), [defaultOwner]);
  const workGroupOptions = useMemo(
    () => [
      ...(canChooseOwner ? [{ value: "", label: "Sin empresa asignada" }] : []),
      ...workGroups.map((group) => ({ value: group._id || group.name, label: group.commercialName || group.name })),
    ],
    [canChooseOwner, workGroups]
  );

  return (
    <SystemModulePage moduleKey="clients">
      <SimpleCrudModule<Client>
        endpoint="/api/admin/clients"
        emptyItem={clientTemplate}
        titleKey="name"
        subtitleKey="taxId"
        newLabel="Nuevo cliente"
        saveLabel="Guardar cliente"
        importConfig={{
          title: "Importar clientes",
          endpoint: "/api/admin/imports/clients",
          templateHref: "/api/admin/imports/clients",
        }}
        searchableKeys={["name", "taxId", "address", "contactName", "contactPhone", "workGroupName"]}
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
          {
            key: "workGroupId",
            label: "Empresa / grupo propietario",
            type: "select",
            options: workGroupOptions,
            mapValueToPatch: (value) => ({
              workGroupName: workGroupOptions.find((option) => option.value === value)?.label || "",
            }),
          },
          { key: "address", label: "Direccion", required: true },
          { key: "contactName", label: "Contacto", required: true },
          { key: "contactPhone", label: "Telefono", required: true },
          { key: "status", label: "Estado", type: "select", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
        ]}
      />
    </SystemModulePage>
  );
}
