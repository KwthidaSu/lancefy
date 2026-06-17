import { NavLink, useLocation } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineBars3,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlineShieldExclamation,
} from "react-icons/hi2";
import { useTranslation } from "react-i18next";

import { useAppNavigation } from "@/context/AppNavigationContext";
import { cn } from "@/utils/cn";

const menu = [
  { key: "overview", to: "/app/dashboard", icon: HiOutlineChartBar },
  { key: "projects", to: "/app/projects", icon: HiOutlineFolder },
  { key: "work", to: "/app/work", icon: HiOutlineBriefcase },
  { key: "proposals", to: "/app/proposals", icon: HiOutlineDocumentText },
  { key: "transactions", to: "/app/finance", icon: HiOutlineBanknotes },
  { key: "disputes", to: "/app/disputes", icon: HiOutlineShieldExclamation },
  { key: "messages", to: "/app/messages", icon: HiOutlineChatBubbleLeftRight },
  { key: "calendar", to: "/app/calendar", icon: HiOutlineCalendarDays },
];

export default function DashboardSidebar() {
  const { t } = useTranslation("common");
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useAppNavigation();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "relative h-full shrink-0 border-r border-border bg-surface transition-[width] duration-200",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}
    >
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
        {menu.map(({ key, to, icon: Icon }) => (
          <NavLink key={to} to={to} end title={isSidebarCollapsed ? t(`dashboard.${key}`) : undefined}>
            {({ isActive }) => {
              const activeForCreateJob =
                key === "projects" && location.pathname.startsWith("/app/jobs/create");
              const active = isActive || activeForCreateJob;

              return (
                <div
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                    isSidebarCollapsed ? "justify-center" : "gap-3",
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-text-secondary hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-5 w-5 text-current" />
                  {!isSidebarCollapsed ? (
                    <span className="truncate">{t(`dashboard.${key}`)}</span>
                  ) : null}
                </div>
              );
            }}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
