import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  Send,
  type LucideIcon,
} from "lucide-react";

import { getJob, getMyProposals, withdrawProposal } from "@/services/jobs.service";
import { authService } from "@/services/auth.service";
import { chatService } from "@/services/chat.service";
import type { Proposal } from "@/types";
import DataTable from "@/components/projects/DataTable";
import StatusDropdown from "@/components/projects/StatusDropdown";
import FreelancerKycGate from "@/components/jobs/FreelancerKycGate";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { formatDbDate } from "@/utils/date";

const STATUS_STYLE: Record<string, string> = {
  pending: "border-amber-100 bg-amber-50/90 text-amber-700",
  accepted: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
  rejected: "border-rose-100 bg-rose-50/90 text-rose-600",
  withdrawn: "border-slate-200 bg-slate-100 text-slate-500",
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
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
          <Icon className="h-7 w-7" />
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

export default function MyProposalsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [offers, setOffers] = useState<Proposal[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Proposal["status"][]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [jobTitleMap, setJobTitleMap] = useState<Record<string, string>>({});
  const [dealRoomByProposalId, setDealRoomByProposalId] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    setAccessLoading(true);
    authService
      .getCurrentUser()
      .then((user) => {
        if (!alive) return;
        setKycStatus(user.kyc_status ?? "");
      })
      .catch(() => {
        if (!alive) return;
        setKycStatus("");
      })
      .finally(() => {
        if (!alive) return;
        setAccessLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const normalizedKycStatus = (kycStatus ?? "").trim().toLowerCase();
  const canAccessMyProposals =
    normalizedKycStatus === "verified" || normalizedKycStatus === "approved";

  useEffect(() => {
    if (!canAccessMyProposals) {
      setLoading(false);
      setOffers([]);
      return;
    }
    getMyProposals()
      .then((res) => setOffers(res.data))
      .catch(() => setError(t("jobs.myProposals.error.loadFailed")))
      .finally(() => setLoading(false));
  }, [canAccessMyProposals, t]);

  useEffect(() => {
    const jobIds = Array.from(
      new Set(offers.map((o) => o.job_id).filter(Boolean) as string[])
    ).filter((id) => !jobTitleMap[id]);

    if (jobIds.length === 0) return;

    let alive = true;
    Promise.allSettled(jobIds.map((id) => getJob(id)))
      .then((results) => {
        if (!alive) return;
        const patch: Record<string, string> = {};
        for (let i = 0; i < results.length; i += 1) {
          const result = results[i];
          const id = jobIds[i];
          if (!id) continue;
          if (result.status === "fulfilled") {
            patch[id] = result.value.data.title || id;
          } else {
            patch[id] = id;
          }
        }
        if (Object.keys(patch).length > 0) {
          setJobTitleMap((prev) => ({ ...prev, ...patch }));
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [offers, jobTitleMap]);

  const handleWithdraw = async (offer: Proposal) => {
    if (offer.status !== "pending") return;
    if (!confirm(t("jobs.myProposals.confirmWithdraw"))) {
      return;
    }
    try {
      const res = await withdrawProposal(offer.id);
      setOffers((prev) =>
        prev.map((item) => (item.id === res.data.id ? res.data : item))
      );
    } catch {
      setError(t("jobs.myProposals.error.withdrawFailed"));
    }
  };

  const ensureDealRoomMap = async () => {
    if (Object.keys(dealRoomByProposalId).length > 0) return dealRoomByProposalId;
    const rooms = await chatService.getRooms();
    const mapped = rooms.reduce<Record<string, string>>((acc, room) => {
      if (room.room_type === "deal" && room.proposal_id) {
        acc[String(room.proposal_id)] = room.id;
      }
      return acc;
    }, {});
    setDealRoomByProposalId(mapped);
    return mapped;
  };

  const handleOpenDealChat = async (offer: Proposal) => {
    if (offer.status !== "accepted") return;
    try {
      const mapping = await ensureDealRoomMap();
      const roomId = mapping[offer.id];
      if (!roomId) {
        setError(t("jobs.myProposals.error.dealChatNotFound"));
        return;
      }
      navigate(`/app/messages?roomId=${roomId}`);
    } catch {
      setError(t("jobs.myProposals.error.openDealChatFailed"));
    }
  };

  if (accessLoading) {
    return (
      <div className="p-8 text-center text-sm text-text-muted animate-pulse">
        {t("loading")}
      </div>
    );
  }

  if (!canAccessMyProposals) {
    const isUnderReview =
      normalizedKycStatus === "under_review" ||
      normalizedKycStatus === "pending" ||
      normalizedKycStatus === "in_review";
    const ctaLabel = isUnderReview
      ? t("jobs.myProposals.locked.ctaUnderReview")
      : t("jobs.myProposals.locked.ctaDefault");
    const ctaPath = isUnderReview ? "/app/kyc/status" : "/app/kyc";

    return (
      <FreelancerKycGate
        alt={t("jobs.myProposals.locked.alt")}
        title={t("jobs.myProposals.locked.title")}
        subtitle={t("jobs.myProposals.locked.subtitle")}
        ctaLabel={ctaLabel}
        onCta={() => navigate(ctaPath)}
        buttonVariant={isUnderReview ? "secondary" : "primary"}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-text-muted animate-pulse">
        {t("loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  const sortedOffers = [...offers].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );
  const filteredOffers = sortedOffers.filter((offer) => {
    const q = search.trim().toLowerCase();
    const byStatus =
      statusFilter.length === 0 || statusFilter.includes(offer.status);
    const byText =
      !q ||
      (offer.job_id ?? "").toLowerCase().includes(q) ||
      (offer.message ?? "").toLowerCase().includes(q);
    return byStatus && byText;
  });

  const stats = {
    total: offers.length,
    pending: offers.filter((o) => o.status === "pending").length,
    accepted: offers.filter((o) => o.status === "accepted").length,
    rejected: offers.filter((o) => o.status === "rejected").length,
  };

  const pagedOffers = filteredOffers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative flex flex-col gap-7">
          <div className="relative pb-3 pt-2">
            {offers.length > 0 ? (
              <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
                <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
                <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]">
                  {t("jobs.myProposals.title")}
                </h1>
                <p className="mt-2 text-base font-medium text-text-secondary">
                  {t("jobs.myProposals.subtitle")}
                </p>
              </div>

              {offers.length > 0 ? (
                <Button
                  className="h-12 rounded-[14px] px-5 shadow-[0_14px_28px_rgba(37,99,235,0.22)]"
                  onClick={() => navigate("/app/explore/jobs")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("jobs.myProposals.empty.cta")}
                </Button>
              ) : null}
            </div>
          </div>

          {offers.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-10">
              <EmptyState
                illustrationSrc="/images/empty-projects.png"
                illustrationAlt={t("jobs.myProposals.title")}
                title={t("jobs.myProposals.empty.title", {
                  defaultValue: "No proposals yet",
                })}
                description={t("jobs.myProposals.empty.prefix", {
                  defaultValue:
                    "Start exploring open jobs and send your first proposal.",
                })}
                className="min-h-[480px] py-4"
                imageClassName="mx-auto w-full max-w-[420px] opacity-95"
                titleClassName="text-[1.8rem] font-semibold text-slate-900"
                descriptionClassName="max-w-md text-[0.95rem] leading-7 text-slate-500"
                action={
                  <Button
                    className="mt-2 h-12 rounded-[14px] px-5 shadow-[0_14px_28px_rgba(37,99,235,0.22)]"
                    onClick={() => navigate("/app/explore/jobs")}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t("jobs.myProposals.empty.cta")}
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <StatusDropdown<Proposal["status"]>
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "pending",
                      label: t("jobs.myProposals.status.pending"),
                    },
                    {
                      value: "accepted",
                      label: t("jobs.myProposals.status.accepted"),
                    },
                    {
                      value: "rejected",
                      label: t("jobs.myProposals.status.rejected"),
                    },
                    {
                      value: "withdrawn",
                      label: t("jobs.myProposals.status.withdrawn"),
                    },
                  ]}
                  triggerClassName="h-12 rounded-[16px] border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-slate-50"
                  panelClassName="rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.10)]"
                />

                <label className="relative block w-full max-w-[320px]">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("jobs.myProposals.searchPlaceholder")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-12 w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <DataTable<Proposal>
                data={pagedOffers}
                rowKey={(row) => row.id}
                page={page}
                pageSize={pageSize}
                total={filteredOffers.length}
                loading={loading}
                emptyState={{
                  title: t("jobs.myProposals.noFilterResult"),
                  subtitle: t("project.empty.subtitle", {
                    defaultValue: "Try changing filters or search keyword",
                  }),
                }}
                containerClassName="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                tableClassName="min-w-[1080px]"
                headerClassName="bg-white text-slate-500"
                headerCellClassName="px-7 py-5 text-[11px] font-semibold tracking-[0.16em] text-slate-500"
                rowClassName="hover:bg-slate-50/70"
                cellClassName="px-7 py-6"
                footerClassName="border-slate-100 px-7 py-4"
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                onRowClick={(row) => {
                  if (!row.job_id) return;
                  navigate(`/app/jobs/${row.job_id}`);
                }}
                columns={[
                  {
                    header: t("jobs.myProposals.table.project"),
                    width: "30%",
                    render: (p) => (
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!p.job_id) return;
                            navigate(`/app/jobs/${p.job_id}`);
                          }}
                          className="truncate text-left text-lg font-semibold text-blue-700 hover:underline"
                        >
                          {p.job_id
                            ? jobTitleMap[p.job_id] ??
                              t("jobs.myProposals.loadingProject")
                            : t("jobs.myProposals.unknownProject")}
                        </button>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatDbDate(p.created_at)}
                        </p>
                        {p.message ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                            {p.message}
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("jobs.myProposals.table.status")}
                      </span>
                    ),
                    width: "14%",
                    render: (p) => {
                      const cls =
                        STATUS_STYLE[p.status] ??
                        "border-slate-200 bg-slate-100 text-slate-500";
                      return (
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold ${cls}`}
                          >
                            {t(`jobs.myProposals.status.${p.status}`, {
                              defaultValue: p.status,
                            })}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("jobs.myProposals.table.budget")}
                      </span>
                    ),
                    width: "12%",
                    render: (p) => (
                      <span className="block text-center text-base font-semibold text-slate-800">
                        {p.proposed_budget
                          ? `\u0e3f${Number(p.proposed_budget).toLocaleString()}`
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("jobs.myProposals.table.hint")}
                      </span>
                    ),
                    width: "24%",
                    render: (p) => (
                      <span className="block text-center text-sm leading-7 text-slate-500">
                        {p.status === "pending"
                          ? t("jobs.myProposals.pendingHint")
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("jobs.myProposals.table.actions")}
                      </span>
                    ),
                    width: "20%",
                    render: (p) => (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {p.status === "pending" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWithdraw(p);
                            }}
                            className="rounded-[12px] border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            {t("jobs.myProposals.actions.withdraw")}
                          </button>
                        ) : null}
                        {p.job_id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/jobs/${p.job_id}`);
                            }}
                            className="rounded-[12px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            {t("jobs.myProposals.actions.viewJob")}
                          </button>
                        ) : null}
                        {p.status === "accepted" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenDealChat(p);
                            }}
                            className="rounded-[12px] border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            {t("jobs.myProposals.actions.chatDeal")}
                          </button>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
              />

              <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-3">
                <SummaryCard
                  icon={FileText}
                  label={t("jobs.myProposals.stats.total")}
                  value={stats.total.toLocaleString()}
                  sub={t("jobs.myProposals.subtitle")}
                />
                <SummaryCard
                  icon={Clock3}
                  label={t("jobs.myProposals.stats.pending")}
                  value={stats.pending.toLocaleString()}
                  sub={t("jobs.myProposals.stats.pendingSub", {
                    defaultValue: "Waiting for employer response",
                  })}
                />
                <SummaryCard
                  icon={CheckCircle2}
                  label={t("jobs.myProposals.stats.accepted")}
                  value={stats.accepted.toLocaleString()}
                  sub={t("jobs.myProposals.stats.acceptedSub", {
                    defaultValue: "Accepted proposals",
                  })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
