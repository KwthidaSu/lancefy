import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  CheckCircle2,
  Star,
  X,
  ChevronDown,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { clsx } from "clsx";

import {
  getPublicFreelancers,
  type FreelancerProfile,
} from "@/services/freelancer.service";
import { SKILL_CATEGORIES } from "@/data/skills";
import Input from "@/components/ui/Input";

const CATEGORY_SKILLS_MAP: Record<string, string[]> = {
  "ui-ux": [
    "Figma",
    "Adobe XD",
    "UI Design",
    "UX Design",
    "Sketch",
    "Wireframing",
  ],
  branding: [
    "Adobe Illustrator",
    "Brand Strategy",
    "Logo Design",
    "Typography",
    "Brand Identity",
  ],
  "web-development": [
    "React",
    "Vue",
    "Angular",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Python",
  ],
  illustration: [
    "Adobe Illustrator",
    "Procreate",
    "Digital Art",
    "Character Design",
    "Blender",
  ],
  marketing: [
    "SEO",
    "Google Ads",
    "Social Media Marketing",
    "Content Marketing",
    "Copywriting (Thai)",
  ],
  photography: ["Photography", "Lightroom", "Adobe Photoshop"],
  "writing-translation": [
    "Copywriting (Thai)",
    "Copywriting (English)",
    "Content Writing",
    "SEO Writing",
    "Translation",
  ],
  "video-animation": [
    "After Effects",
    "Premiere Pro",
    "Cinema 4D",
    "DaVinci Resolve",
    "Motion Graphics",
  ],
};

const FREELANCER_CATEGORY_OPTIONS = [
  { label: "UI / UX", value: "ui-ux" },
  { label: "Branding", value: "branding" },
  { label: "Web Development", value: "web-development" },
  { label: "Illustration", value: "illustration" },
  { label: "Marketing", value: "marketing" },
  { label: "Photography", value: "photography" },
  { label: "Writing & Translation", value: "writing-translation" },
  { label: "Video & Animation", value: "video-animation" },
] as const;

const TOP_SKILLS: string[] = (() => {
  const all: string[] = [];

  for (const category of SKILL_CATEGORIES) {
    for (const skill of category.skills) {
      if (all.length < 16) {
        all.push(skill);
      }
    }
  }

  return all;
})();

const SORT_VALUES = ["newest", "rating_desc", "rate_asc", "rate_desc"] as const;
type SortValue = (typeof SORT_VALUES)[number];

function Avatar({
  user,
  size = "md",
}: {
  user: FreelancerProfile;
  size?: "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-16 w-16 rounded-2xl text-xl"
      : "h-12 w-12 rounded-xl text-base";
  const label = (
    user.display_name?.charAt(0) ??
    user.firstname?.charAt(0) ??
    user.username?.charAt(0) ??
    "?"
  ).toUpperCase();

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.username}
        className={`${cls} object-cover`}
      />
    );
  }

  return (
    <div
      className={`${cls} flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white`}
    >
      {label}
    </div>
  );
}

