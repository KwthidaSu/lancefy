import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Briefcase,
  Clock,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  CalendarDays,
  Layers,
  ImageOff,
  PlusCircle,
  AlertCircle,
  Tag,
  User,
} from "lucide-react";
import { clsx } from "clsx";

import { browseJobs, getMyJobs } from "@/services/jobs.service";
import { authService } from "@/services/auth.service";
import type { Job } from "@/types";
import Input from "@/components/ui/Input";
import { formatDbDate } from "@/utils/date";
import { listCategories, type CategoryResponse } from "@/services/skills.service";

/** Strip HTML tags for plain-text preview */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const SORT_OPTION_VALUES = [
  "published_desc",
  "published_asc",
  "budget_desc",
  "budget_asc",
  "deadline_asc",
] as const;

const PAGE_SIZE = 12;

const CATEGORY_LABEL_MAP: Record<string, string> = {
  "ui-ux": "UI / UX",
  branding: "Branding",
  "web-development": "Web Development",
  illustration: "Illustration",
  marketing: "Digital Marketing",
  photography: "Photography",
  "writing-translation": "Writing & Translation",
  "video-animation": "Video & Animation",
};

const CATEGORY_STYLE: Record<
  string,
  { chip: string; accent: string; bg: string }
> = {
  "ui-ux": {
    chip: "bg-blue-100 text-blue-700",
    accent: "bg-blue-500",
    bg: "from-blue-50",
  },
  branding: {
    chip: "bg-purple-100 text-purple-700",
    accent: "bg-purple-500",
    bg: "from-purple-50",
  },
  "web-development": {
    chip: "bg-lime-100 text-lime-700",
    accent: "bg-lime-500",
    bg: "from-lime-50",
  },
  illustration: {
    chip: "bg-orange-100 text-orange-700",
    accent: "bg-orange-500",
    bg: "from-orange-50",
  },
  marketing: {
    chip: "bg-rose-100 text-rose-700",
    accent: "bg-rose-500",
    bg: "from-rose-50",
  },
  photography: {
    chip: "bg-amber-100 text-amber-700",
    accent: "bg-amber-500",
    bg: "from-amber-50",
  },
  "writing-translation": {
    chip: "bg-teal-100 text-teal-700",
    accent: "bg-teal-500",
    bg: "from-teal-50",
  },
  "video-animation": {
    chip: "bg-indigo-100 text-indigo-700",
    accent: "bg-indigo-500",
    bg: "from-indigo-50",
  },
};

/** Fallback cover image per subcategory slug (Unsplash stable URLs) */
const SUBCATEGORY_COVER: Record<string, string> = {
  "uiux-design":
    "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&q=70",
  "branding-logo":
    "https://images.unsplash.com/photo-1509343256512-d77a5cb3791b?w=800&q=70",
  "web-development":
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=70",
  "backend-api":
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=70",
  "devops-cloud":
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70",
  "mobile-development":
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=70",
  illustration:
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=70",
  "video-animation":
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=70",
  "motion-graphics":
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=70",
  photography:
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=70",
  "seo-sem":
    "https://images.unsplash.com/photo-1432888622747-4eb9a8f2c1a3?w=800&q=70",
  "social-media-marketing":
    "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=70",
  "performance-marketing":
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=70",
  "content-writing":
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=70",
  translation:
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=70",
  copywriting:
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=70",
};

/** Category-level fallback */
const CATEGORY_COVER: Record<string, string> = {
  "design-creative":
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=70",
  "programming-tech":
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=70",
  "digital-marketing":
    "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=800&q=70",
  "writing-content":
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=70",
};

function getCategoryStyle(code?: string | null) {
  if (!code) {
    return {
      chip: "bg-gray-100 text-gray-600",
      accent: "bg-gray-400",
      bg: "from-gray-50",
    };
  }

  return (
    CATEGORY_STYLE[code] ?? {
      chip: "bg-blue-100 text-blue-700",
      accent: "bg-blue-500",
      bg: "from-blue-50",
    }
  );
}

type TabType = "all" | "hire" | "service" | "mine";

