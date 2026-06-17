import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineFunnel,
} from "react-icons/hi2";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/context/NotificationContext";
import {
  notificationService,
  type AppNotification,
  type NotificationListFilters,
  NotificationType,
  TYPE_LABELS,
  TYPE_COLORS,
} from "@/services/notification.service";

// ── helpers ────────────────────────────────────────────────────────────────

function dot(type: string) {
  return `w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${TYPE_COLORS[type] ?? "bg-gray-400"}`;
}

function resolveLink(n: AppNotification): string | null {
  if (n.reference_type === "project" && n.reference_id)
    return `/app/projects/${n.reference_id}/manage`;
  if (n.reference_type === "proposal" && n.reference_id)
    return `/app/proposals/${n.reference_id}`;
  if (n.reference_type === "job" && n.reference_id)
    return `/app/jobs/${n.reference_id}`;
  if (n.reference_type === "dispute" && n.reference_id)
    return `/app/disputes/${n.reference_id}`;
  if (n.reference_type === "message" && n.reference_id)
    return `/app/messages?roomId=${n.reference_id}`;
  if (n.reference_type === "kyc")
    return `/app/kyc`;
  return null;
}

const ALL_TYPES = Object.values(NotificationType) as string[];

const PAGE_SIZE = 30;

// ── component ──────────────────────────────────────────────────────────────

type ReadFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { markAsRead, markAllAsRead: contextMarkAllAsRead, refresh: refreshContext } = useNotifications();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [total, setTotal]                 = useState(0);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);

  // filters
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom]     = useState<string>("");
  const [dateTo, setDateTo]         = useState<string>("");

  const hasActiveFilter = readFilter !== "all" || !!typeFilter || !!dateFrom || !!dateTo;

  const buildFilters = useCallback((): NotificationListFilters => {
    const f: NotificationListFilters = {};
    if (readFilter !== "all") f.readFilter = readFilter;
    if (typeFilter)           f.typeFilter = typeFilter;
    if (dateFrom)             f.dateFrom   = dateFrom;
    if (dateTo)               f.dateTo     = dateTo;
    return f;
  }, [readFilter, typeFilter, dateFrom, dateTo]);

  const fetchPage = useCallback(
    async (p: number, reset = false, filters?: NotificationListFilters) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await notificationService.list(p, PAGE_SIZE, filters ?? buildFilters());
        setNotifications(prev => (reset ? data.data : [...prev, ...data.data]));
        setTotal(data.total);
        setUnreadCount(data.unread_count);
        setPage(p);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildFilters],
  );

  // initial load
  useEffect(() => { fetchPage(1, true); }, [fetchPage]);

  // re-fetch when filters change
  useEffect(() => {
    fetchPage(1, true, buildFilters());
  }, [readFilter, typeFilter, dateFrom, dateTo]);

  // ── actions ──────────────────────────────────────────────────────────────

  const handleClick = async (n: AppNotification) => {
    if (!n.is_read) {
      await markAsRead(n.id);
      setNotifications(prev =>
        prev.map(x => x.id === n.id ? { ...x, is_read: true } : x),
      );
      setUnreadCount(c => Math.max(0, c - 1));
    }
    const link = resolveLink(n);
    if (link) navigate(link);
  };

  const handleMarkAllAsRead = async () => {
    await contextMarkAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    setTotal(t => Math.max(0, t - 1));
    await notificationService.deleteOne(id);
    refreshContext();
  };

  const handleDeleteRead = async () => {
    if (!confirm(t("notifications.confirmDeleteRead"))) return;
    await notificationService.deleteAll(true);
    fetchPage(1, true);
    refreshContext();
  };

  const clearFilters = () => {
    setReadFilter("all");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasMore = notifications.length < total;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("notifications.title")}</h1>
          <p className="text-sm text-text-muted">
            {t("notifications.count", { total })}{unreadCount > 0 && ` · ${t("notifications.unread", { count: unreadCount })}`}
          </p>
        </div>

        {/* bulk actions */}
        <div className="flex gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-sm text-primary border border-border rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors"
            >
              <HiOutlineCheckCircle className="w-4 h-4" />
              {t("notifications.markAll")}
            </button>
          )}
          <button
            onClick={handleDeleteRead}
            className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" />
            {t("notifications.deleteRead")}
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
        {/* read status */}
        <div className="flex items-center gap-2 flex-wrap">
          <HiOutlineFunnel className="w-4 h-4 text-text-muted flex-shrink-0" />
          {(["all", "unread", "read"] as ReadFilter[]).map(v => (
            <button
              key={v}
              onClick={() => setReadFilter(v)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                readFilter === v
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v === "all" ? t("notifications.filterAll") : v === "unread" ? t("notifications.filterUnread") : t("notifications.filterRead")}
            </button>
          ))}
        </div>

        {/* type + month */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">{t("notifications.allTypes")}</option>
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>

          {/* date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-text-muted text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <HiOutlineXMark className="w-4 h-4" />
              {t("notifications.clearFilters")}
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <HiOutlineBell className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">{t("notifications.noResults")}</p>
          {hasActiveFilter && (
            <button onClick={clearFilters} className="text-sm text-blue-500 hover:underline">
              {t("notifications.clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-accent/5 ${
                  !n.is_read ? "bg-blue-50/50" : ""
                }`}
              >
                <div className={dot(n.type)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700`}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm leading-snug mt-1 ${
                    !n.is_read ? "font-semibold text-text-primary" : "text-text-secondary"
                  }`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[11px] text-text-subtle mt-1">
                    {new Date(n.created_at).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <button
                  onClick={e => handleDeleteOne(e, n.id)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => fetchPage(page + 1)}
                disabled={loadingMore}
                className="px-6 py-2 text-sm text-primary-foreground border border-border rounded-lg hover:bg-accent/10 disabled:opacity-50 transition-colors"
              >
                {loadingMore
                  ? t("notifications.loading")
                  : t("notifications.loadMore", { count: total - notifications.length })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
