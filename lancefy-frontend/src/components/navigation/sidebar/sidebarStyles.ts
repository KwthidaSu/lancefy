import { cn } from "@/utils/cn";

export const dashboardSidebarShellClass =
  "relative h-full w-72 shrink-0 border-r border-border bg-surface";

export const dashboardSidebarPanelClass = "flex h-full flex-col";

export const dashboardSidebarTopClass = "px-4 pt-4";

export const dashboardSidebarScrollableClass =
  "flex-1 overflow-y-auto p-4 pt-3.5";

export const dashboardSidebarSectionLabelClass =
  "px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-tertiary";

export const dashboardSidebarActionClass =
  "inline-flex h-8 items-center justify-center rounded-[10px] border border-border bg-card px-3 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:bg-accent hover:text-text-primary";

export const dashboardSidebarSearchInputClass =
  "w-full rounded-[10px] border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-foreground shadow-sm transition-colors placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20";

export function dashboardSidebarItemClass(active: boolean, className?: string) {
  return cn(
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
    active
      ? "bg-accent font-semibold text-accent-foreground"
      : "text-text-secondary hover:bg-accent/50 hover:text-text-primary",
    className
  );
}

export function dashboardSidebarIconSlotClass(className?: string) {
  return cn(
    "flex h-5 w-5 shrink-0 items-center justify-center text-current",
    className
  );
}

export function dashboardSidebarCheckboxClass(
  state: "inactive" | "active" | "partial",
  size: "sm" | "md" = "md"
) {
  return cn(
    "flex shrink-0 items-center justify-center rounded border transition-colors",
    size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]",
    state === "active" && "border-primary bg-primary text-white",
    state === "partial" && "border-primary bg-card text-primary",
    state === "inactive" && "border-border bg-card text-transparent"
  );
}

export function dashboardSidebarExpandButtonClass(active: boolean) {
  return cn(
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
    active
      ? "text-accent-foreground hover:bg-accent/70"
      : "text-text-tertiary hover:bg-accent/50 hover:text-text-primary"
  );
}
