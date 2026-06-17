import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiArrowLeft,
  HiArrowTopRightOnSquare,
  HiCheckCircle,
  HiClock,
  HiDocumentText,
  HiShieldCheck,
  HiUser,
  HiXCircle,
} from "react-icons/hi2";

import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import {
  fetchKycDetail,
  reviewKyc,
  type AdminKycDetail,
} from "@/services/kyc/adminKyc";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

const MINIO_PUBLIC_BASE =
  (import.meta.env.VITE_MINIO_PUBLIC_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "";

type TimelineItem = {
  id: string;
  type: "submitted" | "document" | "review" | "approved" | "rejected" | "verified";
  title: string;
  description?: string;
  actor?: string;
  created_at?: string | null;
};

type ReviewAction = "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION";

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

const surfaceClass =
  "overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

const softSurfaceClass =
  "rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))]";

const actionButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export default function KycDetailPage() {
  const { t, i18n } = useTranslation("common");
  const { userId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");
  const [data, setData] = useState<AdminKycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<ReviewAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const locale = i18n.language?.startsWith("th") ? "th-TH" : "en-US";
  const isSubmitting = submittingAction !== null;

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setErrorMessage(t("adminKyc.detail.errors.missingUserId"));
      return;
    }

    setLoading(true);
    setErrorMessage("");

    fetchKycDetail(userId)
      .then((res) => {
        setData(res.data);
      })
      .catch((error) => {
        setData(null);
        setErrorMessage(
          error?.response?.data?.detail ||
            t("adminKyc.detail.errors.loadFailed"),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, t]);

  const idCardUrl = useMemo(
    () => resolveImageUrl(data?.id_card?.url ?? null),
    [data?.id_card?.url],
  );

  const selfieUrl = useMemo(
    () => resolveImageUrl(data?.selfie?.url ?? null),
    [data?.selfie?.url],
  );

  const availableDocuments = [idCardUrl, selfieUrl].filter(Boolean).length;

  const submittedAt = useMemo(
    () => formatDateTime(data?.submitted_at, locale),
    [data?.submitted_at, locale],
  );

  const reviewedAt = useMemo(
    () => formatDateTime(data?.reviewed_at, locale),
    [data?.reviewed_at, locale],
  );

  const submittedRelative = useMemo(
    () => formatRelativeTime(data?.submitted_at, t),
    [data?.submitted_at, t],
  );

  const reviewedRelative = useMemo(
    () => formatRelativeTime(data?.reviewed_at, t),
    [data?.reviewed_at, t],
  );

  const timelineItems = useMemo<TimelineItem[]>(
    () => buildTimelineItems(data, t),
    [data, t],
  );

  const reviewLocked = data?.status !== "PENDING";

  const handleReview = async (status: ReviewAction) => {
    if (!userId || isSubmitting) return;

    const reason =
      status === "APPROVED"
        ? undefined
        : rejectReason.trim() || t("adminKyc.detail.review.defaultRejectReason");

    try {
      setSubmittingAction(status);
      setErrorMessage("");

      await reviewKyc(userId, { status, reason });
      navigate("/admin/kyc");
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.detail ||
          (status === "APPROVED"
            ? t("adminKyc.detail.errors.approveFailed")
            : t("adminKyc.detail.errors.rejectFailed")),
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  if (loading) {
    return (
      <PageFrame>
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
            <HiClock className="h-8 w-8 animate-spin text-blue-400" />
          </div>
          <p className={PAGE_TYPE.cardTitle}>
            {t("adminKyc.detail.states.loading")}
          </p>
        </div>
      </PageFrame>
    );
  }

  if (!data) {
    return (
      <PageFrame>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate("/admin/kyc")}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
          >
            <HiArrowLeft className="h-4 w-4" />
            {t("adminKyc.detail.actions.backToQueue")}
          </button>

          {errorMessage ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
              <HiShieldCheck className="h-8 w-8 text-blue-400" />
            </div>
            <p className={PAGE_TYPE.cardTitle}>
              {t("adminKyc.detail.states.notFound")}
            </p>
          </div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="relative space-y-7">
        <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
          <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
            {Array.from({ length: 12 }).map((_, index) => (
              <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
            ))}
          </div>
        </div>

        <section className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/kyc")}
              className="mt-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50 hover:text-text-primary"
              aria-label={t("adminKyc.detail.actions.backToQueue")}
            >
              <HiArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
                KYC Detail
              </div>

              <h1 className={cn("truncate", PAGE_TYPE.pageTitle)}>
                {data.profile.full_name || "-"}
              </h1>

              <p className={cn("mt-2 truncate", PAGE_TYPE.pageSubtitle)}>
                {data.email || "-"}
              </p>
            </div>
          </div>

          <StatusBadge
            status={data.status}
            className="self-start rounded-full px-4 py-1.5 text-xs font-semibold"
          />
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={HiClock}
            label={t("adminKyc.list.table.status")}
            value={getStatusLabel(data.status, t)}
            tone={getStatusTone(data.status)}
          />
          <SummaryCard
            icon={HiDocumentText}
            label={t("adminKyc.detail.review.documentsLabel")}
            value={`${availableDocuments}/2`}
            caption={
              availableDocuments === 2
                ? t("adminKyc.detail.review.documentsComplete")
                : t("adminKyc.detail.review.documentsIncomplete")
            }
          />
          <SummaryCard
            icon={HiShieldCheck}
            label={t("adminKyc.detail.fields.submittedAt")}
            value={submittedRelative}
            caption={submittedAt}
          />
          <SummaryCard
            icon={HiClock}
            label={t("adminKyc.detail.fields.reviewedAt")}
            value={reviewedRelative}
            caption={reviewedAt}
          />
        </section>

        <section className={surfaceClass}>
          <div className="flex flex-wrap gap-6 border-b border-slate-100 px-6 pt-5">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              {t("adminKyc.detail.profile.title")}
            </TabButton>

            <TabButton
              active={activeTab === "timeline"}
              onClick={() => setActiveTab("timeline")}
            >
              <span className="inline-flex items-center gap-2">
                {t("adminKyc.list.sections.timeline")}
                <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {timelineItems.length}
                </span>
              </span>
            </TabButton>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <section className="space-y-6">
            {activeTab === "overview" ? (
              <>
                <InfoCard
                  id="kyc-info"
                  title={t("adminKyc.list.sections.personalInfo")}
                  icon={HiUser}
                >
                  <DataRows
                    rows={[
                      {
                        label: t("adminKyc.detail.fields.fullName"),
                        value: data.profile.full_name || "-",
                      },
                      {
                        label: t("adminKyc.list.fields.email"),
                        value: data.email || "-",
                      },
                      {
                        label: t("adminKyc.detail.fields.citizenId"),
                        value: data.profile.citizen_id || "-",
                      },
                      {
                        label: t("adminKyc.detail.fields.country"),
                        value:
                          data.profile.country ||
                          t("adminKyc.list.defaults.country"),
                      },
                      {
                        label: t("adminKyc.detail.fields.dateOfBirth"),
                        value: formatDateOnly(data.profile.date_of_birth, locale),
                      },
                      {
                        label: t("adminKyc.detail.fields.submittedAt"),
                        value: submittedRelative,
                      },
                    ]}
                  />
                </InfoCard>

                <InfoCard
                  title={t("adminKyc.detail.documents.title")}
                  icon={HiDocumentText}
                  badge={`${availableDocuments}/2`}
                >
                  <div className="grid gap-5 xl:grid-cols-2">
                    <DocumentPanel
                      kind="id-card"
                      title={t("adminKyc.detail.documents.idCard")}
                      imageUrl={idCardUrl}
                      status={
                        idCardUrl
                          ? t("adminKyc.list.documents.received")
                          : t("adminKyc.list.documents.notReceived")
                      }
                    />

                    <DocumentPanel
                      kind="selfie"
                      title={t("adminKyc.detail.documents.selfie")}
                      imageUrl={selfieUrl}
                      status={
                        selfieUrl
                          ? t("adminKyc.list.documents.received")
                          : t("adminKyc.list.documents.notReceived")
                      }
                    />
                  </div>
                </InfoCard>
              </>
            ) : (
              <InfoCard
                id="kyc-timeline"
                title={t("adminKyc.list.sections.timeline")}
                icon={HiClock}
                badge={String(timelineItems.length)}
              >
                <TimelinePanel items={timelineItems} locale={locale} />
              </InfoCard>
            )}
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <InfoCard title={t("adminKyc.detail.review.title")} icon={HiCheckCircle}>
              <ReviewPanel
                data={data}
                reviewedAt={reviewedAt}
                rejectReason={rejectReason}
                isSubmitting={isSubmitting}
                submittingAction={submittingAction}
                reviewLocked={reviewLocked}
                onReasonChange={setRejectReason}
                onApprove={() => void handleReview("APPROVED")}
                onNeedsResubmission={() => void handleReview("NEEDS_RESUBMISSION")}
                onReject={() => void handleReview("REJECTED")}
                t={t}
              />
            </InfoCard>
          </aside>
        </div>
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b-2 px-1 pb-4 text-sm font-semibold transition",
        active
          ? "border-primary text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-lime-50 text-lime-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600"
        : tone === "danger"
          ? "bg-rose-50 text-rose-600"
          : "bg-blue-50 text-blue-600";

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>

      <div className="relative flex items-start gap-4">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-[18px]", toneClass)}>
          <Icon className="h-7 w-7" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-xl font-bold leading-tight text-text-primary">
            {value}
          </p>
          {caption ? (
            <p className="mt-2 truncate text-sm font-medium text-slate-500">
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  id,
  title,
  icon: Icon,
  badge,
  children,
}: {
  id?: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={surfaceClass}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-[14px] bg-blue-50 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className={PAGE_TYPE.sectionTitle}>{title}</h2>
        </div>

        {badge ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-text-muted">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function DataRows({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="grid gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center"
        >
          <div className="font-medium text-text-muted">{row.label}</div>
          <div className="break-words font-semibold text-text-primary sm:text-right">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentPanel({
  kind,
  title,
  status,
  imageUrl,
}: {
  kind: "id-card" | "selfie";
  title: string;
  status: string;
  imageUrl: string | null;
}) {
  const { t } = useTranslation("common");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <div className={cn(softSurfaceClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-text-primary">{title}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold",
                imageUrl
                  ? "bg-lime-50 text-lime-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  imageUrl ? "bg-lime-500" : "bg-amber-500",
                )}
              />
              {status}
            </span>

            <span className="text-xs font-medium text-text-muted">
              {kind === "id-card"
                ? t("adminKyc.detail.fields.citizenId")
                : t("adminKyc.detail.documents.selfie")}
            </span>
          </div>
        </div>

        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-text-secondary transition hover:bg-slate-50 hover:text-text-primary"
          >
            {t("adminKyc.detail.documents.open")}
            <HiArrowTopRightOnSquare className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      {!imageUrl ? (
        <div className="flex min-h-[320px] items-center justify-center border-t border-dashed border-slate-200 bg-white px-6 text-sm font-medium text-text-muted">
          {t("adminKyc.detail.documents.noDocument")}
        </div>
      ) : failed ? (
        <div className="flex min-h-[320px] items-center justify-center bg-rose-50 px-6 text-sm font-semibold text-rose-700">
          {t("adminKyc.detail.documents.loadFailed")}
        </div>
      ) : (
        <div className="p-4">
          <div className="flex min-h-[340px] items-center justify-center overflow-hidden rounded-[16px] border border-slate-200 bg-white px-5 py-6">
            <img
              src={imageUrl}
              alt={title}
              onError={() => setFailed(true)}
              className="max-h-[500px] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TimelinePanel({
  items,
  locale,
}: {
  items: TimelineItem[];
  locale: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-slate-200/80 bg-white px-4 py-5 text-sm font-medium text-text-muted">
        No timeline available.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const styles = getTimelineStyles(item.type);
        const isLast = index === items.length - 1;
        const Icon = styles.icon;

        return (
          <div key={item.id} className="relative flex gap-4 pb-2 last:pb-0">
            {!isLast ? (
              <div className="absolute bottom-[-8px] left-[17px] top-10 w-px bg-slate-200" />
            ) : null}

            <div
              className={cn(
                "relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border",
                styles.wrapper,
              )}
            >
              <Icon className={cn("h-4 w-4", styles.iconClass)} />
            </div>

            <div className="min-w-0 flex-1 rounded-[18px] border border-slate-200/80 bg-white px-4 py-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary">{item.title}</div>
                  {item.description ? (
                    <div className="mt-1 text-sm leading-6 text-text-secondary">
                      {item.description}
                    </div>
                  ) : null}
                </div>

                {item.created_at ? (
                  <div className="shrink-0 text-xs font-semibold text-text-muted">
                    {formatDateTime(item.created_at, locale)}
                  </div>
                ) : null}
              </div>

              {item.actor ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-text-muted">
                  <HiUser className="h-4 w-4" />
                  {item.actor}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewPanel({
  data,
  reviewedAt,
  rejectReason,
  isSubmitting,
  submittingAction,
  reviewLocked,
  onReasonChange,
  onApprove,
  onNeedsResubmission,
  onReject,
  t,
}: {
  data: AdminKycDetail;
  reviewedAt: string;
  rejectReason: string;
  isSubmitting: boolean;
  submittingAction: ReviewAction | null;
  reviewLocked: boolean;
  onReasonChange: (value: string) => void;
  onApprove: () => void;
  onNeedsResubmission: () => void;
  onReject: () => void;
  t: TFunction;
}) {
  if (reviewLocked) {
    return (
      <div
        className={cn(
          "rounded-[18px] border px-4 py-4 text-sm",
          data.status === "APPROVED"
            ? "border-lime-200 bg-lime-50 text-lime-800"
            : data.status === "REJECTED"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-amber-200 bg-amber-50 text-amber-900",
        )}
      >
        <div className="font-semibold text-text-primary">
          {data.status === "APPROVED"
            ? t("adminKyc.detail.status.approved")
            : data.status === "REJECTED"
              ? t("adminKyc.detail.status.rejected")
              : t("adminKyc.detail.status.needsResubmission")}
        </div>

        {data.reviewed_at ? (
          <div className="mt-2 text-xs font-medium text-text-muted">
            {t("adminKyc.detail.fields.reviewedAt")}: {reviewedAt}
          </div>
        ) : null}

        {data.reason ? (
          <div className="mt-3 rounded-[14px] border border-white/70 bg-white/70 px-4 py-3 text-sm text-text-primary">
            <div className="font-semibold">
              {t("adminKyc.detail.review.noteTitle")}
            </div>
            <div className="mt-1">{data.reason}</div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <textarea
        rows={5}
        value={rejectReason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder={t("adminKyc.detail.review.reasonPlaceholder")}
        disabled={isSubmitting}
        className="w-full resize-none rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-200 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <button
        type="button"
        onClick={onApprove}
        disabled={isSubmitting}
        className={cn(
          actionButtonClass,
          "bg-lime-600 text-white shadow-[0_14px_28px_rgba(132,204,22,0.18)] hover:bg-lime-700",
        )}
      >
        <HiCheckCircle className="h-5 w-5" />
        {submittingAction === "APPROVED"
          ? t("adminKyc.detail.actions.processing")
          : t("adminKyc.detail.actions.approve")}
      </button>

      <button
        type="button"
        onClick={onNeedsResubmission}
        disabled={isSubmitting}
        className={cn(
          actionButtonClass,
          "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
        )}
      >
        <HiClock className="h-5 w-5" />
        {submittingAction === "NEEDS_RESUBMISSION"
          ? t("adminKyc.detail.actions.processing")
          : t("adminKyc.list.status.needsResubmission")}
      </button>

      <button
        type="button"
        onClick={onReject}
        disabled={isSubmitting}
        className={cn(
          actionButtonClass,
          "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
        )}
      >
        <HiXCircle className="h-5 w-5" />
        {submittingAction === "REJECTED"
          ? t("adminKyc.detail.actions.processing")
          : t("adminKyc.detail.actions.reject")}
      </button>

      {data.reason ? (
        <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold text-amber-700">
            {t("adminKyc.detail.review.noteTitle")}
          </div>
          <div className="mt-1">{data.reason}</div>
        </div>
      ) : null}
    </div>
  );
}

function buildTimelineItems(data: AdminKycDetail | null, t: TFunction): TimelineItem[] {
  if (!data) return [];

  if (data.timeline?.length) {
    return data.timeline.map((entry) => ({
      id: entry.id,
      type:
        entry.event_type === "approved"
          ? "approved"
          : entry.event_type === "rejected"
            ? "rejected"
            : entry.event_type === "documents_completed"
              ? "verified"
              : entry.event_type === "id_card_uploaded" ||
                  entry.event_type === "selfie_uploaded"
                ? "document"
                : entry.event_type === "needs_resubmission"
                  ? "review"
                  : "submitted",
      title:
        entry.event_type === "submitted"
          ? t("adminKyc.list.timeline.submitted")
          : entry.event_type === "id_card_uploaded"
            ? t("adminKyc.list.timeline.idCard")
            : entry.event_type === "selfie_uploaded"
              ? t("adminKyc.list.timeline.selfie")
              : entry.event_type === "documents_completed"
                ? t("adminKyc.list.timeline.complete")
                : entry.event_type === "approved"
                  ? t("adminKyc.list.timeline.approved")
                  : entry.event_type === "rejected"
                    ? t("adminKyc.list.timeline.rejected")
                    : entry.event_type === "needs_resubmission"
                      ? t("adminKyc.list.status.needsResubmission")
                      : t("adminKyc.list.timeline.updateItem"),
      description:
        entry.note ||
        (entry.event_type === "documents_completed"
          ? t("adminKyc.detail.timeline.documentsCompleteDescription")
          : entry.event_type === "approved"
            ? t("adminKyc.detail.timeline.approvedDescription")
            : entry.event_type === "rejected" ||
                entry.event_type === "needs_resubmission"
              ? t("adminKyc.detail.timeline.rejectedDescription")
              : undefined),
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

  const items: TimelineItem[] = [];

  if (data.submitted_at) {
    items.push({
      id: "submitted",
      type: "submitted",
      title: t("adminKyc.list.timeline.submitted"),
      description: t("adminKyc.detail.timeline.submittedDescription"),
      actor: t("adminKyc.list.timeline.actors.user"),
      created_at: data.submitted_at,
    });
  }

  if (data.id_card?.created_at) {
    items.push({
      id: "id-card",
      type: "document",
      title: t("adminKyc.list.timeline.idCard"),
      description: t("adminKyc.detail.timeline.idCardDescription"),
      actor: t("adminKyc.list.timeline.actors.user"),
      created_at: data.id_card.created_at,
    });
  }

  if (data.selfie?.created_at) {
    items.push({
      id: "selfie",
      type: "document",
      title: t("adminKyc.list.timeline.selfie"),
      description: t("adminKyc.detail.timeline.selfieDescription"),
      actor: t("adminKyc.list.timeline.actors.user"),
      created_at: data.selfie.created_at,
    });
  }

  if (data.id_card && data.selfie) {
    items.push({
      id: "documents-complete",
      type: "verified",
      title: t("adminKyc.list.timeline.complete"),
      description: t("adminKyc.detail.timeline.documentsCompleteDescription"),
      actor: t("adminKyc.list.timeline.actors.system"),
      created_at:
        data.selfie.created_at || data.id_card.created_at || data.submitted_at,
    });
  }

  if (data.reviewed_at) {
    items.push({
      id: "reviewed",
      type:
        data.status === "APPROVED"
          ? "approved"
          : data.status === "REJECTED"
            ? "rejected"
            : "review",
      title:
        data.status === "APPROVED"
          ? t("adminKyc.list.timeline.approved")
          : data.status === "REJECTED"
            ? t("adminKyc.list.timeline.rejected")
            : data.status === "NEEDS_RESUBMISSION"
              ? t("adminKyc.list.status.needsResubmission")
              : t("adminKyc.list.timeline.reviewed"),
      description:
        data.status === "REJECTED"
          ? data.reason || t("adminKyc.detail.timeline.rejectedDescription")
          : data.status === "NEEDS_RESUBMISSION"
            ? data.reason || t("adminKyc.detail.timeline.rejectedDescription")
            : data.status === "APPROVED"
              ? t("adminKyc.detail.timeline.approvedDescription")
              : t("adminKyc.detail.timeline.reviewedDescription"),
      actor: t("adminKyc.list.timeline.actors.admin"),
      created_at: data.reviewed_at,
    });
  }

  return items;
}

function getTimelineStyles(type: TimelineItem["type"]) {
  switch (type) {
    case "approved":
      return {
        icon: HiCheckCircle,
        wrapper: "border-lime-200 bg-lime-50",
        iconClass: "text-lime-600",
      };
    case "rejected":
      return {
        icon: HiXCircle,
        wrapper: "border-rose-200 bg-rose-50",
        iconClass: "text-rose-600",
      };
    case "document":
      return {
        icon: HiDocumentText,
        wrapper: "border-blue-200 bg-blue-50",
        iconClass: "text-blue-600",
      };
    case "review":
      return {
        icon: HiClock,
        wrapper: "border-amber-200 bg-amber-50",
        iconClass: "text-amber-600",
      };
    case "verified":
      return {
        icon: HiShieldCheck,
        wrapper: "border-lime-200 bg-lime-50",
        iconClass: "text-lime-600",
      };
    case "submitted":
    default:
      return {
        icon: HiUser,
        wrapper: "border-slate-200 bg-slate-50",
        iconClass: "text-slate-600",
      };
  }
}

function getStatusLabel(status: string, t: TFunction) {
  if (status === "PENDING") return t("adminKyc.list.status.pending");
  if (status === "APPROVED") return t("adminKyc.list.timeline.approved");
  if (status === "REJECTED") return t("adminKyc.list.timeline.rejected");
  if (status === "NEEDS_RESUBMISSION") {
    return t("adminKyc.list.status.needsResubmission");
  }

  return status;
}

function getStatusTone(status: string) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  return "warning" as const;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string | null | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(value: string | null | undefined, t: TFunction) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin < 1) return t("adminKyc.list.time.justNow");
  if (diffMin < 60) return t("adminKyc.list.time.minutesAgo", { count: diffMin });

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t("adminKyc.list.time.hoursAgo", { count: diffHour });

  const diffDay = Math.floor(diffHour / 24);
  return t("adminKyc.list.time.daysAgo", { count: diffDay });
}

function resolveImageUrl(url: string | null) {
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