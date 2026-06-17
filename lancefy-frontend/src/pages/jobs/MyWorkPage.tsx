import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Eye,
  Flag,
  FolderKanban,
  Search,
  type LucideIcon,
} from "lucide-react";
import DataTable from "@/components/projects/DataTable";
import StatusDropdown from "@/components/projects/StatusDropdown";
import FreelancerKycGate from "@/components/jobs/FreelancerKycGate";
import { fetchMyWork, type MyWorkItem } from "@/services/projects/project";
import {
  getFreelancerProfile,
  type FreelancerProfile,
} from "@/services/freelancer.service";
import { authService } from "@/services/auth.service";
import { formatDbDate } from "@/utils/date";

type MyWorkStatus =
  | "in_progress"
  | "completed"
  | "cancelled"
  | "accepted"
  | "active"
  | "pending";

const assignmentStatusClass = (value?: string | null) => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "completed") {
    return "border-emerald-100 bg-emerald-50/90 text-emerald-700";
  }
  if (normalized === "cancelled") {
    return "border-rose-100 bg-rose-50/90 text-rose-600";
  }
  if (normalized === "pending") {
    return "border-amber-100 bg-amber-50/90 text-amber-700";
  }
  return "border-indigo-100 bg-indigo-50/90 text-indigo-700";
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

