import { adminModules } from "@/lib/adminModules";
import type { UserRole } from "@/types/admin";

export const roleAccess: Record<UserRole, string[]> = {
  administrator: adminModules.map((module) => module.key),
};

export function getDefaultAccessForRoles(roles: UserRole[]) {
  return Array.from(new Set(roles.flatMap((role) => roleAccess[role] || [])));
}

export function getEffectiveModuleAccess(roles: UserRole[], _moduleAccess: string[] = []) {
  if (roles.includes("administrator")) return getDefaultAccessForRoles(["administrator"]);
  return [];
}
