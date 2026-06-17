import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import {
  fetchAdminKycList,
  fetchKycDetail,
  reviewKyc,
  type AdminKycDetail,
  type AdminKycItem,
} from "@/services/kyc/adminKyc";
import StatusDropdown from "@/components/projects/StatusDropdown";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

type KycItemWithOptionalFields = AdminKycItem & {
  email?: string;
  country?: string;
  avatar_url?: string;
  kyc_code?: string;
  documents?: Array<{
    id?: string | number;
    name?: string;
    label?: string;
    file_url?: string;
    image_url?: string;
    status?: string;
  }>;
  timeline?: Array<{
    id?: string | number;
    title?: string;
    description?: string;
    actor?: string;
    created_at?: string;
  }>;
};

type SidebarDocument = {
  id: string | number;
  name?: string;
  label?: string;
  file_url?: string;
  image_url?: string | null;
  status?: string;
};

type TimelineItem = {
  id: string;
  title: string;
  description?: string;
  actor?: string;
  created_at?: string;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

type KycStatusFilter =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_RESUBMISSION";

type StatusFilterOption = {
  value: KycStatusFilter;
  label: string;
};

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

const MINIO_PUBLIC_BASE =
  (import.meta.env.VITE_MINIO_PUBLIC_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "";

const PAGE_TYPE = {
  pageTitle:
    "text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle: "text-lg font-semibold tracking-tight text-text-primary",
  cardTitle: "text-[1.02rem] font-semibold leading-6 text-text-primary",
  body: "text-[0.95rem] leading-7 text-text-secondary",
  meta: "text-[0.82rem] font-medium leading-5 text-text-muted",
  micro:
    "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-text-muted",
};

const quickCardClass =
  "relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

const inputClass =
  "h-12 w-full rounded-[16px] border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:ring-4 focus:ring-blue-100";

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: string | undefined, t: Translate) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin < 1) return t("adminKyc.list.time.justNow");
  if (diffMin < 60) {
    return t("adminKyc.list.time.minutesAgo", { count: diffMin });
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return t("adminKyc.list.time.hoursAgo", { count: diffHour });
  }

  const diffDay = Math.floor(diffHour / 24);
  return t("adminKyc.list.time.daysAgo", { count: diffDay });
}

function resolveImageUrl(url?: string | null) {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    if (
      trimmed.startsWith("http://backend-storage:9000") &&
      MINIO_PUBLIC_BASE
    ) {
      return trimmed.replace("http://backend-storage:9000", MINIO_PUBLIC_BASE);
    }

    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    if (!API_BASE_URL) return trimmed;
    return `${API_BASE_URL}${trimmed}`;
  }

  if (!API_BASE_URL) return trimmed;
  return `${API_BASE_URL}/${trimmed}`;
}

function getTimelineTitle(eventType: string, t: Translate) {
  switch (eventType) {
    case "submitted":
      return t("adminKyc.list.timeline.submitted");
    case "id_card_uploaded":
      return t("adminKyc.list.timeline.idCard");
    case "selfie_uploaded":
      return t("adminKyc.list.timeline.selfie");
    case "documents_completed":
      return t("adminKyc.list.timeline.complete");
    case "approved":
      return t("adminKyc.list.timeline.approved");
    case "rejected":
      return t("adminKyc.list.timeline.rejected");
    case "needs_resubmission":
      return t("adminKyc.list.status.needsResubmission");
    default:
      return t("adminKyc.list.timeline.updateItem");
  }
}

function getTimelineDescription(
  eventType: string,
  note: string | null | undefined,
  t: Translate,
) {
  if (note) return note;

  switch (eventType) {
    case "documents_completed":
      return t("adminKyc.detail.review.documentsComplete");
    case "approved":
      return t("adminKyc.detail.status.approved");
    case "rejected":
      return t("adminKyc.detail.status.rejected");
    case "needs_resubmission":
      return t("adminKyc.detail.status.needsResubmission");
    default:
      return undefined;
  }
}

