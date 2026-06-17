import { NavLink, useLocation } from "react-router-dom";
import {
  HiOutlineCreditCard,
  HiOutlineBars3,
  HiOutlineFolderOpen,
  HiOutlineIdentification,
  HiOutlineUserCircle,
  HiOutlineBell,
} from "react-icons/hi2";
import { useTranslation } from "react-i18next";

import { useAppNavigation } from "@/context/AppNavigationContext";
import { cn } from "@/utils/cn";

const items = [
  {
    key: "profile",
    to: "/app/account/profile",
    icon: HiOutlineUserCircle,
    match: ["/app/account/profile"],
  },
  {
    key: "verification",
    to: "/app/account/verification",
    icon: HiOutlineIdentification,
    match: [
      "/app/account/verification",
      "/app/kyc",
      "/app/kyc/status",
    ],
  },
  {
    key: "payments",
    to: "/app/account/payments",
    icon: HiOutlineCreditCard,
    match: ["/app/account/payments", "/app/payments"],
  },
  {
    key: "portfolio",
    to: "/app/account/portfolio",
    icon: HiOutlineFolderOpen,
    match: ["/app/account/portfolio", "/app/portfolio"],
  },
  {
    key: "notifications",
    to: "/app/account/notifications",
    icon: HiOutlineBell,
    match: ["/app/account/notifications"],
  },
];

export default function AccountSettingsSidebar() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useAppNavigation();

  return (
    <aside
      className={cn(
        "relative h-full shrink-0 border-r border-border bg-surface transition-[width] duration-200",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden bg-surface">
        <div className={cn("flex px-4 pt-4", isSidebarCollapsed ? "justify-center" : "justify-end")}>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-border bg-card text-text-secondary shadow-sm transition-colors hover:bg-accent hover:text-text-primary"
          >
            <HiOutlineBars3 className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 p-4 pt-3">
          {items.map(({ key, to, icon: Icon, match }) => {
            const isActive = match.some((path) =>
              location.pathname.startsWith(path)
            );

            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                  isSidebarCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-text-secondary hover:bg-accent/50"
                )}
                title={isSidebarCollapsed ? t(`accountSettings.nav.${key}`) : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed ? (
                  <span className="truncate">
                    {t(`accountSettings.nav.${key}`)}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
