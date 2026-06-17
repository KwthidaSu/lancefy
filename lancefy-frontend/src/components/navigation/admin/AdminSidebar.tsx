import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { adminNavigation } from "./adminNavigation";

export default function AdminSidebar() {
  const { t } = useTranslation("common");

  return (
    <div className="h-full bg-surface">
      <nav className="space-y-1 p-4 pt-6">
        {adminNavigation.map((item) => {
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.key}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  "cursor-not-allowed text-text-secondary opacity-50"
                )}
              >
                <Icon className="h-5 w-5 text-current" />
                <span className="truncate">{t(`admin.${item.key}`)}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-text-secondary hover:bg-accent/50"
                )
              }
            >
              <Icon className="h-5 w-5 text-current" />
              <span className="truncate">{t(`admin.${item.key}`)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
