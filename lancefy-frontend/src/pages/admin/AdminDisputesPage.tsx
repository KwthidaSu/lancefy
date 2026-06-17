import { useEffect, useRef, useState, type ElementType } from "react";
import {
  HiArrowPath,
  HiCheckCircle,
  HiClock,
  HiDocumentText,
  HiExclamationTriangle,
  HiScale,
  HiXMark,
} from "react-icons/hi2";

import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  adminListDisputeMessages,
  adminListDisputes,
  adminMarkReviewing,
  adminResolveDispute,
  adminSendDisputeMessage,
  type DisputeMessage,
  type DisputeResolution,
  type DisputeResponse,
} from "@/services/dispute.service";

const ADMIN_TYPE = {
  pageTitle:
    "text-4xl font-bold tracking-tight text-text-primary md:text-[3.15rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle:
    "text-[1.6rem] font-semibold tracking-tight text-text-primary md:text-[1.75rem]",
  statLabel: "text-base font-medium text-text-secondary",
  statValue: "mt-3 text-[2.35rem] font-bold leading-none text-text-primary",
  cardTitle: "text-[1.05rem] font-semibold leading-6 text-text-primary",
  body: "text-[0.95rem] leading-7 text-text-secondary",
  meta: "text-[0.82rem] font-medium leading-5 text-text-muted",
  micro: "text-[0.75rem] font-medium leading-5 text-text-muted",
};

const inputClass =
  "w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_STYLE: Record<
  string,
  {
    label: string;
    pill: string;
    dot: string;
    card: string;
  }
> = {
  open: {
    label: "Open",
    pill: "border border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    card: "border-amber-200/80 bg-amber-50/70",
  },
  reviewing: {
    label: "Reviewing",
    pill: "border border-blue-200 bg-blue-50 text-primary",
    dot: "bg-primary",
    card: "border-blue-200/80 bg-blue-50/70",
  },
  resolved: {
    label: "Resolved",
    pill: "border border-lime-200 bg-lime-50 text-lime-700",
    dot: "bg-lime-500",
    card: "border-lime-200/80 bg-lime-50/70",
  },
  rejected: {
    label: "Rejected",
    pill: "border border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    card: "border-rose-200/80 bg-rose-50/70",
  },
};

const REASON_LABELS: Record<string, string> = {
  work_not_as_described: "Work does not match the agreed scope",
  work_incomplete: "Work is incomplete",
  work_poor_quality: "Work quality is below expectations",
  freelancer_unresponsive: "Freelancer is unresponsive",
  missed_deadline: "Deadline was missed",
  scope_changed: "Client changed the scope",
  client_unresponsive: "Client is unresponsive",
  unfair_rejection: "Work was rejected unfairly",
  cancellation_dispute: "Project cancellation dispute",
  payment_not_released: "Milestone payment was not released",
  other: "Other",
};

