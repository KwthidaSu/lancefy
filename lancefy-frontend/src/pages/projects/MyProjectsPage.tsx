import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
  FolderKanban,
  Plus,
  Search,
} from "lucide-react";

import DataTable from "@/components/projects/DataTable";
import StatusDropdown from "@/components/projects/StatusDropdown";
import Button from "@/components/ui/Button";
import EmptyProjectsState from "@/components/projects/EmptyProjectsState";
import Skeleton from "react-loading-skeleton";

import { fetchMyProjects } from "@/services/projects/project";
import type {
  Project,
  ProjectStatus,
} from "@/services/projects/project.types";

import { formatDbDate } from "@/utils/date";
import { sanitizeHtml, htmlToText } from "@/utils/html";

type SortValue = "created_desc" | "created_asc";
type ProjectRow = Project;
type CanonicalProjectStatus =
  | "open"
  | "expired"
  | "active"
  | "completed"
  | "cancelled";

const statusBadgeClass = (status: ProjectStatus) => {
  const normalized = toCanonicalStatus(String(status || ""));
  if (normalized === "open") return "border-blue-100 bg-blue-50/80 text-blue-700";
  if (normalized === "expired") return "border-amber-100 bg-amber-50/90 text-amber-700";
  if (normalized === "active") return "border-indigo-100 bg-indigo-50/90 text-indigo-700";
  if (normalized === "completed") return "border-emerald-100 bg-emerald-50/90 text-emerald-700";
  if (normalized === "cancelled") return "border-rose-100 bg-rose-50/90 text-rose-600";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const progressForStatus = (status: ProjectStatus) => {
  if (toCanonicalStatus(String(status || "")) === "completed") return 100;
  return 0;
};

const statusLabel = (
  status: ProjectStatus,
  t: (key: string, options?: { defaultValue?: string }) => string
) => {
  const fallbackMap: Record<string, string> = {
    draft: "Draft",
    open: "Open",
    expired: "Expired",
    active: "Active",
    complete: "Completed",
    completed: "Completed",
    closed: "Closed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };
  return t(`project.status.${status}`, { defaultValue: fallbackMap[status] ?? status });
};

const projectBudget = (p: Project) => {
  const v = (p.budget ?? p.total_budget ?? 0) as number | string | null | undefined;
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const projectCurrency = (p: Project) => p.currency || "THB";

const projectAssigneeName = (p: Project) => {
  if (p.assignee) {
    const a = p.assignee;
    return a.firstname || a.lastname
      ? `${a.firstname ?? ""} ${a.lastname ?? ""}`.trim()
      : a.username || a.email || "";
  }
  if (p.freelancer) {
    return p.freelancer.display_name || p.freelancer.username || "";
  }
  return "";
};

const projectCreatedAt = (p: Project) => p.created_at || p.started_at || "";

const toCanonicalStatus = (status: string): CanonicalProjectStatus => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "complete" || normalized === "completed" || normalized === "closed") return "completed";
  if (normalized === "cancel" || normalized === "cancelled" || normalized === "disputed") return "cancelled";
  if (normalized === "draft") return "open";
  if (normalized === "expired") return "expired";
  if (normalized === "active") return "active";
  return "open";
};

const isViewProjectStatus = (status: string) => {
  const canonical = toCanonicalStatus(status);
  return canonical === "active" || canonical === "cancelled" || canonical === "completed";
};

const isViewJobStatus = (status: string) => {
  const canonical = toCanonicalStatus(status);
  return canonical === "open" || canonical === "expired";
};

const rowDetailPath = (row: ProjectRow) => {
  const status = String(row.status || "").toLowerCase();
  if (isViewProjectStatus(status)) {
    return `/app/projects/${row.id}`;
  }
  if (isViewJobStatus(status) && row.job_id) {
    return `/app/jobs/${row.job_id}`;
  }
  if (row.job_id && !isViewProjectStatus(status)) return `/app/jobs/${row.job_id}`;
  return `/app/projects/${row.id}`;
};

const rowDetailLabel = (
  row: ProjectRow,
  t: (key: string, options?: { defaultValue?: string }) => string
) => {
  return isViewProjectStatus(String(row.status || ""))
    ? t("project.table.viewProject", { defaultValue: "View Project" })
    : t("project.table.viewJob", { defaultValue: "View Job" });
};

const extractProjectList = (payload: unknown): Project[] => {
  if (Array.isArray(payload)) return payload as Project[];
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Project[];

  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as Project[];
    if (Array.isArray(nested.items)) return nested.items as Project[];
  }

  if (Array.isArray(root.items)) return root.items as Project[];
  return [];
};

