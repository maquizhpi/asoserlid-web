"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BadgeIcon from "@mui/icons-material/Badge";
import BarChartIcon from "@mui/icons-material/BarChart";
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
import type { AdminUser, InternalNotification, UserRole, Worker } from "@/types/admin";
import SystemNotifier, { notifySystem } from "@/components/system/SystemNotifier";

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
  primaryWorkGroupName?: string;
  primaryWorkGroupLogo?: string;
  workGroups?: { id: string; name: string; logoUrl?: string }[];
};

type ShellProfile = {
  user: AdminUser;
  worker?: Worker | null;
};

type ContractExpirationAlert = {
  clientName: string;
  endDate: string;
  daysLeft: number;
  autoClosed: boolean;
};

type HiringProcessAlert = {
  message: string;
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
const contractAlertStoragePrefix = "asoserlid_contract_alerts_seen";
const processAlertStoragePrefix = "asoserlid_process_alerts_seen";
const notificationAlertStoragePrefix = "asoserlid_notifications_seen";

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
  "process-tracking": BarChartIcon,
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
      { key: "process-tracking", title: "Seguimiento de procesos", moduleKey: "process-tracking" },
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
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    if (!sessionUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `${contractAlertStoragePrefix}:${sessionUser.email}:${today}`;
    if (sessionStorage.getItem(key)) return;

    fetch("/api/admin/contract-expiration-alerts", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const alerts = data?.alerts || [];
        if (!alerts.length) {
          sessionStorage.setItem(key, "1");
          return;
        }
        const closed = alerts.filter((alert: ContractExpirationAlert) => alert.autoClosed);
        const expiring = alerts.filter((alert: ContractExpirationAlert) => !alert.autoClosed);
        const lines = [
          closed.length ? `${closed.length} contrato(s) ya finalizaron y fueron cerrados automaticamente; el personal quedo disponible.` : "",
          expiring.length ? `${expiring.length} contrato(s) terminan en los proximos 30 dias. Valida la informacion antes del cierre.` : "",
          ...alerts.slice(0, 5).map((alert: ContractExpirationAlert) => `- ${alert.clientName}: ${alert.endDate} (${alert.daysLeft} dia(s))`),
        ].filter(Boolean);
        notifySystem(lines.join("\n"), { tone: closed.length ? "warning" : "info", title: "Aviso de contratos" });
        sessionStorage.setItem(key, "1");
      })
      .catch(() => undefined);
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser || !canUserAccessModule(sessionUser, "notifications")) return;
    let mounted = true;

    fetch("/api/admin/notifications", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted) return;
        const visible = dedupeNotificationsForUser(
          ((data?.items || []) as InternalNotification[]).filter((item) => isNotificationVisibleForUser(item, sessionUser))
        );
        setNotifications(visible);

        const active = visible.filter((item) => item.status === "active");
        if (!active.length) return;
        const today = new Date().toISOString().slice(0, 10);
        const key = `${notificationAlertStoragePrefix}:${sessionUser.email}:${today}`;
        if (sessionStorage.getItem(key)) return;
        notifySystem(
          [`Tienes ${active.length} notificacion(es) activa(s).`, ...active.slice(0, 5).map((item) => `- ${item.title}: ${item.message.split("\n")[0]}`)].join("\n"),
          { tone: "info", title: "Notificaciones" }
        );
        sessionStorage.setItem(key, "1");
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `${processAlertStoragePrefix}:${sessionUser.email}:${today}`;
    if (sessionStorage.getItem(key)) return;

    fetch("/api/admin/hiring-process-alerts", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const alerts = data?.alerts || [];
        if (!alerts.length) {
          sessionStorage.setItem(key, "1");
          return;
        }
        const lines = [
          `${alerts.length} fecha(s) o actividad(es) de procesos requieren seguimiento.`,
          ...alerts.slice(0, 5).map((alert: HiringProcessAlert) => `- ${alert.message}`),
        ];
        notifySystem(lines.join("\n"), { tone: "info", title: "Aviso de procesos" });
        sessionStorage.setItem(key, "1");
      })
      .catch(() => undefined);
  }, [sessionUser]);

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
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">SIT</span>
                <span className="mt-1 block text-xl font-bold">Sistema Integrado</span>
              </span>
            </Link>
          </div>

          {sessionUser && (
            <div className="border-b border-white/10 px-5 py-4">
              {sessionUser.primaryWorkGroupName && (
                <div className="mb-3 flex items-center gap-3 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2">
                  {sessionUser.primaryWorkGroupLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sessionUser.primaryWorkGroupLogo} alt="" className="h-10 w-10 shrink-0 rounded-md border border-white/15 bg-white object-contain p-1" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyan-300/20 text-sm font-black text-cyan-50">
                      {sessionUser.primaryWorkGroupName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/75">Empresa</p>
                    <p className="mt-1 truncate text-sm font-bold text-white">{sessionUser.primaryWorkGroupName}</p>
                  </div>
                </div>
              )}
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
                {sessionUser && (
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <AccountCircleIcon fontSize="small" />
                    Mi perfil
                  </button>
                )}
                {sessionUser && canUserAccessModule(sessionUser, "notifications") && (
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(true)}
                    className="relative inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <NotificationsIcon fontSize="small" />
                    Notificaciones
                    {notifications.filter((item) => item.status === "active").length > 0 && (
                      <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                        {notifications.filter((item) => item.status === "active").length}
                      </span>
                    )}
                  </button>
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
      {notificationsOpen && (
        <NotificationsPanel
          notifications={notifications}
          user={sessionUser}
          onAcknowledge={(notification) => acknowledgeNotification(notification)}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      <SystemNotifier />
    </main>
  );

  async function acknowledgeNotification(notification: InternalNotification) {
    if (!sessionUser || !notification._id) return;
    const related = notifications.filter((item) => notificationIdentity(item) === notificationIdentity(notification));
    const original = notifications;
    setNotifications((current) => current.filter((item) => notificationIdentity(item) !== notificationIdentity(notification)));

    const results = await Promise.all(
      related
        .filter((item) => item._id)
        .map((item) => {
          const acknowledgedBy = Array.from(new Set([...(item.acknowledgedBy || []), sessionUser.email]));
          return fetch(`/api/admin/notifications/${item._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...item, acknowledgedBy }),
          });
        })
    );
    if (results.some((res) => !res.ok)) {
      setNotifications(original);
      notifySystem("No se pudo marcar la notificacion como conocida.", { tone: "error", title: "Notificacion" });
    }
  }
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", nextPassword: "", confirmPassword: "" });

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (mounted) setProfile(data.profile || null);
      })
      .catch(() => notifySystem("No se pudo cargar tu perfil.", { tone: "error", title: "Mi perfil" }))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwords),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      notifySystem(data.error || "No se pudo actualizar la contrasena.", { tone: "error", title: "Mi perfil" });
      return;
    }
    setPasswords({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    notifySystem("Contrasena actualizada correctamente.", { tone: "success", title: "Mi perfil" });
  }

  const worker = profile?.worker;
  const user = profile?.user;

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/45 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Mi perfil</h2>
            <p className="mt-1 text-sm text-slate-600">Datos personales y seguridad de la cuenta.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Cerrar
          </button>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-slate-600">Cargando perfil...</p>
        ) : (
          <div className="grid gap-5 p-5">
            <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-[#173C61]">Cuenta de usuario</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ProfileInfo label="Nombre" value={user?.name || "-"} />
                <ProfileInfo label="Correo" value={user?.email || "-"} />
                <ProfileInfo label="Roles" value={user?.roles ? formatRoles(user.roles) : "-"} />
                <ProfileInfo label="Estado" value={user?.active ? "Activo" : "Inactivo"} />
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-[#173C61]">Datos personales</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ProfileInfo label="Cedula" value={worker?.documentId || user?.workerDocumentId || "-"} />
                <ProfileInfo label="Cargo" value={worker?.position || "-"} />
                <ProfileInfo label="Telefono" value={worker?.phone || "-"} />
                <ProfileInfo label="Correo personal" value={worker?.email || "-"} />
                <ProfileInfo label="Grupo de trabajo" value={worker?.workGroupName || "-"} />
                <ProfileInfo label="Estado laboral" value={worker?.status === "active" ? "Activo" : worker?.status === "inactive" ? "Inactivo" : "-"} />
              </div>
            </section>

            <form onSubmit={updatePassword} className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-[#173C61]">Cambiar contrasena</h3>
              <p className="mt-1 text-xs text-slate-500">La nueva contrasena se guarda cifrada mediante hash seguro.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Contrasena actual
                  <input required type="password" className={profileInputClass} value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Nueva contrasena
                  <input required minLength={8} type="password" className={profileInputClass} value={passwords.nextPassword} onChange={(e) => setPasswords({ ...passwords, nextPassword: e.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Confirmar contrasena
                  <input required minLength={8} type="password" className={profileInputClass} value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
                </label>
              </div>
              <button disabled={saving} className="mt-4 rounded-md bg-[#173C61] px-5 py-3 text-sm font-bold text-white hover:bg-[#218F93] disabled:opacity-60">
                {saving ? "Actualizando..." : "Actualizar contrasena"}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const profileInputClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

function NotificationsPanel({
  notifications,
  user,
  onAcknowledge,
  onClose,
}: {
  notifications: InternalNotification[];
  user: ShellUser | null;
  onAcknowledge: (notification: InternalNotification) => void;
  onClose: () => void;
}) {
  const active = notifications.filter((item) => item.status === "active");
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/35 px-4 py-6 sm:px-6">
      <section className="ml-auto flex h-full w-full max-w-xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-[#173C61]">Notificaciones</h2>
            <p className="mt-1 text-sm text-slate-600">{active.length} activa(s) de {notifications.length} notificacion(es).</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-5">
          {notifications.map((item) => (
            <article key={item._id || `${item.title}-${item.createdAt}`} className={`rounded-md border-l-4 p-4 ${notificationCardClass(item.status)}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-bold text-[#173C61]">{item.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${notificationBadgeClass(item.status)}`}>{notificationStatusLabel(item.status)}</span>
                  <button
                    type="button"
                    onClick={() => onAcknowledge(item)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:border-[#218F93] hover:text-[#173C61]"
                    title={`Marcar como conocida para ${user?.email || "este usuario"}`}
                    aria-label="Marcar notificacion como conocida"
                  >
                    X
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{item.message}</p>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                {item.dueDate ? `Fecha: ${item.dueDate}` : "Sin fecha"} | Para: {item.role === "all" ? "Todos" : roleLabels[item.role] || item.role}
              </p>
            </article>
          ))}
          {!notifications.length && <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No hay notificaciones para mostrar.</p>}
        </div>
      </section>
    </div>
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

function canUserAccessModule(user: ShellUser, moduleKey: string) {
  return user.roles.includes("administrator") || user.moduleAccess.includes(moduleKey);
}

function isNotificationVisibleForUser(notification: InternalNotification, user: ShellUser) {
  if ((notification.acknowledgedBy || []).includes(user.email)) return false;
  const roleMatches = notification.role === "all" || user.roles.includes(notification.role);
  if (!roleMatches) return false;
  if (!notification.workGroupId && !notification.workGroupName) return true;
  if (user.roles.includes("administrator")) return true;
  const userGroups = user.workGroups || [];
  return userGroups.some((group) =>
    (notification.workGroupId && group.id === notification.workGroupId)
    || (notification.workGroupName && group.name === notification.workGroupName)
  );
}

function dedupeNotificationsForUser(notifications: InternalNotification[]) {
  const map = new Map<string, InternalNotification>();
  for (const notification of notifications) {
    const key = notificationIdentity(notification);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, notification);
      continue;
    }
    map.set(key, mergeNotifications(existing, notification));
  }
  return Array.from(map.values());
}

function mergeNotifications(a: InternalNotification, b: InternalNotification): InternalNotification {
  const acknowledgedBy = Array.from(new Set([...(a.acknowledgedBy || []), ...(b.acknowledgedBy || [])]));
  const createdAt = [a.createdAt, b.createdAt].filter(Boolean).sort()[0] || a.createdAt || b.createdAt;
  const status = a.status === "active" || b.status === "active" ? "active" : a.status;
  return {
    ...a,
    role: a.role === b.role ? a.role : "all",
    status,
    createdAt,
    acknowledgedBy,
  };
}

function notificationIdentity(notification: InternalNotification) {
  return [
    normalizeNotificationText(notification.title),
    normalizeNotificationText(notification.message),
    notification.workGroupId || "",
    normalizeNotificationText(notification.workGroupName || ""),
    notification.dueDate || "",
  ].join("|");
}

function normalizeNotificationText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function notificationStatusLabel(status: InternalNotification["status"]) {
  return { active: "Activa", read: "Leida", archived: "Archivada" }[status];
}

function notificationCardClass(status: InternalNotification["status"]) {
  return {
    active: "border-l-[#218F93] border-slate-200 bg-cyan-50/60",
    read: "border-l-emerald-500 border-slate-200 bg-emerald-50/50",
    archived: "border-l-slate-400 border-slate-200 bg-slate-50",
  }[status];
}

function notificationBadgeClass(status: InternalNotification["status"]) {
  return {
    active: "border-cyan-200 bg-cyan-100 text-[#173C61]",
    read: "border-emerald-200 bg-emerald-100 text-emerald-800",
    archived: "border-slate-200 bg-slate-100 text-slate-700",
  }[status];
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
