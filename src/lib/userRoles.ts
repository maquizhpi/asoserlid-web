import type { UserRole } from "@/types/admin";

export const userRoles = [
  "administrator",
  "supervisor",
  "operations",
  "human_resources",
  "accounting",
  "advertising",
  "legal_representative",
  "client",
  "worker",
] as const satisfies readonly UserRole[];

export const roleLabels: Record<UserRole, string> = {
  administrator: "Administrador",
  supervisor: "Supervisor",
  operations: "Operaciones",
  human_resources: "RR. HH.",
  accounting: "Contabilidad",
  advertising: "Publicidad",
  legal_representative: "Representante legal",
  client: "Cliente",
  worker: "Trabajador",
};

export function getRoleOptions() {
  return userRoles.map((value) => ({ value, label: roleLabels[value] }));
}