function buildTimeline(
  selectedItem: KycItemWithOptionalFields | null,
  selectedDetail: AdminKycDetail | null,
  t: Translate,
) {
  if (selectedDetail?.timeline?.length) {
    return selectedDetail.timeline.map((entry, index) => ({
      id: String(entry.id ?? index),
      title: getTimelineTitle(entry.event_type, t),
      description: getTimelineDescription(entry.event_type, entry.note, t),
      actor:
        entry.actor_name ||
        (entry.actor_type === "admin"
          ? t("adminKyc.list.timeline.actors.admin")
          : entry.actor_type === "system"
            ? t("adminKyc.list.timeline.actors.system")
            : t("adminKyc.list.timeline.actors.user")),
      created_at: entry.created_at,
    }));
  }

  if (selectedDetail) {
    const items: TimelineItem[] = [];

    if (selectedDetail.submitted_at) {
      items.push({
        id: "submitted",
        title: t("adminKyc.list.timeline.submitted"),
        actor: t("adminKyc.list.timeline.actors.user"),
        created_at: selectedDetail.submitted_at,
      });
    }

    if (selectedDetail.id_card?.created_at) {
      items.push({
        id: "id-card",
        title: t("adminKyc.list.timeline.idCard"),
        actor: t("adminKyc.list.timeline.actors.user"),
        created_at: selectedDetail.id_card.created_at,
      });
    }

    if (selectedDetail.selfie?.created_at) {
      items.push({
        id: "selfie",
        title: t("adminKyc.list.timeline.selfie"),
        actor: t("adminKyc.list.timeline.actors.user"),
        created_at: selectedDetail.selfie.created_at,
      });
    }

    if (selectedDetail.id_card && selectedDetail.selfie) {
      items.push({
        id: "complete",
        title: t("adminKyc.list.timeline.complete"),
        actor: t("adminKyc.list.timeline.actors.system"),
        created_at:
          selectedDetail.selfie.created_at ||
          selectedDetail.id_card.created_at ||
          selectedDetail.submitted_at ||
          undefined,
      });
    }

    if (selectedDetail.reviewed_at) {
      items.push({
        id: "reviewed",
        title:
          selectedDetail.status === "APPROVED"
            ? t("adminKyc.list.timeline.approved")
            : selectedDetail.status === "REJECTED"
              ? t("adminKyc.list.timeline.rejected")
              : t("adminKyc.list.timeline.reviewed"),
        description: selectedDetail.reason || undefined,
        actor: t("adminKyc.list.timeline.actors.admin"),
        created_at: selectedDetail.reviewed_at,
      });
    }

    return items;
  }

  return (selectedItem?.timeline ?? []).map((entry, index) => ({
    id: String(entry.id ?? index),
    title: entry.title || t("adminKyc.list.timeline.updateItem"),
    description: entry.description,
    actor: entry.actor || t("adminKyc.list.timeline.actors.user"),
    created_at: entry.created_at,
  }));
}

function statusTone(status: string) {
  if (status === "APPROVED") {
    return {
      card: "border-lime-200 bg-lime-50",
      text: "text-lime-700",
      icon: CheckCircle2,
    };
  }

  if (status === "REJECTED") {
    return {
      card: "border-rose-200 bg-rose-50",
      text: "text-rose-700",
      icon: XCircle,
    };
  }

  if (status === "NEEDS_RESUBMISSION") {
    return {
      card: "border-amber-200 bg-amber-50",
      text: "text-amber-700",
      icon: Clock3,
    };
  }

  return {
    card: "border-blue-200 bg-blue-50",
    text: "text-blue-700",
    icon: Clock3,
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 text-sm">
      <span className="font-medium text-text-muted">{label}</span>
      <span className="truncate text-right font-semibold text-text-primary">
        {value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: number;
  icon: typeof ShieldCheck;
  sub?: string;
}) {
  return (
    <div className={cn(quickCardClass, "px-6 py-6")}>
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
          <Icon className="h-7 w-7" />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-text-primary">
            {value.toLocaleString()}
          </p>
          {sub ? <p className="mt-3 text-sm text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewList({
  documents,
  t,
}: {
  documents: SidebarDocument[];
  t: Translate;
}) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-text-muted">
        {t("adminKyc.list.documents.empty")}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {documents.map((doc, index) => {
        const imageSrc = doc.image_url || doc.file_url;

        return (
          <a
            key={doc.id ?? index}
            href={imageSrc || "#"}
            target={imageSrc ? "_blank" : undefined}
            rel={imageSrc ? "noreferrer" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition",
              imageSrc
                ? "hover:border-blue-200 hover:bg-blue-50/30"
                : "cursor-default",
            )}
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={doc.label || doc.name || t("adminKyc.list.documents.alt")}
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-text-muted">
                  {t("adminKyc.list.documents.noImage")}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">
                {doc.label ||
                  doc.name ||
                  t("adminKyc.list.documents.documentNumber", {
                    number: index + 1,
                  })}
              </p>

              <span className="mt-1 inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                {doc.status || t("adminKyc.list.documents.received")}
              </span>
            </div>

            {imageSrc ? (
              <ExternalLink className="h-4 w-4 shrink-0 text-text-muted transition group-hover:text-blue-600" />
            ) : null}
          </a>
        );
      })}
    </div>
  );
}