export default function MyWorkPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState<MyWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<MyWorkStatus[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [ownerProfiles, setOwnerProfiles] = useState<
    Record<string, FreelancerProfile>
  >({});
  const [resolvedOwnerIds, setResolvedOwnerIds] =
    useState<Record<string, true>>({});
  const [kycStatus, setKycStatus] =
    useState<string | null>(null);
  const [accessLoading, setAccessLoading] =
    useState(true);

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

  const normalizedKycStatus = (kycStatus ?? "")
    .trim()
    .toLowerCase();
  const canAccessMyWork =
    normalizedKycStatus === "verified" ||
    normalizedKycStatus === "approved";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!canAccessMyWork) {
      setLoading(false);
      setItems([]);
      setTotal(0);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetchMyWork({
      page,
      pageSize,
      status:
        statusFilter.length > 0
          ? statusFilter
          : undefined,
      search: debouncedSearch,
    })
      .then((res) => {
        if (!alive) return;
        setItems(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => {
        if (!alive) return;
        setError(t("common.error"));
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [
    canAccessMyWork,
    t,
    statusFilter,
    page,
    pageSize,
    debouncedSearch,
  ]);

  useEffect(() => {
    if (!canAccessMyWork) {
      setActiveCount(0);
      setCompletedCount(0);
      return;
    }
    let alive = true;
    const activeStatuses: MyWorkStatus[] = [
      "in_progress",
      "active",
      "accepted",
      "pending",
    ];
    const completedStatuses: MyWorkStatus[] = [
      "completed",
    ];

    const selectedStatuses =
      statusFilter.length > 0
        ? statusFilter
        : null;

    const activeQuery =
      selectedStatuses === null
        ? activeStatuses
        : selectedStatuses.filter((s) =>
            activeStatuses.includes(s)
          );
    const completedQuery =
      selectedStatuses === null
        ? completedStatuses
        : selectedStatuses.filter((s) =>
            completedStatuses.includes(s)
          );

    Promise.all([
      activeQuery.length === 0
        ? Promise.resolve(0)
        : fetchMyWork({
            page: 1,
            pageSize: 1,
            status: activeQuery,
            search: debouncedSearch,
          }).then((res) => res.data.total),
      completedQuery.length === 0
        ? Promise.resolve(0)
        : fetchMyWork({
            page: 1,
            pageSize: 1,
            status: completedQuery,
            search: debouncedSearch,
          }).then((res) => res.data.total),
    ])
      .then(([activeTotal, completedTotal]) => {
        if (!alive) return;
        setActiveCount(activeTotal);
        setCompletedCount(completedTotal);
      })
      .catch(() => {
        if (!alive) return;
        setActiveCount(0);
        setCompletedCount(0);
      });

    return () => {
      alive = false;
    };
  }, [canAccessMyWork, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!canAccessMyWork) return;
    let alive = true;
    const ownerIds = Array.from(
      new Set(
        items
          .map((item) => item.client_id || "")
          .filter(Boolean)
      )
    ).filter((id) => !resolvedOwnerIds[id]);

    if (ownerIds.length === 0) return () => {
      alive = false;
    };

    Promise.allSettled(
      ownerIds.map((id) =>
        getFreelancerProfile(id).then((res) => ({
          id,
          profile: res.data,
        }))
      )
    ).then((results) => {
      if (!alive) return;
      const patch: Record<string, FreelancerProfile> = {};
      const resolvedPatch: Record<string, true> = {};
      for (let i = 0; i < results.length; i += 1) {
        const r = results[i];
        const ownerId = ownerIds[i];
        if (!ownerId) continue;
        if (r.status === "fulfilled") {
          patch[r.value.id] = r.value.profile;
          resolvedPatch[r.value.id] = true;
        } else {
          resolvedPatch[ownerId] = true;
        }
      }
      if (Object.keys(patch).length > 0) {
        setOwnerProfiles((prev) => ({
          ...prev,
          ...patch,
        }));
      }
      if (Object.keys(resolvedPatch).length > 0) {
        setResolvedOwnerIds((prev) => ({
          ...prev,
          ...resolvedPatch,
        }));
      }
    });

    return () => {
      alive = false;
    };
  }, [canAccessMyWork, items, resolvedOwnerIds]);

  const assignmentStatusLabel = (value?: string | null) => {
    if (!value) return "-";
    return t(`jobs.myWork.status.${value}`, { defaultValue: value });
  };

  const projectOwnerDisplay = (item: MyWorkItem) => {
    const owner = item.client ?? item.owner;
    const name = owner
      ? `${owner.firstname ?? ""} ${owner.lastname ?? ""}`.trim() ||
        owner.username ||
        owner.email ||
        ""
      : "";
    if (name) return name;
    const profile =
      (item.client_id &&
        ownerProfiles[item.client_id]) ||
      null;
    const profileName = profile
      ? `${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim() ||
        profile.username ||
        ""
      : "";
    if (profileName) return profileName;
    if (item.client_id) {
      return `Client #${item.client_id.slice(0, 6)}`;
    }
    return t("project.table.notAssigned");
  };

  if (accessLoading) {
    return (
      <div className="p-6 text-sm text-text-muted">
        {t("loading")}
      </div>
    );
  }

  if (!canAccessMyWork) {
    const isUnderReview =
      normalizedKycStatus === "under_review" ||
      normalizedKycStatus === "pending" ||
      normalizedKycStatus === "in_review";
    const ctaLabel = isUnderReview
      ? t("jobs.myWork.locked.ctaUnderReview")
      : t("jobs.myWork.locked.ctaDefault");
    const ctaPath = isUnderReview
      ? "/app/kyc/status"
      : "/app/kyc";

    return (
      <FreelancerKycGate
        alt={t("jobs.myWork.locked.alt")}
        title={t("jobs.myWork.locked.title")}
        subtitle={t("jobs.myWork.locked.subtitle")}
        ctaLabel={ctaLabel}
        onCta={() => navigate(ctaPath)}
        buttonVariant={isUnderReview ? "secondary" : "primary"}
      />
    );
  }

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
                  <span
                    key={index}
                    className="h-1 w-1 rounded-full bg-blue-200"
                  />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col gap-6">
              <div>
                <h1 className="text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]">
                  {t("jobs.myWork.title")}
                </h1>
                <p className="mt-2 text-base font-medium text-text-secondary">
                  {t("jobs.myWork.subtitle")}
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <StatusDropdown<MyWorkStatus>
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "in_progress",
                      label: t("jobs.myWork.filter.inProgress"),
                    },
                    {
                      value: "completed",
                      label: t("jobs.myWork.filter.completed"),
                    },
                    {
                      value: "cancelled",
                      label: t("jobs.myWork.filter.cancelled"),
                    },
                  ]}
                  triggerClassName="h-12 rounded-[16px] border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-slate-50"
                  panelClassName="rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.10)]"
                />

                <label className="relative block w-full max-w-[320px]">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("jobs.myWork.searchPlaceholder")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-12 w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <DataTable<MyWorkItem>
            data={items}
            rowKey={(row) => row.assignment_id || row.project_id}
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            emptyState={{
              title: t("jobs.myWork.empty.title"),
              subtitle: t("project.empty.subtitle", {
                defaultValue: "Try changing filters or search keyword",
              }),
            }}
            containerClassName="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
            tableClassName="min-w-[960px]"
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
            onRowClick={(row) =>
              navigate(`/app/projects/${row.project_id}/manage`)
            }
            columns={[
              {
                header: t("jobs.myWork.table.project"),
                width: "30%",
                render: (p) => (
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-blue-700">
                      {p.title || t("jobs.myWork.defaultProject")}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-500">
                      {p.assigned_at
                        ? t("jobs.myWork.assignedOn", {
                            date: formatDbDate(p.assigned_at, i18n.language),
                          })
                        : t("jobs.myWork.startDateUnknown")}
                    </div>
                  </div>
                ),
              },
              {
                header: (
                  <span className="block text-center">
                    {t("jobs.myWork.table.owner")}
                  </span>
                ),
                width: "16%",
                render: (p) => {
                  const name = projectOwnerDisplay(p);
                  const initials = name
                    ? name.charAt(0).toUpperCase()
                    : "C";
                  return (
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {initials}
                      </div>
                      <div className="truncate text-sm font-medium text-slate-700">
                        {name}
                      </div>
                    </div>
                  );
                },
              },
              {
                header: (
                  <span className="block text-center">
                    {t("jobs.myWork.table.status")}
                  </span>
                ),
                width: "12%",
                render: (p) => (
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold ${assignmentStatusClass(
                        p.assignment_status
                      )}`}
                    >
                      {assignmentStatusLabel(p.assignment_status)}
                    </span>
                  </div>
                ),
              },
              {
                header: (
                  <span className="block text-center">
                    {t("jobs.myWork.table.budget")}
                  </span>
                ),
                width: "12%",
                render: (p) => (
                  <span className="block text-center text-base font-semibold text-slate-800">
                    {p.budget?.toLocaleString?.() ?? p.budget ?? "-"}{" "}
                    {p.currency ?? ""}
                  </span>
                ),
              },
              {
                header: (
                  <span className="block text-center">
                    {t("jobs.myWork.table.progress")}
                  </span>
                ),
                width: "12%",
                render: (p) => {
                  const progress =
                    typeof p.progress_percent === "number"
                      ? Math.max(
                          0,
                          Math.min(100, Math.round(p.progress_percent))
                        )
                      : 0;
                  return (
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-2.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#1d4ed8)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {progress}%
                      </span>
                    </div>
                  );
                },
              },
              {
                header: (
                  <span className="block text-center">
                    {t("jobs.myWork.table.assigned")}
                  </span>
                ),
                width: "10%",
                render: (p) => (
                  <span className="block text-center text-slate-500">
                    {p.assigned_at
                      ? formatDbDate(p.assigned_at, i18n.language)
                      : "-"}
                  </span>
                ),
              },
              {
                header: (
                  <span className="block text-center">
                    {t("jobs.myWork.table.actions")}
                  </span>
                ),
                width: "8%",
                render: (p) => (
                  <div className="flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/projects/${p.project_id}/manage`);
                      }}
                      aria-label={t("project.table.viewDetail", {
                        defaultValue: "View Detail",
                      })}
                      title={t("project.table.viewDetail", {
                        defaultValue: "View Detail",
                      })}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-100 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <SummaryCard
              icon={FolderKanban}
              label={t("jobs.myWork.summary.total")}
              value={total.toLocaleString()}
              sub={t("jobs.myWork.subtitle")}
            />
            <SummaryCard
              icon={Activity}
              label={t("jobs.myWork.summary.active")}
              value={activeCount.toLocaleString()}
              sub={t("jobs.myWork.summary.activeSub", {
                defaultValue: "Projects in progress",
              })}
            />
            <SummaryCard
              icon={Flag}
              label={t("jobs.myWork.summary.completed")}
              value={completedCount.toLocaleString()}
              sub={t("jobs.myWork.summary.completedSub", {
                defaultValue: "Completed assignments",
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
