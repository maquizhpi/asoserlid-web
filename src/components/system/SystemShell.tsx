"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import CalculateIcon from "@mui/icons-material/Calculate";
import CategoryIcon from "@mui/icons-material/Category";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import EventIcon from "@mui/icons-material/Event";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import GroupsIcon from "@mui/icons-material/Groups";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import WebIcon from "@mui/icons-material/Web";
import {
  operationsModules,
  reportsModules,
  resourcesModules,
  settingsModules,
  type AdminModule,
} from "@/lib/adminModules";

type SystemShellProps = {
  title: string;
  subtitle?: string;
  activeKey?: string;
  children: ReactNode;
};

const moduleIcons: Record<string, typeof DashboardIcon> = {
  roles: SupervisorAccountIcon,
  users: PeopleAltIcon,
  "work-groups": GroupsIcon,
  catalogs: CategoryIcon,
  "service-types": CleaningServicesIcon,
  workers: BadgeIcon,
  "dashboard-supervisor": DashboardIcon,
  "dashboard-accounting": DashboardIcon,
  "worker-intake": BadgeIcon,
  "worker-documents": FolderCopyIcon,
  "labor-history": WorkHistoryIcon,
  clients: BusinessIcon,
  "contracts-shifts": DescriptionIcon,
  "supervisor-daily-report": AssignmentTurnedInIcon,
  accounting: ReceiptLongIcon,
  "payment-calculation": CalculateIcon,
  machines: HomeRepairServiceIcon,
  "supply-products": Inventory2Icon,
  "supply-kits": Inventory2Icon,
  "supply-control": ListAltIcon,
  "hiring-processes": FactCheckIcon,
  "process-calendar": EventIcon,
  notifications: NotificationsIcon,
  "report-approvals": FactCheckIcon,
  exports: AssessmentIcon,
};

export default function SystemShell({ title, subtitle, activeKey, children }: SystemShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeGroups = useMemo(
    () => ({
      settings: settingsModules.some((module) => module.key === activeKey || module.href === pathname),
      operations: operationsModules.some((module) => module.key === activeKey || module.href === pathname),
      resources: resourcesModules.some((module) => module.key === activeKey || module.href === pathname),
      reports: reportsModules.some((module) => module.key === activeKey || module.href === pathname),
    }),
    [activeKey, pathname]
  );
  const [openGroups, setOpenGroups] = useState({
    settings: true,
    operations: activeGroups.operations,
    resources: activeGroups.resources,
    reports: activeGroups.reports,
  });

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  function toggleGroup(key: keyof typeof openGroups) {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[19.5rem_1fr]">
        <aside className="border-r border-slate-800 bg-[#0f2742] text-white shadow-xl">
          <div className="border-b border-white/10 px-5 py-5">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#33C3C9] text-[#0f2742]">
                <Inventory2Icon fontSize="small" />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">ASOSERLID</span>
                <span className="mt-1 block text-xl font-bold">Sistema</span>
              </span>
            </Link>
          </div>

          <nav className="space-y-2 px-3 py-4">
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                pathname === "/admin" ? "bg-white text-[#173C61]" : "text-cyan-50 hover:bg-white/10"
              }`}
            >
              <DashboardIcon fontSize="small" />
              Panel principal
            </Link>

            <NavGroup
              title="Configuraciones"
              icon={<SettingsIcon fontSize="small" />}
              modules={settingsModules}
              activeKey={activeKey}
              pathname={pathname}
              open={openGroups.settings}
              onToggle={() => toggleGroup("settings")}
            />
            <NavGroup
              title="Operaciones"
              icon={<EngineeringIcon fontSize="small" />}
              modules={operationsModules}
              activeKey={activeKey}
              pathname={pathname}
              open={openGroups.operations}
              onToggle={() => toggleGroup("operations")}
            />
            <NavGroup
              title="Recursos"
              icon={<HomeRepairServiceIcon fontSize="small" />}
              modules={resourcesModules}
              activeKey={activeKey}
              pathname={pathname}
              open={openGroups.resources}
              onToggle={() => toggleGroup("resources")}
            />
            <NavGroup
              title="Reportes"
              icon={<AssessmentIcon fontSize="small" />}
              modules={reportsModules}
              activeKey={activeKey}
              pathname={pathname}
              open={openGroups.reports}
              onToggle={() => toggleGroup("reports")}
            />
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold text-[#173C61]">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <WebIcon fontSize="small" />
                  Sitio web
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-md bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173C61]"
                >
                  <LogoutIcon fontSize="small" />
                  Salir
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6">{children}</div>
        </section>
      </div>
    </main>
  );
}

function NavGroup({
  title,
  icon,
  modules,
  activeKey,
  pathname,
  open,
  onToggle,
}: {
  title: string;
  icon: ReactNode;
  modules: AdminModule[];
  activeKey?: string;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const hasActive = modules.some((module) => activeKey === module.key || pathname === module.href);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold transition ${
          hasActive ? "bg-white/15 text-white" : "text-cyan-50 hover:bg-white/10"
        }`}
      >
        <span className="flex items-center gap-3">
          {icon}
          {title}
        </span>
        {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </button>

      {open && (
        <div className="mt-1 space-y-1 pl-3">
          {modules.map((item) => {
            const Icon = moduleIcons[item.key] || CategoryIcon;
            const active = activeKey === item.key || pathname === item.href;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-white text-[#173C61] shadow-sm" : "text-cyan-50 hover:bg-white/10"
                }`}
              >
                <Icon fontSize="small" />
                {item.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
