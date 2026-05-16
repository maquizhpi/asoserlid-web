import { adminModules } from "@/lib/adminModules";
import type { UserRole } from "@/types/admin";

export const roleAccess: Record<UserRole, string[]> = {
  administrator: adminModules.map((module) => module.key),
  supervisor: ["dashboard-supervisor", "workers", "work-groups", "clients", "contracts-shifts", "supervisor-daily-report", "machines", "hiring-processes", "process-calendar", "notifications"],
  operations: ["clients", "work-groups", "contracts-shifts", "supervisor-daily-report", "report-approvals", "machines", "supply-products", "supply-kits", "supply-control", "hiring-processes", "process-calendar", "notifications", "audits"],
  human_resources: ["workers", "worker-intake", "worker-documents", "labor-history", "work-groups", "contracts-shifts", "supervisor-daily-report", "report-approvals", "notifications"],
  accounting: ["dashboard-accounting", "accounting", "payment-calculation", "exports", "report-approvals", "notifications"],
  advertising: ["blog", "gallery", "certifications", "notifications"],
  legal_representative: ["contracts-shifts", "supervisor-daily-report", "hiring-processes", "process-calendar", "notifications"],
  client: ["contracts-shifts", "supervisor-daily-report", "exports", "supply-products", "supply-kits", "notifications"],
  worker: ["supervisor-daily-report"],
};

export function getDefaultAccessForRoles(roles: UserRole[]) {
  return Array.from(new Set(roles.flatMap((role) => roleAccess[role] || [])));
}

export function getEffectiveModuleAccess(roles: UserRole[], moduleAccess: string[] = []) {
  const allowedModules = new Set(adminModules.map((module) => module.key));
  const selectedModules = moduleAccess.filter((module) => allowedModules.has(module));
  if (roles.includes("administrator")) return getDefaultAccessForRoles(["administrator"]);
  return Array.from(new Set([...getDefaultAccessForRoles(roles), ...selectedModules]));
}
