import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  ListFilter,
} from "lucide-react";

import { fetchProjectCalendar } from "@/services/projects/project";
import type {
  CalendarEvent,
  CalendarEventType,
} from "@/services/calendar/calendar.types";

const WEEK_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const EVENT_CFG: Record<
  CalendarEventType,
  { bg: string; dot: string; activeBg: string; groupBg: string }
> = {
  milestone: {
    bg: "bg-blue-50/90 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    activeBg: "bg-blue-600 text-white border-blue-600 shadow-[0_12px_24px_rgba(37,99,235,0.20)]",
    groupBg: "bg-blue-50/80 text-blue-700",
  },
  project_deadline: {
    bg: "bg-rose-50/90 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    activeBg: "bg-rose-600 text-white border-rose-600 shadow-[0_12px_24px_rgba(225,29,72,0.18)]",
    groupBg: "bg-rose-50/80 text-rose-700",
  },
  job_expires: {
    bg: "bg-amber-50/90 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    activeBg: "bg-amber-500 text-white border-amber-500 shadow-[0_12px_24px_rgba(245,158,11,0.18)]",
    groupBg: "bg-amber-50/80 text-amber-700",
  },
};

type FilterType = "all" | CalendarEventType;

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();

    fetchProjectCalendar(month, year)
      .then((res) => {
        if (!alive) return;
        setAllEvents(res.data.data || []);
      })
      .catch(() => {
        if (!alive) return;
        setError("calendarPage.errors.load");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [currentMonth]);

  const filteredEvents = useMemo(
    () =>
      activeFilter === "all"
        ? allEvents
        : allEvents.filter((event) => event.event_type === activeFilter),
    [allEvents, activeFilter]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      if (!event.event_date) continue;
      const key = event.event_date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [filteredEvents]);

  const monthGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [currentMonth]);

  const todayKey = toDateKey(new Date());
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedEvents = selectedKey ? (eventsByDate.get(selectedKey) ?? []) : [];

  const selectedByType = useMemo(() => {
    const groups: Partial<Record<CalendarEventType, CalendarEvent[]>> = {};
    for (const event of selectedEvents) {
      groups[event.event_type] = [...(groups[event.event_type] ?? []), event];
    }
    return groups;
  }, [selectedEvents]);

  const overdueCount = filteredEvents.filter((event) => event.is_overdue).length;
  const upcomingCount = filteredEvents.filter((event) => !event.is_overdue).length;
  const monthLabel = currentMonth.toLocaleDateString(i18n.language, {
    month: "long",
    year: "numeric",
  });

  const translateEventType = (type: CalendarEventType) =>
    t(`calendarPage.eventTypes.${type}`, {
      defaultValue: type.replace(/_/g, " "),
    });

  const translateEventStatus = (status?: string | null) => {
    if (!status) return null;
    return t(`project.status.${status}`, {
      defaultValue: status.replace(/_/g, " "),
    });
  };

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-4 pb-10 pt-8 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative flex flex-col gap-6">
          <div className="relative pb-1 pt-2">
            <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
              <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
              <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]">
                    {t("calendarPage.title")}
                  </h1>
                  <p className="mt-2 max-w-2xl text-base font-medium text-text-secondary">
                    {t("calendarPage.subtitle")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200/80 bg-white/90 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        (previous) =>
                          new Date(previous.getFullYear(), previous.getMonth() - 1, 1)
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label={t("calendarPage.actions.previousMonth")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                    <span>{monthLabel}</span>
                    {loading && (
                      <span className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        (previous) =>
                          new Date(previous.getFullYear(), previous.getMonth() + 1, 1)
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label={t("calendarPage.actions.nextMonth")}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date())}
                    className="h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    {t("calendarPage.actions.today")}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-blue-100/50 blur-2xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {t("calendarPage.summary.total")}
                      </p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-text-primary">
                        {filteredEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-rose-100/50 blur-2xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-rose-50 text-rose-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {t("calendarPage.summary.overdue")}
                      </p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-text-primary">
                        {overdueCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-emerald-100/50 blur-2xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-600">
                      <Clock3 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {t("calendarPage.summary.upcoming")}
                      </p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-text-primary">
                        {upcomingCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-blue-50 text-blue-600">
                    <ListFilter className="h-5 w-5" />
                  </span>
                  <div>
                    <p>{t("calendarPage.filters.title")}</p>
                    <p className="text-xs font-medium text-slate-500">
                      {t("calendarPage.filters.subtitle")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={[
                      "rounded-[14px] border px-4 py-2 text-sm font-semibold transition",
                      activeFilter === "all"
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {t("calendarPage.filters.all")}
                  </button>

                  {(Object.entries(EVENT_CFG) as [CalendarEventType, (typeof EVENT_CFG)[CalendarEventType]][]).map(
                    ([type, cfg]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActiveFilter(activeFilter === type ? "all" : type)}
                        className={[
                          "flex items-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-semibold transition",
                          activeFilter === type
                            ? cfg.activeBg
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            activeFilter === type ? "bg-white" : cfg.dot
                          }`}
                        />
                        {translateEventType(type)}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[24px] border border-rose-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-start gap-4 rounded-[18px] bg-rose-50 px-5 py-4 text-rose-700">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">{t("calendarPage.errors.title")}</p>
                  <p className="mt-1 text-sm text-rose-600">{t(error)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90">
                  {WEEK_DAY_KEYS.map((day) => (
                    <div
                      key={day}
                      className="px-1 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs"
                    >
                      {t(`calendarPage.weekdays.${day}`)}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {monthGrid.map((date) => {
                    const key = toDateKey(date);
                    const inMonth = date.getMonth() === currentMonth.getMonth();
                    const isToday = key === todayKey;
                    const isSelected = selectedDate ? key === toDateKey(selectedDate) : false;
                    const dayEvents = eventsByDate.get(key) ?? [];
                    const showItems = dayEvents.slice(0, 3);
                    const moreCount = dayEvents.length - showItems.length;
                    const hasOverdue = dayEvents.some((event) => event.is_overdue);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={[
                          "min-h-[96px] min-w-0 border-b border-r border-slate-200/70 p-2 text-left transition sm:min-h-[118px] sm:p-2.5",
                          inMonth ? "bg-white hover:bg-slate-50/80" : "bg-slate-50/70",
                          isSelected ? "relative z-[1] ring-2 ring-inset ring-blue-300" : "",
                        ].join(" ")}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={[
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm",
                              isToday
                                ? "bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]"
                                : inMonth
                                  ? "text-text-primary"
                                  : "text-slate-400",
                            ].join(" ")}
                          >
                            {date.getDate()}
                          </span>
                          {hasOverdue && !isToday && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                          )}
                        </div>

                        <div className="space-y-1">
                          {showItems.map((event, index) => {
                            const cfg = EVENT_CFG[event.event_type] ?? EVENT_CFG.milestone;
                            return (
                              <div
                                key={`${key}-${index}`}
                                className={`truncate rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight sm:text-[11px] ${cfg.bg} ${
                                  event.is_overdue ? "opacity-70" : ""
                                }`}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            );
                          })}

                          {moreCount > 0 && (
                            <div className="truncate pl-0.5 text-[10px] font-medium text-slate-400">
                              {t("calendarPage.grid.moreCount", { count: moreCount })}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-5 py-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {selectedDate
                      ? selectedDate.toLocaleDateString(i18n.language, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                      : t("calendarPage.sidebar.selectDate")}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {t("calendarPage.sidebar.eventsCount", {
                      count: selectedEvents.length,
                    })}
                  </p>
                </div>

                {selectedEvents.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-text-primary">
                      {t("calendarPage.sidebar.emptyTitle")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("calendarPage.sidebar.emptySubtitle")}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[640px] overflow-y-auto">
                    {(Object.entries(selectedByType) as [CalendarEventType, CalendarEvent[]][]).map(
                      ([type, events]) => {
                        const cfg = EVENT_CFG[type] ?? EVENT_CFG.milestone;

                        return (
                          <div key={type}>
                            <div
                              className={`flex items-center gap-2 border-b border-slate-200/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${cfg.groupBg}`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                              <span>{translateEventType(type)}</span>
                              <span className="ml-auto text-[10px] font-bold">{events.length}</span>
                            </div>

                            {events.map((event, index) => {
                              const statusLabel = translateEventStatus(event.status);

                              const handleClick = () => {
                                if (event.project_id) {
                                  navigate(`/app/projects/${event.project_id}/workspace`);
                                  return;
                                }

                                if (event.job_id) {
                                  navigate(`/app/jobs/${event.job_id}`);
                                }
                              };

                              return (
                                <button
                                  key={`${type}-${index}`}
                                  type="button"
                                  onClick={handleClick}
                                  className="flex w-full items-start gap-3 border-b border-slate-200/60 px-5 py-4 text-left transition hover:bg-slate-50/80 last:border-b-0"
                                >
                                  <span
                                    className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot} ${
                                      event.is_overdue ? "opacity-60" : ""
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`truncate text-sm font-semibold ${
                                        event.is_overdue ? "text-rose-600" : "text-text-primary"
                                      }`}
                                    >
                                      {event.title}
                                    </p>

                                    {event.project_title && event.event_type === "milestone" && (
                                      <p className="mt-1 truncate text-xs text-slate-500">
                                        {event.project_title}
                                      </p>
                                    )}

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      {event.is_overdue && (
                                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600">
                                          {t("calendarPage.labels.overdue")}
                                        </span>
                                      )}

                                      {statusLabel && (
                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold capitalize text-slate-600">
                                          {statusLabel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