export default function JobsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation("common");

  const [tab, setTab] = useState<TabType>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [sort, setSort] = useState<string>("published_desc");
  const [showFilters, setShowFilters] = useState(false);

  const rawCategory = searchParams.get("category") || "";
  const rawSubcategory = searchParams.get("subcategory") || "";
  const selectedSubcategories = rawSubcategory
    ? rawSubcategory.split(",").filter(Boolean)
    : [];
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const language = i18n.resolvedLanguage?.startsWith("th") ? "th" : "en";
  const numberLocale = language === "th" ? "th-TH" : "en-US";
  const showPrimaryAction = Boolean(currentUserId);

  const sortOptions = useMemo(
    () => [
      {
        value: SORT_OPTION_VALUES[0],
        label: t("jobs.boardPage.sort.publishedDesc"),
      },
      {
        value: SORT_OPTION_VALUES[1],
        label: t("jobs.boardPage.sort.publishedAsc"),
      },
      {
        value: SORT_OPTION_VALUES[2],
        label: t("jobs.boardPage.sort.budgetDesc"),
      },
      {
        value: SORT_OPTION_VALUES[3],
        label: t("jobs.boardPage.sort.budgetAsc"),
      },
      {
        value: SORT_OPTION_VALUES[4],
        label: t("jobs.boardPage.sort.deadlineAsc"),
      },
    ],
    [t]
  );

  const tabs = useMemo(
    () => [
      { value: "all" as const, label: t("jobs.boardPage.tabs.all") },
      { value: "hire" as const, label: t("jobs.boardPage.tabs.hire") },
      { value: "service" as const, label: t("jobs.boardPage.tabs.service") },
      { value: "mine" as const, label: t("jobs.boardPage.tabs.mine") },
    ],
    [t]
  );

  const formatNumber = useCallback(
    (value: number) => value.toLocaleString(numberLocale),
    [numberLocale]
  );

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((user) => setCurrentUserId(user.id))
      .catch(() => {});
  }, []);

  useEffect(() => {
    listCategories()
      .then((response) => setCategories(response.data))
      .catch(() => {});
  }, []);

  const loadBrowseJobs = useCallback(
    (nextPage: number) => {
      setLoading(true);
      browseJobs({
        skip: (nextPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        budget_min: budgetMin ? Number(budgetMin) : undefined,
        budget_max: budgetMax ? Number(budgetMax) : undefined,
        sort,
        job_type: tab === "hire" || tab === "service" ? tab : undefined,
        subcategory_slug: rawSubcategory || undefined,
        category_slug: rawCategory || undefined,
        exclude_owner_id: currentUserId ?? undefined,
      })
        .then((res) => {
          const list = Array.isArray(res.data.data) ? res.data.data : [];
          setJobs(list);
          setTotal(res.data.total ?? list.length);
        })
        .catch((error) => console.error("Failed to fetch job board", error))
        .finally(() => setLoading(false));
    },
    [
      budgetMax,
      budgetMin,
      currentUserId,
      rawCategory,
      rawSubcategory,
      search,
      sort,
      tab,
    ]
  );

  const loadMyJobs = useCallback(() => {
    setLoading(true);
    getMyJobs()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setJobs(list);
        setTotal(list.length);
      })
      .catch((error) => console.error("Failed to load my jobs", error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);

    if (tab === "mine") {
      loadMyJobs();
      return;
    }

    const timer = window.setTimeout(() => loadBrowseJobs(1), 300);
    return () => window.clearTimeout(timer);
  }, [
    budgetMax,
    budgetMin,
    currentUserId,
    loadBrowseJobs,
    loadMyJobs,
    rawCategory,
    rawSubcategory,
    search,
    sort,
    tab,
  ]);

  useEffect(() => {
    if (page === 1 || tab === "mine") return;
    loadBrowseJobs(page);
  }, [loadBrowseJobs, page, tab]);

  const clearFilters = () => {
    setBudgetMin("");
    setBudgetMax("");
    setSort("published_desc");
    setPage(1);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("category");
      next.delete("subcategory");
      return next;
    });
  };

  const hasActiveFilters = Boolean(
    rawCategory ||
      rawSubcategory ||
      budgetMin ||
      budgetMax ||
      sort !== "published_desc"
  );

  const selectedCategoryData = categories.find(
    (category) => category.slug === rawCategory
  );

  const setCategoryFilter = (categorySlug: string) => {
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (categorySlug) {
        next.set("category", categorySlug);
      } else {
        next.delete("category");
      }
      next.delete("subcategory");
      return next;
    });
  };

  const toggleSubcategoryFilter = (categorySlug: string, subcategorySlug: string) => {
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("category", categorySlug);

      const current = new Set(
        (next.get("subcategory") ?? "").split(",").filter(Boolean)
      );

      if (current.has(subcategorySlug)) {
        current.delete(subcategorySlug);
      } else {
        current.add(subcategorySlug);
      }

      if (current.size === 0) {
        next.delete("subcategory");
      } else {
        next.set("subcategory", [...current].join(","));
      }

      return next;
    });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-transparent">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <span className="inline-flex h-7 items-center rounded-full border border-primary/10 bg-primary/10 px-3 text-xs font-semibold text-primary">
                  {t("nav.explore")}
                </span>
                <div className="space-y-2">
                  <h1 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.01em] text-text-primary md:text-[2.2rem]">
                    {t("jobs.boardPage.title")}
                  </h1>
                  <p className="text-sm font-medium text-slate-400">
                    {t("jobs.boardPage.titleSuffix")}
                  </p>
                  <p className="max-w-3xl text-[15px] leading-7 text-text-secondary">
                    {t("jobs.boardPage.subtitle")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!loading && (
                    <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                      {t("jobs.boardPage.totalFound", {
                        total: formatNumber(total),
                      })}
                    </span>
                  )}
                  {tab === "mine" && (
                    <span className="inline-flex h-8 items-center rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-700">
                      {t("jobs.boardPage.mineBadge")}
                    </span>
                  )}
                  {hasActiveFilters && tab !== "mine" && (
                    <span className="inline-flex h-8 items-center rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-700">
                      {t("jobs.boardPage.filters.active")}
                    </span>
                  )}
                </div>
              </div>

              {showPrimaryAction && (
                <button
                  onClick={() => navigate("/app/jobs/new")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-primary-hover"
                >
                  <PlusCircle className="h-4 w-4" />
                  {t("jobs.boardPage.actions.postJob")}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tabOption) => (
                <button
                  key={tabOption.value}
                  onClick={() => setTab(tabOption.value)}
                  className={clsx(
                    "rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition-colors",
                    tab === tabOption.value
                      ? "border-primary bg-primary text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                  )}
                >
                  {tabOption.label}
                </button>
              ))}
            </div>

            {tab !== "mine" && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t("jobs.boardPage.searchPlaceholder")}
                    className="h-11 rounded-[16px] border-slate-200 bg-white pl-11 text-sm shadow-none focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 lg:shrink-0">
                  <div className="relative min-w-[180px]">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-11 w-full appearance-none rounded-[16px] border border-slate-200 bg-white pl-4 pr-9 text-sm font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  <button
                    onClick={() => setShowFilters((visible) => !visible)}
                    className={clsx(
                      "flex h-11 items-center gap-1.5 rounded-[16px] border px-4 text-sm font-semibold transition-colors",
                      showFilters || hasActiveFilters
                        ? "border-primary bg-primary text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                    )}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {t("jobs.boardPage.filters.title")}
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    )}
                  </button>
                </div>
                </div>

                {showFilters && (
                  <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("jobs.boardPage.filters.budgetMinLabel")}
                      </label>
                      <Input
                        type="number"
                        placeholder={t(
                          "jobs.boardPage.filters.budgetMinPlaceholder"
                        )}
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        className="h-10 rounded-[14px] border-slate-200 bg-white text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("jobs.boardPage.filters.budgetMaxLabel")}
                      </label>
                      <Input
                        type="number"
                        placeholder={t(
                          "jobs.boardPage.filters.budgetMaxPlaceholder"
                        )}
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        className="h-10 rounded-[14px] border-slate-200 bg-white text-sm"
                      />
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex h-10 items-center gap-1 rounded-[14px] border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                        {t("jobs.boardPage.filters.clear")}
                      </button>
                    )}
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {t("jobs.categories")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCategoryFilter("")}
                          className={clsx(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                            !rawCategory
                              ? "border-primary/15 bg-primary text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                          )}
                        >
                          {t("all")}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setCategoryFilter(category.slug)}
                            className={clsx(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                              rawCategory === category.slug
                                ? "border-primary/15 bg-primary text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                            )}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedCategoryData?.subcategories?.length ? (
                      <div className="border-t border-slate-200 pt-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {selectedCategoryData.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCategoryFilter(selectedCategoryData.slug)}
                            className={clsx(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                              selectedSubcategories.length === 0
                                ? "border-primary/15 bg-primary text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                            )}
                          >
                            {t("all")}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selectedCategoryData.subcategories.map((subcategory) => {
                            const isActive = selectedSubcategories.includes(
                              subcategory.slug
                            );

                            return (
                              <button
                                key={subcategory.id}
                                type="button"
                                onClick={() =>
                                  toggleSubcategoryFilter(
                                    selectedCategoryData.slug,
                                    subcategory.slug
                                  )
                                }
                                className={clsx(
                                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                                  isActive
                                    ? "border-primary/15 bg-primary text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                                )}
                              >
                                {subcategory.name}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() =>
                              toggleSubcategoryFilter(
                                selectedCategoryData.slug,
                                "__none__"
                              )
                            }
                            className={clsx(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                              selectedSubcategories.includes("__none__")
                                ? "border-primary/15 bg-primary text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                            )}
                          >
                            {t("jobs.boardPage.filters.other")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {(rawCategory || rawSubcategory) && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                    <span className="text-xs font-medium text-slate-400">
                      {t("jobs.boardPage.filters.filteredBy")}
                    </span>

                    {rawCategory && (
                      <button
                        onClick={() =>
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.delete("category");
                            next.delete("subcategory");
                            return next;
                          })
                        }
                        className={clsx(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          getCategoryStyle(rawCategory).chip
                        )}
                      >
                        {CATEGORY_LABEL_MAP[rawCategory] ?? rawCategory}
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {rawSubcategory
                      .split(",")
                      .filter(Boolean)
                      .map((subSlug) => (
                        <button
                          key={subSlug}
                          onClick={() =>
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev);
                              const remaining = rawSubcategory
                                .split(",")
                                .filter((value) => value !== subSlug);

                              if (remaining.length === 0) {
                                next.delete("subcategory");
                              } else {
                                next.set("subcategory", remaining.join(","));
                              }

                              return next;
                            })
                          }
                          className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          {subSlug === "__none__"
                            ? t("jobs.boardPage.filters.other")
                            : subSlug}
                          <X className="w-3 h-3" />
                        </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100">
                <Briefcase className="h-8 w-8 text-slate-400" />
              </div>

              {tab === "mine" ? (
                <>
                  <p className="mt-5 text-base font-semibold text-gray-900">
                    {t("jobs.boardPage.empty.mineTitle")}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {t("jobs.boardPage.empty.mineSubtitle")}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-5 text-base font-semibold text-gray-900">
                    {t("jobs.boardPage.empty.searchTitle")}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {t("jobs.boardPage.empty.searchSubtitle")}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 inline-flex h-10 items-center rounded-[14px] border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      {t("jobs.boardPage.filters.clearAll")}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {tab === "mine" && (
                <div className="px-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t("jobs.boardPage.myJobsTitle", {
                      total: formatNumber(total),
                    })}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("jobs.boardPage.mineSubtitle")}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => {
                  const style = getCategoryStyle(job.category?.slug);
                  const hasImage = Boolean(job.images && job.images.length > 0);
                  const coverImage = hasImage
                    ? job.images![0]
                    : (job.subcategory?.slug &&
                        SUBCATEGORY_COVER[job.subcategory.slug]) ??
                      (job.category?.slug && CATEGORY_COVER[job.category.slug]) ??
                      null;
                  const isExpired =
                    job.status === "expired" ||
                    (job.status === "open" &&
                      Boolean(job.expires_at) &&
                      new Date(job.expires_at!) < new Date());
                  const expiresAt = job.expires_at
                    ? new Date(job.expires_at)
                    : null;
                  const daysUntilExpiry = expiresAt
                    ? Math.ceil(
                        (expiresAt.getTime() - Date.now()) / 86_400_000
                      )
                    : null;
                  const expiringSoon =
                    !isExpired &&
                    daysUntilExpiry !== null &&
                    daysUntilExpiry <= 3;
                  const displaySkills = (job.skills ?? []).slice(0, 3);
                  const displayTags = (job.tags ?? []).slice(0, 2);
                  const ownerName =
                    job.owner.display_name ??
                    job.owner.username ??
                    t("jobs.detailPage.unknownOwner");

                  return (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/app/explore/jobs/${job.id}`)}
                      className={clsx(
                        "group flex cursor-pointer flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.1)]",
                        isExpired
                          ? "border-slate-200/80 opacity-75"
                          : "border-slate-200/80 hover:border-blue-200"
                      )}
                    >
                      <div
                        className={clsx("relative h-40 overflow-hidden flex-shrink-0", !coverImage && `bg-gradient-to-br ${style.bg} to-white`)}
                      >
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={job.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageOff className="w-8 h-8 text-gray-300" />
                          </div>
                        )}

                        {isExpired && (
                          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                            <span className="bg-white/90 text-gray-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {t("jobs.boardPage.status.expired")}
                            </span>
                          </div>
                        )}

                        {expiringSoon && (
                          <div className="absolute top-0 left-0 right-0 bg-amber-500/90 text-white text-[10px] font-bold text-center py-0.5">
                            {t("jobs.boardPage.status.expiringInDays", {
                              days: formatNumber(daysUntilExpiry),
                            })}
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                          {job.category?.name && (
                            <span
                              className={clsx(
                                "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm",
                                style.chip
                              )}
                            >
                              {job.category.name}
                            </span>
                          )}
                          {job.subcategory?.name && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/85 text-gray-700 backdrop-blur-sm">
                              {job.subcategory.name}
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2 right-2">
                          <span
                            className={clsx(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              job.job_type === "hire"
                                ? "bg-blue-600 text-white"
                                : "bg-lime-600 text-white"
                            )}
                          >
                            {job.job_type === "hire"
                              ? t("jobs.boardPage.jobType.hire")
                              : t("jobs.boardPage.jobType.service")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-2 p-5">
                         <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                          {job.title}
                        </h3>

                         <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
                          {stripHtml(job.description || "") ||
                            t("jobs.detailPage.noDescription")}
                        </p>

                        {displaySkills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {displaySkills.map((skill) => (
                              <span
                                key={skill.id}
                                className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                              >
                                {skill.name}
                              </span>
                            ))}
                            {(job.skills ?? []).length > 3 && (
                              <span className="text-[10px] text-gray-400 px-1">
                                +{job.skills!.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {displayTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {displayTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                            {(job.tags ?? []).length > 2 && (
                              <span className="text-[10px] text-gray-400 px-1">
                                +{job.tags!.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          {job.owner.avatar_url ? (
                            <img
                              src={job.owner.avatar_url}
                              alt={ownerName}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate">{ownerName}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDbDate(
                                job.published_at || job.created_at,
                                language
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {formatNumber(job.proposals_count ?? 0)}
                            </span>
                            {job.delivery_date && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <CalendarDays className="w-3 h-3" />
                                {formatDbDate(job.delivery_date, language)}
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-0.5 font-bold text-slate-900 text-sm whitespace-nowrap">
                            <Banknote className="w-3.5 h-3.5 text-slate-400" />
                            {job.budget
                              ? `฿${job.budget.toLocaleString(numberLocale)}`
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {tab !== "mine" && totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="flex h-10 items-center gap-1 rounded-[14px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {t("jobs.boardPage.pagination.previous")}
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter(
                        (pageNumber) =>
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          Math.abs(pageNumber - page) <= 1
                      )
                      .reduce<(number | "...")[]>((acc, pageNumber, index, arr) => {
                        if (
                          index > 0 &&
                          pageNumber - (arr[index - 1] as number) > 1
                        ) {
                          acc.push("...");
                        }
                        acc.push(pageNumber);
                        return acc;
                      }, [])
                      .map((pageItem, index) =>
                        pageItem === "..." ? (
                          <span
                            key={`dots-${index}`}
                            className="px-2 text-gray-400 text-xs"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={pageItem}
                            onClick={() => setPage(pageItem as number)}
                            className={clsx(
                              "h-9 w-9 rounded-[12px] text-xs font-semibold transition-colors",
                              page === pageItem
                                ? "bg-primary text-white"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-primary"
                            )}
                          >
                            {pageItem}
                          </button>
                        )
                      )}
                  </div>

                  <button
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                    className="flex h-10 items-center gap-1 rounded-[14px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("jobs.boardPage.pagination.next")}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
