"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
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
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import WebIcon from "@mui/icons-material/Web";
import { adminModules } from "@/lib/adminModules";
import { roleLabels } from "@/lib/userRoles";
import type { UserRole } from "@/types/admin";
import SystemNotifier from "@/components/system/SystemNotifier";

type SystemShellProps = {
  title: string;
  subtitle?: string;
  activeKey?: string;
  children: ReactNode;
};

type ShellUser = {
  name: string;
  email: string;
  roles: UserRole[];
  moduleAccess: string[];
};

type SidebarConfigItem = {
  key: string;
  title: string;
  moduleKey?: string;
  href?: string;
  disabled?: boolean;
};

type SidebarItem = SidebarConfigItem & {
  href: string;
  disabled?: boolean;
};

type SidebarSection = {
  key: string;
  title: string;
  icon: ReactNode;
  items: SidebarConfigItem[];
  defaultOpen?: boolean;
};

const idleTimeoutMs = 30 * 60 * 1000;
const redirectStorageKey = "asoserlid_admin_redirect_after_login";
const shellUserStorageKey = "asoserlid_admin_shell_user";

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
  blog: WebIcon,
  audits: FactCheckIcon,
  gallery: WebIcon,
  certifications: AssignmentTurnedInIcon,
  backups: FolderCopyIcon,
  "dashboard-general": DashboardIcon,
};

const sidebarConfig: SidebarSection[] = [
  {
    key: "main",
    title: "Panel principal",
    icon: <DashboardIcon fontSize="small" />,
    defaultOpen: true,
    items: [
      { key: "dashboard-general", title: "Dashboard general", href: "/admin" },
    ],
  },
  {
    key: "web-content",
    title: "Contenido web",
    icon: <WebIcon fontSize="small" />,
    items: [
      { key: "blog", title: "Blog institucional", moduleKey: "blog" },
      { key: "gallery", title: "Galería", moduleKey: "gallery" },
      { key: "certifications", title: "Certificaciones", moduleKey: "certifications" },
    ],
  },
  {
    key: "human-talent",
    title: "Talento humano",
    icon: <BadgeIcon fontSize="small" />,
    items: [
      { key: "workers", title: "Trabajadores", moduleKey: "workers" },
      { key: "worker-intake", title: "Formulario nuevos trabajadores", moduleKey: "worker-intake" },
      { key: "worker-documents", title: "Control documental", moduleKey: "worker-documents" },
      { key: "labor-history", title: "Historial laboral", moduleKey: "labor-history" },
    ],
  },
  {
    key: "clients-contracts",
    title: "Clientes y contratos",
    icon: <BusinessIcon fontSize="small" />,
    items: [
      { key: "clients", title: "Clientes", moduleKey: "clients" },
      { key: "contracts-shifts", title: "Contratos / áreas / turnos", moduleKey: "contracts-shifts" },
      { key: "supply-kits", title: "Kit de insumos mensual", moduleKey: "supply-kits" },
    ],
  },
  {
    key: "operations",
    title: "Operaciones",
    icon: <EngineeringIcon fontSize="small" />,
    items: [
      { key: "supervisor-daily-report", title: "Reporte diario del supervisor", moduleKey: "supervisor-daily-report" },
      { key: "report-approvals", title: "Control de cumplimiento", moduleKey: "report-approvals" },
      { key: "supply-control", title: "Control de insumos", moduleKey: "supply-control" },
    ],
  },
  {
    key: "public-procurement",
    title: "Contratación pública",
    icon: <FactCheckIcon fontSize="small" />,
    items: [
      { key: "hiring-processes", title: "Procesos de contratación", moduleKey: "hiring-processes" },
      { key: "process-calendar", title: "Calendario de procesos", moduleKey: "process-calendar" },
    ],
  },
  {
    key: "inventory",
    title: "Recursos e inventario",
    icon: <Inventory2Icon fontSize="small" />,
    items: [
      { key: "machines", title: "Equipos de limpieza", moduleKey: "machines" },
      { key: "supply-products", title: "Productos / insumos", moduleKey: "supply-products" },
    ],
  },
  {
    key: "finance",
    title: "Finanzas y contabilidad",
    icon: <ReceiptLongIcon fontSize="small" />,
    items: [
      { key: "accounting", title: "Contabilidad", moduleKey: "accounting" },
      { key: "payment-calculation", title: "Cálculo de pagos", moduleKey: "payment-calculation" },
    ],
  },
  {
    key: "reports",
    title: "Reportes",
    icon: <AssessmentIcon fontSize="small" />,
    items: [
      { key: "dashboard-supervisor", title: "Dashboard supervisor", moduleKey: "dashboard-supervisor" },
      { key: "dashboard-accounting", title: "Dashboard contabilidad", moduleKey: "dashboard-accounting" },
      { key: "exports", title: "Reportes PDF / Excel", moduleKey: "exports" },
      { key: "notifications", title: "Notificaciones", moduleKey: "notifications" },
    ],
  },
  {
    key: "administration",
    title: "Administración y seguridad",
    icon: <SettingsIcon fontSize="small" />,
    items: [
      { key: "users", title: "Usuarios", moduleKey: "users" },
      { key: "roles", title: "Roles y permisos", moduleKey: "roles" },
      { key: "work-groups", title: "Grupos de trabajo", moduleKey: "work-groups" },
      { key: "catalogs", title: "Catálogos", moduleKey: "catalogs" },
      { key: "service-types", title: "Tipos de servicios", moduleKey: "service-types" },
      { key: "audits", title: "Auditorías", moduleKey: "audits" },
      { key: "backups", title: "Respaldos", moduleKey: "backups" },
    ],
  },
];

