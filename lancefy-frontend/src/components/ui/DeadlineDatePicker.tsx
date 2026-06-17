import { format } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";
import { cn } from "@/utils/cn";

type Props = {
  value?: string;
  onChange: (date?: string) => void;
  error?: string;
};

export default function DeadlineDatePicker({
  value,
  onChange,
  error,
}: Props) {
  const { i18n, t } = useTranslation();

  const selectedDate = value ? new Date(value) : undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const localeMap = {
    en: enUS,
    th: th,
  };

  const locale =
    localeMap[i18n.language as "en" | "th"] ?? enUS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-full items-center justify-between px-4 py-3 text-sm",
            "rounded-[var(--radius)]",
            "bg-[rgb(var(--input))] text-foreground",
            "border border-border",
            "focus:outline-none focus:border-primary",
            "focus:ring-2 focus:ring-primary/20",
            "transition-colors transition-shadow duration-150 ease-out",
            "hover:bg-[rgb(var(--input))]",
            error &&
              "border-[rgb(var(--danger))] focus:border-[rgb(var(--danger))] focus:ring-[rgb(var(--danger))]/30"
          )}
        >
          <span
            className={cn(
              selectedDate
                ? "text-foreground"
                : "text-text-muted"
            )}
          >
            {selectedDate
              ? format(selectedDate, "d MMM yyyy", {
                  locale,
                })
              : t(
                  "project.createPage.form.deadlineDatePlaceholder"
                )}
          </span>

          <CalendarIcon className="h-4 w-4 text-text-muted" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          locale={locale}
          disabled={{ before: today }} 
          onSelect={(date: Date | undefined) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
          }}
        />
      </PopoverContent>

      {error && (
        <p className="mt-1 text-sm text-[rgb(var(--danger))]">
          {error}
        </p>
      )}
    </Popover>
  );
}