const RESOLUTION_OPTIONS: Array<{
  value: DisputeResolution;
  label: string;
  desc: string;
  danger?: boolean;
}> = [
  {
    value: "release",
    label: "Release payment",
    desc: "Release the milestone payment to the freelancer.",
  },
  {
    value: "refund",
    label: "Refund client",
    desc: "Refund the milestone payment back to the client.",
    danger: true,
  },
  {
    value: "extend_deadline",
    label: "Extend deadline",
    desc: "Extend the delivery deadline for the milestone.",
  },
  {
    value: "force_approve",
    label: "Force approve",
    desc: "Approve the milestone without waiting for the client action.",
  },
  {
    value: "terminate_project",
    label: "Terminate project",
    desc: "Terminate the project entirely.",
    danger: true,
  },
  {
    value: "rejected",
    label: "Reject dispute",
    desc: "Close the dispute because the claim is not valid.",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReasonLabel(reason: string) {
  return REASON_LABELS[reason] ?? reason.split("_").join(" ");
}

function PageHero({
  refreshing,
  loading,
  onRefresh,
}: {
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          Admin Console
        </div>

        <h1 className={ADMIN_TYPE.pageTitle}>Dispute Resolution Center</h1>

        <p className={cn("mt-2 max-w-3xl", ADMIN_TYPE.pageSubtitle)}>
          Review disputes between clients and freelancers, collect context, and
          make final admin decisions without changing the core workflow.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing || loading}
        className={secondaryButtonClass}
      >
        <HiArrowPath
          className={cn("h-4 w-4", refreshing ? "animate-spin" : "")}
        />
        Refresh
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  bgClass,
  iconClass,
}: {
  label: string;
  value: number;
  icon: ElementType;
  bgClass: string;
  iconClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />

      <div className="relative flex items-start gap-5">
        <div
          className={cn(
            "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px] shadow-sm",
            bgClass,
          )}
        >
          <Icon className={cn("h-7 w-7", iconClass)} />
        </div>

        <div className="min-w-0">
          <p className={ADMIN_TYPE.statLabel}>{label}</p>
          <p className={ADMIN_TYPE.statValue}>{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
        <HiScale className="h-8 w-8 text-blue-400" />
      </div>

      <p className={ADMIN_TYPE.cardTitle}>{message}</p>
      <p className={cn("mt-2", ADMIN_TYPE.body)}>
        Try changing the status filter or refreshing the latest disputes.
      </p>
    </div>
  );
}

function ResolveModal({
  dispute,
  onClose,
  onConfirm,
}: {
  dispute: DisputeResponse;
  onClose: () => void;
  onConfirm: (
    resolution: DisputeResolution,
    note: string,
    newDueDate?: string,
  ) => void;
}) {
  const [resolution, setResolution] = useState<DisputeResolution>("release");
  const [note, setNote] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const selected = RESOLUTION_OPTIONS.find(
    (option) => option.value === resolution,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary">
              Resolve dispute
            </div>

            <h2 className={cn("mt-3 truncate", ADMIN_TYPE.sectionTitle)}>
              {dispute.project_title ??
                `Project ${dispute.project_id.slice(0, 8)}`}
            </h2>

            <p className={cn("mt-1", ADMIN_TYPE.meta)}>
              {getReasonLabel(dispute.reason)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] p-2 text-text-muted transition-colors hover:bg-slate-100 hover:text-text-primary"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-text-primary">
              Resolution
            </p>

            <div className="space-y-3">
              {RESOLUTION_OPTIONS.map((option) => {
                const isSelected = resolution === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResolution(option.value)}
                    className={cn(
                      "w-full rounded-[16px] border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? option.danger
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-primary bg-primary text-primary-foreground"
                        : "border-slate-200 bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary",
                    )}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        isSelected ? "text-white/80" : "text-text-muted",
                      )}
                    >
                      {option.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {resolution === "extend_deadline" ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-text-primary">
                New due date
              </label>

              <input
                type="date"
                value={newDueDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(event) => setNewDueDate(event.target.value)}
                className={inputClass}
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-text-primary">
              Internal note
            </label>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Add context for this resolution..."
              className={cn(inputClass, "min-h-[112px] resize-none")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onConfirm(resolution, note, newDueDate || undefined)}
            disabled={resolution === "extend_deadline" && !newDueDate}
            className={
              selected?.danger
                ? "inline-flex items-center justify-center gap-2 rounded-[14px] bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                : primaryButtonClass
            }
          >
            Confirm {selected?.label.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const { showToast } = useToast();

  const [allDisputes, setAllDisputes] = useState<DisputeResponse[]>([]);
  const [filter, setFilter] = useState<
    "all" | "open" | "reviewing" | "resolved"
  >("open");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<DisputeResponse | null>(
    null,
  );

  const [threadMessages, setThreadMessages] = useState<DisputeMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [adminMsgText, setAdminMsgText] = useState("");
  const [adminMsgType, setAdminMsgType] = useState<"info_request" | "admin_note">(
    "info_request",
  );
  const [adminSending, setAdminSending] = useState(false);

  const threadBottomRef = useRef<HTMLDivElement>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const response = await adminListDisputes("all");
      setAllDisputes(response.data);
    } catch {
      showToast("Failed to load disputes.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!expanded) {
      setThreadMessages([]);
      return;
    }

    setThreadLoading(true);
    setAdminMsgText("");

    adminListDisputeMessages(expanded)
      .then((response) => setThreadMessages(response.data))
      .catch(() => undefined)
      .finally(() => setThreadLoading(false));
  }, [expanded]);

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  async function handleAdminSend(disputeId: string) {
    if (!adminMsgText.trim()) return;

    setAdminSending(true);

    try {
      const response = await adminSendDisputeMessage(
        disputeId,
        adminMsgText.trim(),
        adminMsgType,
      );

      setThreadMessages((previous) => [...previous, response.data]);
      setAdminMsgText("");
    } finally {
      setAdminSending(false);
    }
  }

  const displayDisputes =
    filter === "all"
      ? allDisputes
      : allDisputes.filter((dispute) => dispute.status === filter);

  const stats = {
    open: allDisputes.filter((dispute) => dispute.status === "open").length,
    reviewing: allDisputes.filter((dispute) => dispute.status === "reviewing")
      .length,
    resolved: allDisputes.filter((dispute) => dispute.status === "resolved")
      .length,
  };

  const handleMarkReviewing = async (dispute: DisputeResponse) => {
    setActioning(dispute.id);

    try {
      await adminMarkReviewing(dispute.id);
      showToast("Dispute moved to reviewing.", "success");

      setAllDisputes((previous) =>
        previous.map((item) =>
          item.id === dispute.id ? { ...item, status: "reviewing" } : item,
        ),
      );
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setActioning(null);
    }
  };

  const handleResolve = async (
    resolution: DisputeResolution,
    note: string,
    newDueDate?: string,
  ) => {
    if (!resolveTarget) return;

    const targetId = resolveTarget.id;

    setActioning(targetId);
    setResolveTarget(null);

    try {
      const response = await adminResolveDispute(targetId, {
        resolution,
        resolution_note: note || undefined,
        new_due_date: newDueDate || undefined,
      });

      showToast(`Dispute resolved with "${resolution}".`, "success");

      setAllDisputes((previous) =>
        previous.map((item) => (item.id === targetId ? response.data : item)),
      );
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setActioning(null);
    }
  };

  return (
    <>
      <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
        <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

          <div className="relative space-y-7">
            <PageHero
              refreshing={refreshing}
              loading={loading}
              onRefresh={() => load(true)}
            />

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                label="Open disputes"
                value={loading ? 0 : stats.open}
                icon={HiExclamationTriangle}
                bgClass="bg-amber-50"
                iconClass="text-amber-600"
              />

              <StatCard
                label="In review"
                value={loading ? 0 : stats.reviewing}
                icon={HiClock}
                bgClass="bg-primary"
                iconClass="text-primary-foreground"
              />

              <StatCard
                label="Resolved"
                value={loading ? 0 : stats.resolved}
                icon={HiCheckCircle}
                bgClass="bg-lime-50"
                iconClass="text-lime-600"
              />
            </section>

            <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap gap-2">
                {(["open", "reviewing", "resolved", "all"] as const).map(
                  (value) => {
                    const isActive = filter === value;
                    const label =
                      value === "all"
                        ? "All disputes"
                        : value === "open"
                          ? `Open${
                              !loading && stats.open > 0
                                ? ` (${stats.open})`
                                : ""
                            }`
                          : value === "reviewing"
                            ? `Reviewing${
                                !loading && stats.reviewing > 0
                                  ? ` (${stats.reviewing})`
                                  : ""
                              }`
                            : "Resolved";

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={cn(
                          "rounded-[14px] px-5 py-2.5 text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(37,99,235,0.20)]"
                            : "text-text-secondary hover:bg-slate-50 hover:text-text-primary",
                        )}
                      >
                        {label}
                      </button>
                    );
                  },
                )}
              </div>
            </section>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-44 animate-pulse rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                  />
                ))}
              </div>
            ) : displayDisputes.length === 0 ? (
              <EmptyState message="No disputes match this status right now." />
            ) : (
              <div className="space-y-4">
                {displayDisputes.map((dispute) => {
                  const style =
                    STATUS_STYLE[dispute.status] ?? STATUS_STYLE.open;
                  const isExpanded = expanded === dispute.id;
                  const isBusy = actioning === dispute.id;

                  return (
                    <section
                      key={dispute.id}
                      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(isExpanded ? null : dispute.id)
                        }
                        className="flex w-full flex-col gap-4 p-6 text-left transition-colors hover:bg-slate-50/60 lg:flex-row lg:items-start lg:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                                style.pill,
                              )}
                            >
                              <span
                                className={cn("h-2 w-2 rounded-full", style.dot)}
                              />
                              {style.label}
                            </span>

                            <span className={ADMIN_TYPE.micro}>
                              {formatDate(dispute.created_at)}
                            </span>
                          </div>

                          <h2 className={cn("mt-4", ADMIN_TYPE.cardTitle)}>
                            {dispute.project_title ??
                              `Project ${dispute.project_id.slice(0, 8)}`}
                          </h2>

                          {dispute.milestone_title ? (
                            <p className={cn("mt-1", ADMIN_TYPE.meta)}>
                              Milestone: {dispute.milestone_title}
                            </p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium text-text-secondary">
                            <span>
                              Raised by{" "}
                              <span className="font-semibold text-text-primary">
                                {dispute.raiser_name ??
                                  dispute.raiser_username ??
                                  dispute.raised_by.slice(0, 8)}
                              </span>
                            </span>

                            <span className="text-slate-300">•</span>
                            <span>{getReasonLabel(dispute.reason)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start lg:pl-6">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-text-muted">
                            {(dispute.evidences?.length ?? 0).toString()}{" "}
                            evidence
                          </span>

                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {isExpanded ? "Collapse" : "Expand"}
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-slate-100 px-6 pb-6 pt-5">
                          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                            <div className="space-y-4">
                              <div className="rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] p-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                                      Project ID
                                    </p>
                                    <p className="mt-2 break-all font-mono text-xs text-text-secondary">
                                      {dispute.project_id}
                                    </p>
                                  </div>

                                  {dispute.milestone_id ? (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                                        Milestone ID
                                      </p>
                                      <p className="mt-2 break-all font-mono text-xs text-text-secondary">
                                        {dispute.milestone_id}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>

                                {dispute.reason_detail ? (
                                  <div className="mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                                      Details
                                    </p>

                                    <p className="mt-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-text-secondary">
                                      {dispute.reason_detail}
                                    </p>
                                  </div>
                                ) : null}

                                {dispute.resolved_at ? (
                                  <div className="mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                                      Resolved at
                                    </p>

                                    <p className={cn("mt-2", ADMIN_TYPE.meta)}>
                                      {formatDate(dispute.resolved_at)}
                                    </p>
                                  </div>
                                ) : null}
                              </div>

                              {(dispute.status === "resolved" ||
                                dispute.status === "rejected") &&
                              dispute.resolution ? (
                                <div
                                  className={cn(
                                    "rounded-[20px] border p-4",
                                    STATUS_STYLE[dispute.status]?.card ??
                                      "border-lime-200/80 bg-lime-50/70",
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/80 text-lime-600 shadow-sm">
                                      <HiCheckCircle className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                      <p className={ADMIN_TYPE.cardTitle}>
                                        {
                                          RESOLUTION_OPTIONS.find(
                                            (option) =>
                                              option.value ===
                                              dispute.resolution,
                                          )?.label
                                        }
                                      </p>

                                      {dispute.resolution_note ? (
                                        <p
                                          className={cn(
                                            "mt-1",
                                            ADMIN_TYPE.body,
                                          )}
                                        >
                                          {dispute.resolution_note}
                                        </p>
                                      ) : null}

                                      {dispute.new_due_date ? (
                                        <p
                                          className={cn(
                                            "mt-1",
                                            ADMIN_TYPE.meta,
                                          )}
                                        >
                                          New due date:{" "}
                                          {formatDate(dispute.new_due_date)}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {dispute.evidences &&
                              dispute.evidences.length > 0 ? (
                                <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                                  <div className="flex items-center gap-2">
                                    <HiDocumentText className="h-4 w-4 text-text-muted" />
                                    <h3 className="text-sm font-semibold text-text-primary">
                                      Evidence
                                    </h3>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    {dispute.evidences.map((evidence) => (
                                      <div
                                        key={evidence.id}
                                        className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] p-4"
                                      >
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <span className="font-semibold text-text-primary">
                                            {evidence.submitter_name ??
                                              evidence.submitter_username ??
                                              evidence.submitted_by.slice(0, 8)}
                                          </span>

                                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-text-muted">
                                            {evidence.type}
                                          </span>

                                          <span className="font-medium text-text-muted">
                                            {formatDate(evidence.created_at)}
                                          </span>
                                        </div>

                                        {evidence.content ? (
                                          <p
                                            className={cn(
                                              "mt-3",
                                              ADMIN_TYPE.body,
                                            )}
                                          >
                                            {evidence.content}
                                          </p>
                                        ) : null}

                                        {evidence.file_id ? (
                                          <p className="mt-2 text-xs font-semibold text-primary">
                                            Attachment ID: {evidence.file_id}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="space-y-4">
                              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                                <div className="border-b border-slate-100 px-5 py-4">
                                  <h3 className="text-sm font-semibold text-text-primary">
                                    Admin thread
                                  </h3>

                                  <p className={cn("mt-1", ADMIN_TYPE.meta)}>
                                    Request more details or leave internal admin
                                    notes.
                                  </p>
                                </div>

                                <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
                                  {threadLoading ? (
                                    <div className="flex justify-center py-8">
                                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-primary" />
                                    </div>
                                  ) : threadMessages.length === 0 ? (
                                    <p className="py-8 text-center text-sm font-medium text-text-muted">
                                      No messages yet.
                                    </p>
                                  ) : (
                                    threadMessages.map((message) => {
                                      const isInfoRequest =
                                        message.message_type === "info_request";
                                      const isAdminNote =
                                        message.message_type === "admin_note";

                                      return (
                                        <div
                                          key={message.id}
                                          className={cn(
                                            "rounded-[18px] border p-4",
                                            isInfoRequest
                                              ? "border-amber-200 bg-amber-50/70"
                                              : isAdminNote
                                                ? "border-slate-200 bg-slate-50/80"
                                                : "border-slate-200 bg-white",
                                          )}
                                        >
                                          <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {isInfoRequest ? (
                                              <span className="rounded-full bg-amber-500 px-2 py-1 font-semibold text-white">
                                                Info request
                                              </span>
                                            ) : null}

                                            {isAdminNote ? (
                                              <span className="rounded-full bg-slate-700 px-2 py-1 font-semibold text-white">
                                                Admin note
                                              </span>
                                            ) : null}

                                            <span className="font-semibold text-text-primary">
                                              {message.sender_name ??
                                                message.sender_username ??
                                                "Unknown sender"}
                                            </span>

                                            {message.is_admin ? (
                                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-primary">
                                                Admin
                                              </span>
                                            ) : null}

                                            <span className="font-medium text-text-muted">
                                              {formatDate(message.created_at)}
                                            </span>
                                          </div>

                                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                                            {message.content}
                                          </p>
                                        </div>
                                      );
                                    })
                                  )}

                                  <div ref={threadBottomRef} />
                                </div>

                                {dispute.status !== "resolved" &&
                                dispute.status !== "rejected" ? (
                                  <div className="border-t border-slate-100 px-5 py-4">
                                    <div className="mb-3 flex flex-wrap gap-2">
                                      {(["info_request", "admin_note"] as const).map(
                                        (type) => (
                                          <button
                                            key={type}
                                            type="button"
                                            onClick={() => setAdminMsgType(type)}
                                            className={cn(
                                              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                                              adminMsgType === type
                                                ? type === "info_request"
                                                  ? "bg-amber-500 text-white"
                                                  : "bg-slate-700 text-white"
                                                : "border border-slate-200 bg-white text-text-muted hover:bg-slate-50 hover:text-text-primary",
                                            )}
                                          >
                                            {type === "info_request"
                                              ? "Info request"
                                              : "Admin note"}
                                          </button>
                                        ),
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      <textarea
                                        value={adminMsgText}
                                        onChange={(event) =>
                                          setAdminMsgText(event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === "Enter" &&
                                            !event.shiftKey
                                          ) {
                                            event.preventDefault();
                                            handleAdminSend(dispute.id);
                                          }
                                        }}
                                        rows={3}
                                        placeholder={
                                          adminMsgType === "info_request"
                                            ? "Ask for more details from the people involved..."
                                            : "Add an internal admin note..."
                                        }
                                        className={cn(
                                          inputClass,
                                          "min-h-[104px] resize-none",
                                        )}
                                      />

                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdminSend(dispute.id)
                                          }
                                          disabled={
                                            !adminMsgText.trim() || adminSending
                                          }
                                          className={primaryButtonClass}
                                        >
                                          {adminSending
                                            ? "Sending..."
                                            : "Send message"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              {dispute.status !== "resolved" &&
                              dispute.status !== "rejected" ? (
                                <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                                  <h3 className="text-sm font-semibold text-text-primary">
                                    Actions
                                  </h3>

                                  <p className={cn("mt-1", ADMIN_TYPE.meta)}>
                                    Keep the workflow unchanged while presenting
                                    the controls in the updated theme.
                                  </p>

                                  <div className="mt-4 flex flex-col gap-3">
                                    {dispute.status === "open" ? (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() =>
                                          handleMarkReviewing(dispute)
                                        }
                                        className={secondaryButtonClass}
                                      >
                                        <HiClock className="h-4 w-4" />
                                        {isBusy
                                          ? "Updating status..."
                                          : "Move to reviewing"}
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => setResolveTarget(dispute)}
                                      className={primaryButtonClass}
                                    >
                                      <HiCheckCircle className="h-4 w-4" />
                                      Resolve dispute
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {resolveTarget ? (
        <ResolveModal
          dispute={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onConfirm={handleResolve}
        />
      ) : null}
    </>
  );
}