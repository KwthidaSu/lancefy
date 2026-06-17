import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import Button from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export type CalendarProps = React.ComponentProps<
  typeof DayPicker
>;

export function Calendar({
  className,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-xl bg-white p-3 shadow-lg text-sm",
        "[&_.rdp-button]:focus:outline-none",
        "[&_.rdp-button]:focus-visible:outline-none",
        "[&_.rdp-button]:focus-visible:ring-0",
        "[&_.rdp-button]:focus-visible:ring-offset-0",
        className
      )}
      classNames={{
        months: "flex flex-col gap-2",
        month: "space-y-2",
        caption:
          "flex items-center justify-between px-1",
        caption_label:
          "text-sm font-semibold text-text-primary",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "w-9 text-xs font-medium text-text-muted",
        row: "flex mt-1",
        cell: "relative w-9 h-9",
        day: cn(
          "w-9 h-9 rounded-full text-sm",
          "hover:bg-primary/10",
          "transition-colors",
          "focus:outline-none",
          "[&>button]:focus:outline-none",
          "[&>button]:focus-visible:ring-0"
        ),
        day_today:
          "bg-primary/10 text-primary font-semibold rounded-full",
        day_selected:
          "bg-primary text-primary-foreground rounded-full hover:bg-primary/90",
        day_outside:
          "text-text-muted opacity-40",
        day_disabled:
          "text-text-muted opacity-30 line-through",
      }}
      components={{
        PreviousMonthButton: (buttonProps) => (
          <Button
            {...buttonProps}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        ),
        NextMonthButton: (buttonProps) => (
          <Button
            {...buttonProps}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ),
      }}
      {...props}
    />
  );
}
