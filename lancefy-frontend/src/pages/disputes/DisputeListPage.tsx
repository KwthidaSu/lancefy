import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  RefreshCw,
  Scale,
  Search,
  XCircle,
} from "lucide-react";

import { listMyDisputes, type DisputeResponse } from "@/services/dispute.service";

const STATUS_CFG: Record<
  string,
  { label: string; badge: string; icon: ReactNode }
> = {
  open: {
    label: "Open",
    badge: "border-amber-100 bg-amber-50/90 text-amber-700",
    icon: <Scale className="h-3 w-3" />,
  },
  reviewing: {
    label: "Reviewing",
    badge: "border-blue-100 bg-blue-50/90 text-blue-700",
    icon: <Eye className="h-3 w-3" />,
  },
  resolved: {
    label: "Resolved",
    badge: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    badge: "border-rose-100 bg-rose-50/90 text-rose-700",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const REASON_LABELS: Record<string, string> = {
  work_not_as_described: "Work not as described",
  work_incomplete: "Work is incomplete",
  work_poor_quality: "Work quality is too low",
  freelancer_unresponsive: "Freelancer is unresponsive",
  missed_deadline: "Missed deadline",
  scope_changed: "Client changed scope",
  client_unresponsive: "Client is unresponsive",
  unfair_rejection: "Unfair rejection",
  cancellation_dispute: "Project cancellation dispute",
  payment_not_released: "Payment not released",
  other: "Other",
};

const RESOLUTION_LABELS: Record<string, string> = {
  release: "Release payment",
  refund: "Refund client",
  extend_deadline: "Extend deadline",
  force_approve: "Force approve",
  terminate_project: "Terminate project",
  rejected: "Rejected",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>
      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-text-primary">
            {value}
          </div>
          <div className="mt-3 text-sm text-slate-500">{sub}</div>
        </div>
      </div>
    </div>
  );
}

export default function DisputeListPage() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<DisputeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] =
    useState<"all" | "open" | "reviewing" | "resolved">("all");
  const [search, setSearch] = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await listMyDisputes();
      setDisputes(res.data);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const displayed = disputes.filter((dispute) => {
    const matchesFilter =
      filter === "all" ? true : dispute.status === filter;

    const query = search.trim().toLowerCase();
    const reason = REASON_LABELS[dispute.reason] ?? dispute.reason;
    const project = dispute.project_title ?? dispute.project_id;
    const milestone = dispute.milestone_title ?? "";

    const matchesSearch =
      !query ||
      reason.toLowerCase().includes(query) ||
      project.toLowerCase().includes(query) ||
      milestone.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const stats = {
    open: disputes.filter((d) => d.status === "open").length,
    reviewing: disputes.filter((d) => d.status === "reviewing").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
  };

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative flex flex-col gap-7">
          <div className="relative pb-3 pt-2">
            <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
              <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
              <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]">
                  My Disputes
                </h1>
                <p className="mt-2 text-base font-medium text-text-secondary">
                  Track the disputes you are involved in
                </p>
              </div>

              <button
                onClick={() => void load(true)}
                disabled={refreshing || loading}
                className="inline-flex h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              label="Open"
              value={loading ? "-" : String(stats.open)}
              sub="Waiting for action"
              icon={<Scale className="h-7 w-7" />}
            />
            <SummaryCard
              label="Reviewing"
              value={loading ? "-" : String(stats.reviewing)}
              sub="Under review"
              icon={<Eye className="h-7 w-7" />}
            />
            <SummaryCard
              label="Resolved"
              value={loading ? "-" : String(stats.resolved)}
              sub="Completed decisions"
              icon={<CheckCircle2 className="h-7 w-7" />}
            />
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "open", "reviewing", "resolved"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-[14px] border px-4 py-2 text-sm font-semibold transition ${
                    filter === status
                      ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]"
                      : "border-slate-200 bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-slate-50"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status === "open"
                      ? `Open (${stats.open})`
                      : status === "reviewing"
                        ? `Reviewing (${stats.reviewing})`
                        : `Resolved (${stats.resolved})`}
                </button>
              ))}
            </div>

            <label className="relative block w-full max-w-[320px]">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search disputes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {loading ? (
            <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 rounded-[18px] border border-slate-100 bg-slate-50/60 animate-pulse"
                />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white px-7 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-400">
                <Scale className="h-7 w-7" />
              </div>
              <div className="mt-4 text-lg font-semibold text-text-primary">
                No disputes found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                If an issue comes up in a project, it will appear here.
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="divide-y divide-slate-100">
                {displayed.map((dispute) => {
                  const cfg = STATUS_CFG[dispute.status] ?? STATUS_CFG.open;
                  return (
                    <button
                      key={dispute.id}
                      onClick={() => navigate(`/app/disputes/${dispute.id}`)}
                      className="flex w-full items-center gap-4 px-7 py-5 text-left transition hover:bg-slate-50/70"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-blue-50 text-blue-600">
                        <Scale className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badge}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          {dispute.resolution ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                              {RESOLUTION_LABELS[dispute.resolution] ?? dispute.resolution}
                            </span>
                          ) : null}
                        </div>

                        <div className="truncate text-lg font-semibold text-text-primary">
                          {dispute.project_title ??
                            `Project #${dispute.project_id.slice(0, 8)}`}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                          <span>{REASON_LABELS[dispute.reason] ?? dispute.reason}</span>
                          {dispute.milestone_title ? (
                            <span>{`• ${dispute.milestone_title}`}</span>
                          ) : null}
                          <span>{`• ${formatDate(dispute.created_at)}`}</span>
                        </div>
                      </div>

                      <div className="hidden shrink-0 text-sm text-slate-500 lg:block">
                        {(dispute.evidences?.length ?? 0) > 0
                          ? `${dispute.evidences.length} evidence`
                          : "No files"}
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
