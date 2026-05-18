import { adminModules } from "@/lib/adminModules";
import type { UserRole } from "@/types/admin";

const allWorkersReadRoles: UserRole[] = ["administrator", "general_manager", "general_accountant", "general_secretary", "general_supervisor"];

export const roleAccess: Record<UserRole, string[]> = {
  administrator: adminModules.map((module) => module.key),
  general_manager: adminModules.map((module) => module.key).filter((key) => !["roles", "users", "backups"].includes(key)),
  general_accountant: ["dashboard-accounting", "accounting", "payment-calculation", "exports", "report-approvals", "clients", "contracts-shifts", "workers", "work-groups", "labor-history", "notifications"],
  general_secretary: ["work-groups", "clients", "contracts-shifts", "workers", "worker-intake", "worker-documents", "hiring-processes", "process-calendar", "notifications"],
  general_supervisor: ["dashboard-supervisor", "workers", "work-groups", "clients", "contracts-shifts", "supervisor-daily-report", "report-approvals", "machines", "supply-products", "supply-kits", "supply-control", "hiring-processes", "process-calendar", "process-tracking", "notifications", "exports"],
  supervisor: ["dashboard-supervisor", "workers", "work-groups", "clients", "contracts-shifts", "supervisor-daily-report", "machines", "hiring-processes", "process-calendar", "notifications"],
  operations: ["clients", "work-groups", "contracts-shifts", "supervisor-daily-report", "report-approvals", "machines", "supply-products", "supply-kits", "supply-control", "hiring-processes", "process-calendar", "notifications", "audits"],
  human_resources: ["workers", "worker-intake", "worker-documents", "labor-history", "work-groups", "contracts-shifts", "supervisor-daily-report", "report-approvals", "notifications"],
  accounting: ["dashboard-accounting", "accounting", "payment-calculation", "exports", "report-approvals", "notifications"],
  advertising: ["blog", "gallery", "certifications", "notifications"],
  legal_representative: ["dashboard-supervisor", "workers", "worker-documents", "labor-history", "work-groups", "clients", "contracts-shifts", "supervisor-daily-report", "machines", "supply-products", "supply-kits", "supply-control", "hiring-processes", "process-calendar", "notifications", "exports"],
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
  const requiredByRole = roles.some((role) => allWorkersReadRoles.includes(role)) ? ["workers"] : [];
  return Array.from(new Set([...selectedModules, ...requiredByRole]));
}