export default function SystemShell({ title, subtitle, activeKey, children }: SystemShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<ShellUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarSections = useMemo(() => {
    const modulesByKey = new Map(adminModules.map((module) => [module.key, module]));
    const isAdministrator = Boolean(sessionUser?.roles.includes("administrator"));
    const canSeeModule = (moduleKey?: string) => {
      if (!moduleKey) return true;
      if (!sessionUser) return false;
      return isAdministrator || sessionUser.moduleAccess.includes(moduleKey);
    };

    return sidebarConfig
      .map((section) => ({
        ...section,
        items: section.items
          .filter((item) => {
            if (item.disabled) return isAdministrator;
            return canSeeModule(item.moduleKey);
          })
          .map((item) => {
            const adminModule = item.moduleKey ? modulesByKey.get(item.moduleKey) : undefined;
            return {
              ...item,
              href: item.href || adminModule?.href || "#",
              title: item.title || adminModule?.title || item.key,
            };
          }),
      }))
      .filter((section) => section.items.length > 0);
  }, [sessionUser]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const cachedUser = readCachedShellUser();
    if (cachedUser) setSessionUser(cachedUser);

    fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (mounted && data?.user) {
          setSessionUser(data.user);
          sessionStorage.setItem(shellUserStorageKey, JSON.stringify(data.user));
        }
      })
      .catch(() => {
        if (mounted) setSessionUser(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    let timeoutId: number | undefined;

    const expireSession = async () => {
      const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      sessionStorage.setItem(redirectStorageKey, target);
      await fetch("/api/admin/login", { method: "DELETE" });
      router.push("/admin?expired=1");
      router.refresh();
    };

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(expireSession, idleTimeoutMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [router]);

  useEffect(() => {
    const endSessionOnClose = () => {
      sessionStorage.removeItem(shellUserStorageKey);
      const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      sessionStorage.setItem(redirectStorageKey, target);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/admin/session/end", new Blob(["{}"], { type: "application/json" }));
        return;
      }
      void fetch("/api/admin/session/end", { method: "POST", keepalive: true });
    };

    window.addEventListener("pagehide", endSessionOnClose);
    return () => window.removeEventListener("pagehide", endSessionOnClose);
  }, []);

  async function logout() {
    sessionStorage.removeItem(redirectStorageKey);
    sessionStorage.removeItem(shellUserStorageKey);
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  function toggleGroup(key: string) {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[19.5rem_1fr]">
        {sidebarOpen && <button type="button" aria-label="Cerrar menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/55 lg:hidden" />}

        <aside className={`fixed inset-y-0 left-0 z-40 w-[19.5rem] max-w-[86vw] overflow-y-auto border-r border-[#244565] bg-[#0f2742] text-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:block lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
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

          {sessionUser && (
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/75">Usuario conectado</p>
              <p className="mt-1 truncate text-sm font-bold text-white">{sessionUser.name}</p>
              <p className="mt-0.5 truncate text-xs text-cyan-100/80">{sessionUser.email}</p>
              <span className="mt-2 inline-flex max-w-full items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-50">
                {formatRoles(sessionUser.roles)}
              </span>
            </div>
          )}

          <nav className="space-y-2 px-3 py-4">
            {sidebarSections.map((section) => {
              const hasActive = section.items.some((item) => isItemActive(item, activeKey, pathname));
              const open = openGroups[section.key] ?? section.defaultOpen ?? hasActive;
              return (
                <NavGroup
                  key={section.key}
                  title={section.title}
                  icon={section.icon}
                  modules={section.items}
                  activeKey={activeKey}
                  pathname={pathname}
                  open={open}
                  onToggle={() => toggleGroup(section.key)}
                />
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-[#173C61] hover:bg-slate-100 lg:hidden"
                  aria-label="Abrir menu"
                >
                  <MenuIcon fontSize="small" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-[#173C61] sm:text-2xl">{title}</h1>
                  {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {sessionUser && (
                  <div className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-right sm:block">
                    <p className="max-w-[16rem] truncate text-sm font-bold text-[#173C61]">{sessionUser.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{formatRoles(sessionUser.roles)}</p>
                  </div>
                )}
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
      <SystemNotifier />
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
  modules: SidebarItem[];
  activeKey?: string;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (modules.length === 0) return null;

  const hasActive = modules.some((module) => isItemActive(module, activeKey, pathname));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
          hasActive
            ? "border-cyan-300/30 bg-cyan-300/15 text-white shadow-sm"
            : "border-white/10 bg-white/5 text-cyan-50 hover:border-cyan-300/25 hover:bg-white/10"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={hasActive ? "text-cyan-200" : "text-cyan-100"}>{icon}</span>
          {title}
        </span>
        <span className="text-cyan-100">
          {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </span>
      </button>

      {open && (
        <div className="ml-4 mt-1.5 space-y-1 border-l border-cyan-200/20 pl-3">
          {modules.map((item) => {
            const Icon = moduleIcons[item.key] || CategoryIcon;
            const active = isItemActive(item, activeKey, pathname);

            if (item.disabled) {
              return (
                <div
                  key={item.key}
                  className="flex cursor-not-allowed items-center gap-2.5 rounded-md border border-transparent px-3 py-2 text-[13px] font-semibold leading-tight text-cyan-100/45"
                  title="Módulo preparado, pendiente de implementación"
                >
                  <span className="text-cyan-100/40">
                    <Icon sx={{ fontSize: 18 }} />
                  </span>
                  <span className="min-w-0">{item.title}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] font-semibold leading-tight transition ${
                  active
                    ? "border-cyan-300/40 bg-[#1d3f5f] text-white shadow-sm"
                    : "border-transparent text-slate-200 hover:border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={active ? "text-cyan-200" : "text-cyan-100/90"}>
                  <Icon sx={{ fontSize: 18 }} />
                </span>
                <span className="min-w-0">{item.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isItemActive(item: SidebarItem, activeKey: string | undefined, pathname: string) {
  if (activeKey && (activeKey === item.key || activeKey === item.moduleKey)) return true;
  return pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
}

function formatRoles(roles: UserRole[]) {
  return roles.map((role) => roleLabels[role] || role).join(", ");
}

function readCachedShellUser() {
  try {
    const value = sessionStorage.getItem(shellUserStorageKey);
    if (!value) return null;
    return JSON.parse(value) as ShellUser;
  } catch {
    return null;
  }
}
