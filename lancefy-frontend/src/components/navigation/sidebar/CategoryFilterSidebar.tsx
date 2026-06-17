import { useState } from "react";
import { HiSquares2X2 } from "react-icons/hi2";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  dashboardSidebarActionClass,
  dashboardSidebarCheckboxClass,
  dashboardSidebarIconSlotClass,
  dashboardSidebarItemClass,
  dashboardSidebarScrollableClass,
  dashboardSidebarSectionLabelClass,
} from "./sidebarStyles";

export type Category = {
  label: string;
  value: string;
};

interface CategoryFilterSidebarProps {
  title: string;
  allLabel?: string;
  popularLabel?: string;
  clearLabel?: string;
  categories: Category[];
  viewAllLabel?: string;
  values?: string[];
  onChange?: (values: string[]) => void;
  variant?: "default" | "dashboard";
}

export default function CategoryFilterSidebar({
  title,
  allLabel = "All",
  popularLabel = "Popular",
  clearLabel = "Clear filters",
  categories,
  viewAllLabel,
  values,
  onChange,
  variant = "default",
}: CategoryFilterSidebarProps) {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selected = values !== undefined ? values : internalSelected;
  const isDashboardVariant = variant === "dashboard";

  const emit = (next: string[]) => {
    if (values === undefined) setInternalSelected(next);
    onChange?.(next);
  };

  const toggleAll = () => emit([]);

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    emit(next);
  };

  const isAll = selected.length === 0;

  return (
    <div
      className={cn(
        isDashboardVariant
          ? cn(dashboardSidebarScrollableClass, "flex flex-col")
          : "p-4 pt-5"
      )}
    >
      {title ? (
        isDashboardVariant ? (
          <p className={cn("mb-2", dashboardSidebarSectionLabelClass)}>
            {title}
          </p>
        ) : (
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <HiSquares2X2 className="h-5 w-5" />
            {title}
          </div>
        )
      ) : null}

      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          dashboardSidebarItemClass(isAll),
          !isDashboardVariant && "mb-1"
        )}
      >
        <span className={dashboardSidebarIconSlotClass()}>
          <HiSquares2X2 className="h-4 w-4 shrink-0" />
        </span>
        <span className="truncate">{allLabel}</span>
      </button>

      <div className={cn(isDashboardVariant ? "mt-5 flex-1" : "mt-4")}>
        {popularLabel ? (
          <p className={cn("mb-2", dashboardSidebarSectionLabelClass)}>
            {popularLabel}
          </p>
        ) : null}

        <div className="space-y-1.5">
          {categories.map((cat) => {
            const active = selected.includes(cat.value);

            return (
              <button
                type="button"
                key={cat.value}
                onClick={() => toggle(cat.value)}
                className={dashboardSidebarItemClass(active)}
              >
                <span className={dashboardSidebarIconSlotClass()}>
                  <span
                    className={dashboardSidebarCheckboxClass(
                      active ? "active" : "inactive"
                    )}
                  >
                    {active ? (
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    ) : null}
                  </span>
                </span>
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isAll ? (
        <div className={cn(isDashboardVariant ? "mt-3 flex justify-end" : null)}>
          <button
            type="button"
            onClick={toggleAll}
            className={cn(
              isDashboardVariant
                ? dashboardSidebarActionClass
                : "mt-3 ml-1 text-xs text-text-tertiary transition-colors hover:text-destructive"
            )}
          >
            {clearLabel}
          </button>
        </div>
      ) : null}

      {viewAllLabel ? (
        <button
          type="button"
          className="mt-3 ml-1 text-sm text-accent-foreground hover:underline"
        >
          {viewAllLabel}
        </button>
      ) : null}
    </div>
  );
}