const extractTotalCount = (
  payload: unknown,
  fallbackLength: number
) => {
  if (!payload || typeof payload !== "object") return fallbackLength;

  const root = payload as Record<string, unknown>;
  const directTotal = Number(root.total);
  if (Number.isFinite(directTotal)) return directTotal;

  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    const nestedTotal = Number(nested.total);
    if (Number.isFinite(nestedTotal)) return nestedTotal;
  }

  return fallbackLength;
};

const projectStatusRank = (status: string) => {
  const canonical = toCanonicalStatus(status);
  if (canonical === "active") return 5;
  if (canonical === "cancelled") return 4;
  if (canonical === "completed") return 3;
  if (canonical === "expired") return 2;
  if (canonical === "open") return 1;
  return 0;
};

const dedupeRows = (rows: ProjectRow[]) => {
  const byKey = new Map<string, ProjectRow>();
  for (const row of rows) {
    const key = row.job_id || row.id;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    const prevRank = projectStatusRank(String(prev.status || ""));
    const nextRank = projectStatusRank(String(row.status || ""));
    if (nextRank > prevRank) {
      byKey.set(key, row);
      continue;
    }
    if (nextRank === prevRank) {
      const prevTime = new Date(projectCreatedAt(prev)).getTime() || 0;
      const nextTime = new Date(projectCreatedAt(row)).getTime() || 0;
      if (nextTime > prevTime) {
        byKey.set(key, row);
      }
    }
  }
  return Array.from(byKey.values());
};

const filterRows = (
  rows: ProjectRow[],
  statusFilter: ProjectStatus[],
  search: string
) => {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter.length > 0) {
      const rowStatus = toCanonicalStatus(String(row.status || ""));
      const selected = statusFilter.map((s) => toCanonicalStatus(String(s || "")));
      if (!selected.includes(rowStatus)) {
        return false;
      }
    }
    if (!q) return true;
    if (!row.title) {
      return false;
    }
    return (
      row.title.toLowerCase().includes(q) ||
      (row.description ?? "").toLowerCase().includes(q)
    );
  });
};

