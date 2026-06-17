import { clsx } from "clsx";

import type {
  RoomTabItem,
  RoomTabKey,
} from "../messages-page.types";

type RoomTabsProps = {
  roomTab: RoomTabKey;
  roomTabs: readonly RoomTabItem[];
  roomTabCounts: Record<RoomTabKey, number>;
  onTabChange: (tab: RoomTabKey) => void;
};

export function RoomTabs({
  roomTab,
  roomTabs,
  roomTabCounts,
  onTabChange,
}: RoomTabsProps) {
  return (
    <div className="mb-4 rounded-[22px] border border-border bg-background/95 p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-nowrap items-stretch gap-1.5 overflow-hidden">
        {roomTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={clsx(
              "flex min-h-[46px] min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-[16px] px-2 py-1.5 text-[12px] font-semibold leading-none whitespace-nowrap transition-colors duration-200 sm:gap-2 sm:px-2.5",
              roomTab === key
                ? "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
                : "bg-transparent text-text-secondary hover:bg-accent/70 hover:text-text-primary",
            )}
          >
            <span
              className={clsx(
                "shrink-0",
                roomTab === key
                  ? "text-primary-foreground"
                  : "text-text-muted",
              )}
            >
              {icon}
            </span>
            <span className="shrink-0 whitespace-nowrap">{label}</span>
            <span
              className={clsx(
                "inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                roomTab === key
                  ? "bg-white/20 text-white"
                  : "bg-accent text-text-secondary",
              )}
            >
              {roomTabCounts[key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
