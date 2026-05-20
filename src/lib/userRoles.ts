import type { UserRole } from "@/types/admin";

export const userRoles = ["administrator"] as const satisfies readonly UserRole[];

export const roleLabels: Record<UserRole, string> = {
  administrator: "Administrador",
};

export function getRoleOptions() {
  return userRoles.map((value) => ({ value, label: roleLabels[value] }));
}