export default function MyProjectsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([]);
  const [sort, setSort] = useState<SortValue>("created_desc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [allRows, setAllRows] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [hasAnyProject, setHasAnyProject] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const fetchAllProjects = async (): Promise<Project[]> => {
      const pageSizeForFetch = 100;
      let currentPage = 1;
      let expectedTotal = 0;
      const all: Project[] = [];
      let hasMore = true;

      while (hasMore) {
        const res = await fetchMyProjects({
          page: currentPage,
          pageSize: pageSizeForFetch,
          role: "owner",
          search: debouncedSearch,
        });
        const payload = res.data;
        const items = extractProjectList(payload);
        expectedTotal = extractTotalCount(payload, items.length);
        all.push(...items);

        const reachedEnd =
          items.length === 0 ||
          all.length >= expectedTotal ||
          currentPage >= Math.ceil(expectedTotal / pageSizeForFetch);
        hasMore = !reachedEnd;
        if (!hasMore) break;

        currentPage += 1;
      }

      return all;
    };

    Promise.allSettled([fetchAllProjects()])
      .then(([projectsRes]) => {
        if (!alive) return;

        const backendProjects =
          projectsRes.status === "fulfilled"
            ? projectsRes.value
            : [];
        const backendRows: ProjectRow[] = backendProjects.map((p) => ({ ...p }));

        const combined = filterRows(
          dedupeRows(backendRows),
          statusFilter,
          debouncedSearch
        ).sort((a, b) => {
          const ta = new Date(projectCreatedAt(a)).getTime();
          const tb = new Date(projectCreatedAt(b)).getTime();
          return sort === "created_asc" ? ta - tb : tb - ta;
        });

        setAllRows(combined);
        setHasAnyProject(combined.length > 0);

        const active = combined.filter(
          (p) =>
            toCanonicalStatus(String(p.status || "")) === "active" ||
            toCanonicalStatus(String(p.status || "")) === "open"
        ).length;
        const completed = combined.filter(
          (p) => toCanonicalStatus(String(p.status || "")) === "completed"
        ).length;
        setActiveCount(active);
        setCompletedCount(completed);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setInitialized(true);
      });

    return () => {
      alive = false;
    };
  }, [statusFilter, sort, debouncedSearch]);

  useEffect(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    setProjects(allRows.slice(start, end));
    setTotal(allRows.length);
  }, [allRows, page, pageSize]);

  if (!initialized) {
    return null;
  }

  const isFirstEmpty = !loading && !hasAnyProject;

  const toggleCreatedSort = () => {
    setSort((prev) =>
      prev === "created_desc"
        ? "created_asc"
        : "created_desc"
    );
    setPage(1);
  };

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <>
          <div className="relative pb-3 pt-2">
            {!isFirstEmpty ? (
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
            ) : null}

            <div className="relative flex flex-col gap-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]">
                    {t("project.title")}
                  </h1>
                  <p className="mt-2 text-base font-medium text-text-secondary">
                    {t("project.subtitle")}
                  </p>
                </div>

                {!isFirstEmpty ? (
                  <Button
                    className="h-12 rounded-[14px] px-5 shadow-[0_14px_28px_rgba(37,99,235,0.22)]"
                    onClick={() =>
                      navigate("/app/projects/create")
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("project.create")}
                  </Button>
                ) : null}
              </div>

              {!isFirstEmpty ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <StatusDropdown
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                    triggerClassName="h-12 rounded-[16px] border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-slate-50"
                    panelClassName="mt-3 rounded-2xl border-slate-200 p-1 shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
                    options={[
                      {
                        value: "open",
                        label: statusLabel("open", t),
                      },
                      {
                        value: "expired",
                        label: statusLabel("expired", t),
                      },
                      {
                        value: "active",
                        label: statusLabel("active", t),
                      },
                      {
                        value: "cancelled",
                        label: statusLabel("cancelled", t),
                      },
                      {
                        value: "completed",
                        label: statusLabel("completed", t),
                      },
                    ]}
                  />

                  <label className="relative block w-full lg:w-[320px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t(
                        "project.searchPlaceholder",
                        { defaultValue: "Search projects..." }
                      )}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="h-12 w-full rounded-[16px] border border-slate-200 bg-white pl-12 pr-5 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-200"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          {isFirstEmpty ? (
            <EmptyProjectsState
              onCreate={() =>
                navigate("/app/projects/create")
              }
            />
          ) : (
            <>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <Skeleton count={5} height={42} />
                </div>
              ) : (
                <DataTable<ProjectRow>
                  data={projects}
                  rowKey={(row) => row.id}
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  loading={loading}
                  emptyState={{
                    title: t("project.empty.title", { defaultValue: "No projects found" }),
                    subtitle: t("project.empty.subtitle", { defaultValue: "Try changing filters or search keyword" }),
                  }}
                  containerClassName="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                  tableClassName="min-w-[980px]"
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
                    navigate(rowDetailPath(row))
                  }
                  columns={[
                  {
                    header: t("project.table.project"),
                    width: "34%",
                    render: (p) => {
                      const safeDescription = sanitizeHtml(p.description ?? "");
                      const descriptionText = htmlToText(safeDescription);
                      return (
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-blue-700">
                            {p.title}
                          </div>
                          {descriptionText ? (
                            <div
                              className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500 [&_ol]:m-0 [&_p]:m-0 [&_ul]:m-0"
                              dangerouslySetInnerHTML={{ __html: safeDescription }}
                            />
                          ) : (
                            <div className="mt-2 line-clamp-2 text-sm leading-7 text-slate-400">
                              {t("common.notSpecified")}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("project.table.freelancer", { defaultValue: "Freelancer" })}
                      </span>
                    ),
                    width: "14%",
                    render: (p) => {
                      const name = projectAssigneeName(p);
                      const initials = name
                        ? name.charAt(0).toUpperCase()
                        : "-";

                      if (!name) {
                        return (
                          <div className="flex items-center justify-center text-center text-sm text-slate-500">
                            {t("project.table.notAssigned", { defaultValue: "Not assigned" })}
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-row items-center justify-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {initials}
                          </div>
                          <div className="flex items-center justify-center truncate text-sm font-medium text-slate-700">
                            {name}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("project.table.category", { defaultValue: "Category" })}
                      </span>
                    ),
                    width: "10%",
                    render: (p) => (
                      <span className="block text-center text-sm text-slate-600">
                        {p.categories?.[0]?.label || "-"}
                      </span>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("project.table.status")}
                      </span>
                    ),
                    width: "10%",
                    render: (p) => (
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold ${statusBadgeClass(p.status)}`}
                        >
                          {statusLabel(toCanonicalStatus(String(p.status || "")), t)}
                        </span>
                      </div>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("project.table.budget", { defaultValue: "Budget" })}
                      </span>
                    ),
                    width: "10%",
                    render: (p) => (
                      <span className="block text-center text-base font-semibold text-slate-800">
                        {projectBudget(p).toLocaleString()} {projectCurrency(p)}
                      </span>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("project.table.progress", { defaultValue: "Progress" })}
                      </span>
                    ),
                    width: "12%",
                    render: (p) => {
                      const progress =
                        typeof p.progress_percent === "number"
                          ? Math.max(0, Math.min(100, Math.round(p.progress_percent)))
                          : progressForStatus(p.status);
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
                      <button
                        onClick={toggleCreatedSort}
                        className="mx-auto flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-800"
                      >
                        {t("project.table.created")}

                        <span className="flex flex-col leading-none">
                          <ChevronUp
                            className={`h-3 w-3 ${
                              sort === "created_asc"
                                ? "text-slate-700"
                                : "text-slate-300"
                            }`}
                          />
                          <ChevronDown
                            className={`-mt-1 h-3 w-3 ${
                              sort === "created_desc"
                                ? "text-slate-700"
                                : "text-slate-300"
                            }`}
                          />
                        </span>
                      </button>
                    ),
                    width: "15%",
                    render: (p) => (
                      <span className="block text-center text-slate-500">
                        {formatDbDate(projectCreatedAt(p), i18n.language)}
                      </span>
                    ),
                  },
                  {
                    header: (
                      <span className="block text-center">
                        {t("project.table.actions", { defaultValue: "Actions" })}
                      </span>
                    ),
                    width: "10%",
                    render: (p) => (
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(rowDetailPath(p));
                          }}
                          aria-label={rowDetailLabel(p, t)}
                          title={rowDetailLabel(p, t)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-100 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  },
                ]}
                />
              )}
            </div>

            {!loading && (
              <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
                  <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                    ))}
                  </div>
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
                      <FolderKanban className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-500">
                        {t("project.summary.total")}
                      </div>
                      <div className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-text-primary">
                        {total.toLocaleString()}
                      </div>
                      <div className="mt-3 text-sm text-slate-500">
                        {t("project.subtitle")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
                  <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                    ))}
                  </div>
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
                      <Activity className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-500">
                        {t("project.summary.active")}
                      </div>
                      <div className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-text-primary">
                        {activeCount.toLocaleString()}
                      </div>
                      <div className="mt-3 text-sm text-slate-500">
                        Projects in progress
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
                  <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                    ))}
                  </div>
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
                      <Flag className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-500">
                        {t("project.summary.completed")}
                      </div>
                      <div className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-text-primary">
                        {completedCount.toLocaleString()}
                      </div>
                      <div className="mt-3 text-sm text-slate-500">
                        Projects completed
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            )}
            </>
          )}
        </>
      </div>
    </div>
  );
}