export default function KycReviewPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");

  const [items, setItems] = useState<KycItemWithOptionalFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [detailByUserId, setDetailByUserId] = useState<
    Record<string, AdminKycDetail>
  >({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [submittingAction, setSubmittingAction] = useState<
    "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION" | null
  >(null);

  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  const statusOptions = useMemo<StatusFilterOption[]>(
    () => [
      { value: "PENDING", label: t("adminKyc.list.status.pending") },
      { value: "APPROVED", label: t("adminKyc.list.status.approved") },
      { value: "REJECTED", label: t("adminKyc.list.status.rejected") },
      {
        value: "NEEDS_RESUBMISSION",
        label: t("adminKyc.list.status.needsResubmission"),
      },
    ],
    [t],
  );

  const loadItems = async () => {
    try {
      const res = await fetchAdminKycList();
      setItems((res.data || []) as KycItemWithOptionalFields[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter.length === 0
          ? true
          : statusFilter.includes(item.status as KycStatusFilter);

      if (!matchesStatus) return false;
      if (!keyword) return true;

      const fullName = item.full_name?.toLowerCase() || "";
      const email = item.email?.toLowerCase() || "";
      const citizenId = item.citizen_id?.toLowerCase() || "";
      const kycCode = item.kyc_code?.toLowerCase() || "";

      return (
        fullName.includes(keyword) ||
        email.includes(keyword) ||
        citizenId.includes(keyword) ||
        kycCode.includes(keyword)
      );
    });
  }, [items, search, statusFilter]);

  const selectedItem =
    filteredItems.find((item) => item.user_id === selectedId) ??
    items.find((item) => item.user_id === selectedId) ??
    null;

  const selectedDetail = selectedId ? detailByUserId[String(selectedId)] : null;

  useEffect(() => {
    if (!selectedId) {
      setDetailLoading(false);
      setDetailError("");
      return;
    }

    if (selectedDetail) {
      setDetailLoading(false);
      setDetailError("");
      return;
    }

    let cancelled = false;

    setDetailLoading(true);
    setDetailError("");

    fetchKycDetail(String(selectedId))
      .then((res) => {
        if (cancelled) return;

        setDetailByUserId((prev) => ({
          ...prev,
          [String(selectedId)]: res.data,
        }));
      })
      .catch((error) => {
        if (cancelled) return;

        setDetailError(
          error?.response?.data?.detail ||
            t("adminKyc.detail.errors.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDetail, selectedId, t]);

  useEffect(() => {
    setRejectReason("");
  }, [selectedId]);

  const selectedDocuments = useMemo<SidebarDocument[]>(() => {
    if (selectedDetail) {
      const idCardUrl = resolveImageUrl(selectedDetail.id_card?.url ?? null);
      const selfieUrl = resolveImageUrl(selectedDetail.selfie?.url ?? null);

      return [
        {
          id: "id-card",
          label: t("adminKyc.detail.documents.idCard"),
          status: selectedDetail.id_card
            ? t("adminKyc.list.documents.received")
            : t("adminKyc.list.documents.notReceived"),
          file_url: idCardUrl ?? undefined,
          image_url: idCardUrl,
        },
        {
          id: "selfie",
          label: t("adminKyc.detail.documents.selfie"),
          status: selectedDetail.selfie
            ? t("adminKyc.list.documents.received")
            : t("adminKyc.list.documents.notReceived"),
          file_url: selfieUrl ?? undefined,
          image_url: selfieUrl,
        },
      ];
    }

    return (selectedItem?.documents ?? []).map((doc, index) => {
      const resolvedUrl = resolveImageUrl(doc.image_url || doc.file_url || null);

      return {
        ...doc,
        id: doc.id ?? index,
        file_url: resolvedUrl ?? doc.file_url,
        image_url: resolvedUrl,
      };
    });
  }, [selectedDetail, selectedItem?.documents, t]);

  const timelineItems = useMemo(
    () => buildTimeline(selectedItem, selectedDetail, t),
    [selectedDetail, selectedItem, t],
  );

  const currentStatus = selectedDetail?.status ?? selectedItem?.status ?? "PENDING";
  const reviewLocked = currentStatus !== "PENDING";
  const reviewNote = selectedDetail?.reason || null;
  const reviewedAt = selectedDetail?.reviewed_at;
  const isSubmitting = submittingAction !== null;

  const stats = useMemo(() => {
    const pending = items.filter((item) => item.status === "PENDING").length;
    const approved = items.filter((item) => item.status === "APPROVED").length;
    const total = items.length;

    return { pending, approved, total };
  }, [items]);

  const refreshSelectedDetail = async (userId: string | number) => {
    const res = await fetchKycDetail(String(userId));
    setDetailByUserId((prev) => ({
      ...prev,
      [String(userId)]: res.data,
    }));
  };

  const handleReview = async (
    nextStatus: "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION",
  ) => {
    if (!selectedItem || isSubmitting) return;

    const reason =
      nextStatus === "APPROVED"
        ? undefined
        : rejectReason.trim() ||
          t("adminKyc.detail.review.defaultRejectReason");

    try {
      setSubmittingAction(nextStatus);
      setDetailError("");

      await reviewKyc(String(selectedItem.user_id), {
        status: nextStatus,
        reason,
      });

      await Promise.all([
        loadItems(),
        refreshSelectedDetail(selectedItem.user_id),
      ]);

      setRejectReason("");
    } catch (error: any) {
      setDetailError(
        error?.response?.data?.detail ||
          (nextStatus === "APPROVED"
            ? t("adminKyc.detail.errors.approveFailed")
            : t("adminKyc.detail.errors.rejectFailed")),
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const selectedStatusTone = statusTone(currentStatus);
  const SelectedStatusIcon = selectedStatusTone.icon;

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative flex min-h-0 flex-col gap-7 xl:h-[calc(100vh-8.5rem)]">
          <div className="shrink-0">
            <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
              <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
              <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
                  Admin Console
                </div>

                <h1 className={PAGE_TYPE.pageTitle}>
                  {t("adminKyc.list.page.title")}
                </h1>

                <p className={cn("mt-2 max-w-3xl", PAGE_TYPE.pageSubtitle)}>
                  {t("adminKyc.list.page.subtitle")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadItems()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
              >
                <FileCheck2 className="h-4 w-4" />
                KYC Queue
              </button>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <StatCard
              label={t("adminKyc.list.status.pending")}
              value={loading ? 0 : stats.pending}
              icon={Clock3}
              sub={t("adminKyc.list.page.subtitle")}
            />
            <StatCard
              label={t("adminKyc.list.status.approved")}
              value={loading ? 0 : stats.approved}
              icon={UserCheck}
              sub={t("adminKyc.detail.status.approved")}
            />
            <StatCard
              label={t("adminKyc.list.table.user")}
              value={loading ? 0 : stats.total}
              icon={ShieldCheck}
              sub={`${filteredItems.length.toLocaleString()} visible`}
            />
          </section>

          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="min-h-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-100 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <label className="relative block flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("adminKyc.list.searchPlaceholder")}
                      className={cn(inputClass, "pl-12 pr-5")}
                    />
                  </label>

                  <StatusDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    allLabel={t("adminKyc.list.filters.allStatuses")}
                    labelPrefix={t("adminKyc.list.table.status")}
                    selectedLabel={t("adminKyc.list.filters.selected")}
                    clearLabel={t("adminKyc.list.filters.clear")}
                    className="min-w-[220px]"
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 animate-pulse rounded-[18px] bg-slate-100"
                    />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
                    <ShieldCheck className="h-8 w-8 text-blue-400" />
                  </div>

                  <p className={PAGE_TYPE.cardTitle}>{t("adminKyc.list.empty")}</p>
                  <p className={cn("mt-2", PAGE_TYPE.body)}>
                    Try changing the search keyword or status filter.
                  </p>
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-slate-100">
                        <th className="px-7 py-5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {t("adminKyc.list.table.user")}
                        </th>
                        <th className="px-7 py-5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {t("adminKyc.list.table.status")}
                        </th>
                        <th className="px-7 py-5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {t("adminKyc.list.table.submitted")}
                        </th>
                        <th className="px-7 py-5 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {t("adminKyc.list.table.actions")}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredItems.map((item) => {
                        const isSelected = selectedId === item.user_id;

                        return (
                          <tr
                            key={item.user_id}
                            onClick={() => setSelectedId(item.user_id)}
                            className={cn(
                              "cursor-pointer border-t border-slate-100 transition",
                              isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/70",
                            )}
                          >
                            <td className="px-7 py-5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-blue-50 text-blue-700",
                                  )}
                                >
                                  {item.full_name?.charAt(0) || "U"}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-text-primary">
                                    {item.full_name}
                                  </p>
                                  <p className="truncate text-text-muted">
                                    {item.email || item.citizen_id || "-"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-7 py-5">
                              <StatusBadge status={item.status} />
                            </td>

                            <td className="px-7 py-5 font-medium text-text-muted">
                              {formatRelativeTime(item.created_at, t)}
                            </td>

                            <td className="px-7 py-5 text-right">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(item.user_id);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-100 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4" />
                                {t("adminKyc.list.actions.view")}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              {selectedItem ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="shrink-0 border-b border-slate-100 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {selectedItem.full_name?.charAt(0) || "U"}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold text-text-primary">
                            {selectedItem.full_name}
                          </h2>
                          <p className="mt-1 truncate text-sm font-medium text-text-muted">
                            {selectedDetail?.email || selectedItem.email || selectedItem.citizen_id || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/kyc/${selectedItem.user_id}`)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-slate-100 hover:text-text-primary"
                          aria-label={t("adminKyc.list.actions.openDetail")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-slate-100 hover:text-text-primary"
                          aria-label={t("adminKyc.list.actions.close")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-3",
                        selectedStatusTone.card,
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm font-semibold",
                          selectedStatusTone.text,
                        )}
                      >
                        <SelectedStatusIcon className="h-4 w-4" />
                        {currentStatus === "APPROVED"
                          ? t("adminKyc.list.status.approved")
                          : currentStatus === "REJECTED"
                            ? t("adminKyc.list.status.rejected")
                            : currentStatus === "NEEDS_RESUBMISSION"
                              ? t("adminKyc.list.status.needsResubmission")
                              : t("adminKyc.list.status.pending")}
                      </div>
                    </div>

                    <section className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                      <h3 className={PAGE_TYPE.sectionTitle}>
                        {t("adminKyc.list.sections.personalInfo")}
                      </h3>

                      <div className="space-y-4">
                        <DetailRow
                          label={t("adminKyc.detail.fields.fullName")}
                          value={selectedItem.full_name || "-"}
                        />
                        <DetailRow
                          label={t("adminKyc.list.fields.email")}
                          value={selectedDetail?.email || selectedItem.email || "-"}
                        />
                        <DetailRow
                          label={t("adminKyc.detail.fields.citizenId")}
                          value={selectedItem.citizen_id || "-"}
                        />
                        <DetailRow
                          label={t("adminKyc.detail.fields.country")}
                          value={
                            selectedDetail?.profile.country ||
                            selectedItem.country ||
                            t("adminKyc.list.defaults.country")
                          }
                        />
                        <DetailRow
                          label={t("adminKyc.detail.fields.submittedAt")}
                          value={formatRelativeTime(
                            selectedDetail?.submitted_at || selectedItem.created_at,
                            t,
                          )}
                        />
                      </div>
                    </section>

                    <section className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                      <h3 className={PAGE_TYPE.sectionTitle}>
                        {t("adminKyc.detail.documents.title")}
                      </h3>

                      {detailError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                          {detailError}
                        </div>
                      ) : null}

                      {detailLoading && selectedDocuments.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-text-muted">
                          {t("adminKyc.list.documents.loading")}
                        </div>
                      ) : (
                        <DocumentPreviewList documents={selectedDocuments} t={t} />
                      )}
                    </section>

                    <section className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                      <h3 className={PAGE_TYPE.sectionTitle}>
                        {t("adminKyc.list.sections.timeline")}
                      </h3>

                      <div className="space-y-4">
                        {timelineItems.length > 0 ? (
                          timelineItems.map((entry, index) => (
                            <div key={entry.id} className="flex gap-3">
                              <div className="flex w-4 shrink-0 justify-center">
                                <div className="flex flex-col items-center">
                                  <Circle className="h-3 w-3 fill-current text-blue-200" />
                                  {index < timelineItems.length - 1 ? (
                                    <div className="mt-1 h-10 w-px bg-slate-200" />
                                  ) : null}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary">
                                  {entry.title}
                                </p>

                                {entry.description ? (
                                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                                    {entry.description}
                                  </p>
                                ) : null}

                                <p className="mt-1 text-xs font-medium text-text-muted">
                                  {formatDateTime(entry.created_at, locale)}
                                  {entry.actor ? ` · ${entry.actor}` : ""}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-text-muted">
                            {t("adminKyc.list.timeline.empty")}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="shrink-0 border-t border-slate-100 p-5">
                    {reviewLocked ? (
                      <div
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-sm",
                          currentStatus === "APPROVED"
                            ? "border-lime-200 bg-lime-50 text-lime-800"
                            : currentStatus === "REJECTED"
                              ? "border-rose-200 bg-rose-50 text-rose-800"
                              : "border-amber-200 bg-amber-50 text-amber-900",
                        )}
                      >
                        <div className="font-semibold text-text-primary">
                          {currentStatus === "APPROVED"
                            ? t("adminKyc.detail.status.approved")
                            : currentStatus === "REJECTED"
                              ? t("adminKyc.detail.status.rejected")
                              : t("adminKyc.detail.status.needsResubmission")}
                        </div>

                        {reviewedAt ? (
                          <div className="mt-2 text-xs font-medium text-text-muted">
                            {t("adminKyc.detail.fields.reviewedAt")}:{" "}
                            {formatDateTime(reviewedAt, locale)}
                          </div>
                        ) : null}

                        {reviewNote ? (
                          <div className="mt-3 rounded-xl border border-white/70 bg-white/70 px-3 py-3 text-sm text-text-primary">
                            <div className="font-semibold">
                              {t("adminKyc.detail.review.noteTitle")}
                            </div>
                            <div className="mt-1">{reviewNote}</div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <textarea
                          rows={3}
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder={t("adminKyc.list.actions.reasonPlaceholder")}
                          disabled={isSubmitting}
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-200 focus:ring-4 focus:ring-blue-100"
                        />

                        <div className="mt-4 grid gap-3">
                          <button
                            type="button"
                            onClick={() => void handleReview("APPROVED")}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(132,204,22,0.18)] transition hover:bg-lime-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {submittingAction === "APPROVED"
                              ? t("adminKyc.detail.actions.processing")
                              : t("adminKyc.detail.actions.approve")}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleReview("NEEDS_RESUBMISSION")}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                          >
                            <Clock3 className="h-4 w-4" />
                            {submittingAction === "NEEDS_RESUBMISSION"
                              ? t("adminKyc.detail.actions.processing")
                              : t("adminKyc.list.status.needsResubmission")}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleReview("REJECTED")}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            {submittingAction === "REJECTED"
                              ? t("adminKyc.detail.actions.processing")
                              : t("adminKyc.detail.actions.reject")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[520px] flex-col items-center justify-center p-6 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
                    <ShieldCheck className="h-8 w-8 text-blue-400" />
                  </div>

                  <p className={PAGE_TYPE.cardTitle}>
                    {t("adminKyc.list.emptyState")}
                  </p>
                  <p className={cn("mt-2 max-w-xs", PAGE_TYPE.body)}>
                    Select a KYC item from the table to review documents,
                    timeline, and actions quickly.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}