function FreelancerCard({
  freelancer,
  numberLocale,
  onClick,
}: {
  freelancer: FreelancerProfile;
  numberLocale: string;
  onClick: () => void;
}) {
  const { t } = useTranslation("common");

  const displayName =
    freelancer.display_name ||
    [freelancer.firstname, freelancer.lastname].filter(Boolean).join(" ") ||
    freelancer.username ||
    t("freelancersPage.card.anonymous");

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_48px_rgba(15,23,42,0.1)]"
    >
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <Avatar user={freelancer} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-400">
                  @{freelancer.username}
                </p>
              </div>

              {freelancer.kyc_status === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("freelancersPage.card.verified")}
                </span>
              )}
            </div>

            {freelancer.tagline && (
              <p className="mt-1 truncate text-sm text-slate-600">
                {freelancer.tagline}
              </p>
            )}
          </div>
        </div>

        {freelancer.bio && (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-500">
            {freelancer.bio}
          </p>
        )}

        {freelancer.skills && freelancer.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {freelancer.skills.slice(0, 4).map((skill) => (
              <span
                key={skill.id}
                className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                {skill.name}
              </span>
            ))}

            {freelancer.skills.length > 4 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-400">
                +{freelancer.skills.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-200 pt-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {t("freelancersPage.card.hourlyRate")}
            </p>

            {freelancer.hourly_rate != null ? (
              <p className="mt-1 text-2xl font-bold tracking-tight text-blue-600">
                ฿{freelancer.hourly_rate.toLocaleString(numberLocale)}
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-400">
                {t("freelancersPage.card.rateNotSet")}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            {freelancer.avg_rating != null &&
            Number(freelancer.review_count ?? 0) > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {freelancer.avg_rating.toFixed(1)}
                <span className="font-normal text-slate-400">
                  ({freelancer.review_count})
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-300">
                {t("freelancersPage.card.noReviews")}
              </span>
            )}

            <span className="text-xs font-semibold text-blue-600 group-hover:underline">
              {t("freelancersPage.card.viewProfile")}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function FreelancersPage() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>("newest");
  const [kycOnly, setKycOnly] = useState(false);
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const rawCategory = searchParams.get("category") || "";
  const selectedCategories = rawCategory
    ? rawCategory.split(",").filter(Boolean)
    : [];
  const numberLocale = i18n.resolvedLanguage?.startsWith("th")
    ? "th-TH"
    : "en-US";

  useEffect(() => {
    setSelectedSkill(null);
  }, [rawCategory]);

  const sortOptions = useMemo(
    () => [
      { value: SORT_VALUES[0], label: t("freelancersPage.sort.newest") },
      { value: SORT_VALUES[1], label: t("freelancersPage.sort.ratingDesc") },
      { value: SORT_VALUES[2], label: t("freelancersPage.sort.rateAsc") },
      { value: SORT_VALUES[3], label: t("freelancersPage.sort.rateDesc") },
    ],
    [t]
  );

  const displaySkills = useMemo(() => {
    if (selectedCategories.length === 0) {
      return TOP_SKILLS;
    }

    const skillSet = new Set<string>();
    for (const category of selectedCategories) {
      for (const skill of CATEGORY_SKILLS_MAP[category] ?? []) {
        skillSet.add(skill);
      }
    }

    return Array.from(skillSet);
  }, [selectedCategories]);

  const categorySkillsParam = useMemo(() => {
    if (selectedCategories.length === 0) {
      return undefined;
    }

    const skillSet = new Set<string>();
    for (const category of selectedCategories) {
      for (const skill of CATEGORY_SKILLS_MAP[category] ?? []) {
        skillSet.add(skill);
      }
    }

    return skillSet.size > 0 ? Array.from(skillSet).join(",") : undefined;
  }, [selectedCategories]);

  const hasFilters = Boolean(
    selectedCategories.length ||
      selectedSkill ||
      kycOnly ||
      rateMin ||
      rateMax ||
      sort !== "newest"
  );

  const clearFilters = () => {
    setSelectedSkill(null);
    setKycOnly(false);
    setRateMin("");
    setRateMax("");
    setSort("newest");

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("category");
      return next;
    });
  };

  const toggleCategoryFilter = (category: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const current = new Set(
        (next.get("category") || "").split(",").filter(Boolean)
      );

      if (current.has(category)) {
        current.delete(category);
      } else {
        current.add(category);
      }

      if (current.size === 0) {
        next.delete("category");
      } else {
        next.set("category", Array.from(current).join(","));
      }

      return next;
    });
  };

  const loadFreelancers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getPublicFreelancers({
        search: search.trim() || undefined,
        skill: selectedSkill || undefined,
        skills: !selectedSkill ? categorySkillsParam : undefined,
        sort,
        kyc_verified: kycOnly || undefined,
        rate_min: rateMin ? Number(rateMin) : undefined,
        rate_max: rateMax ? Number(rateMax) : undefined,
        limit: 24,
      });

      setFreelancers(res.data.data);
      setTotal(res.data.total ?? res.data.data.length ?? 0);
    } catch (error) {
      console.error("Failed to load freelancers", error);
      setFreelancers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    categorySkillsParam,
    kycOnly,
    rateMax,
    rateMin,
    search,
    selectedSkill,
    sort,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(loadFreelancers, 300);
    return () => window.clearTimeout(timer);
  }, [loadFreelancers]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-transparent">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <span className="inline-flex h-7 items-center rounded-full border border-primary/10 bg-primary/10 px-3 text-xs font-semibold text-primary">
                  {t("nav.explore")}
                </span>

                <div className="space-y-2">
                  <h1 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.01em] text-text-primary md:text-[2.2rem]">
                    {t("freelancersPage.title")}
                  </h1>
                  <p className="text-sm font-medium text-slate-400">
                    {t("freelancersPage.titleSuffix")}
                  </p>
                  <p className="max-w-3xl text-[15px] leading-7 text-text-secondary">
                    {t("freelancersPage.subtitle")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!loading && (
                    <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                      {t("freelancersPage.totalFound", {
                        total: total.toLocaleString(numberLocale),
                      })}
                    </span>
                  )}

                  {kycOnly && (
                    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("freelancersPage.filters.verifiedOnly")}
                    </span>
                  )}

                  {hasFilters && (
                    <span className="inline-flex h-8 items-center rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-700">
                      {t("freelancersPage.filters.active")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("freelancersPage.searchPlaceholder")}
                  className="h-11 rounded-[16px] border-slate-200 bg-white pl-11 pr-4 text-sm shadow-none focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-wrap gap-2 xl:shrink-0">
                <div className="relative min-w-[190px]">
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortValue)
                    }
                    className="h-11 w-full appearance-none rounded-[16px] border border-slate-200 bg-white pl-4 pr-9 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>

                <button
                  type="button"
                  onClick={() => setKycOnly((current) => !current)}
                  className={clsx(
                    "flex h-11 items-center gap-1.5 rounded-[16px] border px-4 text-sm font-semibold transition-colors",
                    kycOnly
                      ? "border-primary bg-primary text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("freelancersPage.filters.verifiedOnly")}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFilters((current) => !current)}
                  className={clsx(
                    "flex h-11 items-center gap-1.5 rounded-[16px] border px-4 text-sm font-semibold transition-colors",
                    showFilters || hasFilters
                      ? "border-primary bg-primary text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("freelancersPage.filters.title")}
                  {hasFilters ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  ) : null}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("freelancersPage.filters.title")}
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="flex min-w-[150px] flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t("freelancersPage.filters.rateMinLabel")}
                  </label>
                  <Input
                    type="number"
                    value={rateMin}
                    onChange={(event) => setRateMin(event.target.value)}
                    placeholder={t("freelancersPage.filters.rateMinPlaceholder")}
                    className="h-10 rounded-[14px] border-slate-200 bg-white text-sm"
                  />
                </div>

                <div className="flex min-w-[150px] flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t("freelancersPage.filters.rateMaxLabel")}
                  </label>
                  <Input
                    type="number"
                    value={rateMax}
                    onChange={(event) => setRateMax(event.target.value)}
                    placeholder={t("freelancersPage.filters.rateMaxPlaceholder")}
                    className="h-10 rounded-[14px] border-slate-200 bg-white text-sm"
                  />
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex h-10 items-center gap-1 rounded-[14px] border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                    {t("freelancersPage.filters.clear")}
                  </button>
                )}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {t("freelancersPage.filters.categories")}
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.delete("category");
                          return next;
                        })
                      }
                      className={clsx(
                        "rounded-[14px] border px-3 py-1.5 text-xs font-semibold transition-colors",
                        selectedCategories.length === 0
                          ? "border-primary/15 bg-primary text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                      )}
                    >
                      {t("all")}
                    </button>

                    {FREELANCER_CATEGORY_OPTIONS.map((category) => {
                      const isActive = selectedCategories.includes(category.value);

                      return (
                        <button
                          type="button"
                          key={category.value}
                          onClick={() => toggleCategoryFilter(category.value)}
                          className={clsx(
                            "rounded-[14px] border px-3 py-1.5 text-xs font-semibold transition-colors",
                            isActive
                              ? "border-primary/15 bg-primary text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                          )}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {t("freelancersPage.filters.skills")}
                    </span>

                  <div className="flex flex-wrap gap-1.5">
                    {displaySkills.map((skill) => (
                      <button
                        type="button"
                        key={skill}
                        onClick={() =>
                          setSelectedSkill((current) =>
                            current === skill ? null : skill
                          )
                        }
                        className={clsx(
                          "rounded-[14px] border px-3 py-1.5 text-xs font-semibold transition-colors",
                          selectedSkill === skill
                            ? "border-primary bg-primary text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                        )}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
          ) : freelancers.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>

              <p className="mt-5 text-base font-semibold text-gray-900">
                {t("freelancersPage.empty.title")}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {t("freelancersPage.empty.subtitle")}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex h-10 items-center rounded-[14px] border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {t("freelancersPage.filters.clearAll")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {freelancers.map((freelancer) => (
                <FreelancerCard
                  key={freelancer.id}
                  freelancer={freelancer}
                  numberLocale={numberLocale}
                  onClick={() =>
                    navigate(`/app/explore/freelancers/${freelancer.id}`)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
