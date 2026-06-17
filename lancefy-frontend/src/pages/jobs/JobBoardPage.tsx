import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Search, SlidersHorizontal, Plus } from "lucide-react";
import { browseJobs } from "@/services/jobs.service";
import type { Job } from "@/types";
import { listCategoriesSimple, type CategorySimpleResponse } from "@/services/skills.service";
import { useKeycloak } from "@react-keycloak/web";
import { formatDbDate } from "@/utils/date";
import { clsx } from "clsx";

const JOB_TYPE_LABEL: Record<string, string> = {
  hire: "จ้างงาน",
  service: "เสนอบริการ",
};

export default function JobBoardPage() {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const isOwner = keycloak.tokenParsed?.realm_access?.roles?.includes("client");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategorySimpleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jobType, setJobType] = useState<"" | "hire" | "service">("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [skip, setSkip] = useState(0);

  const LIMIT = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load categories
  useEffect(() => {
    listCategoriesSimple()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  // Load jobs
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    browseJobs({
      job_type: jobType || undefined,
      category_id: categoryId || undefined,
      skip,
      limit: LIMIT,
    })
      .then((res) => { if (alive) setJobs(res.data.data); })
      .catch(() => { if (alive) setError("โหลดข้อมูลไม่สำเร็จ"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [jobType, categoryId, skip, debouncedSearch]);

  const handleReset = () => {
    setJobType("");
    setCategoryId("");
    setSearch("");
    setSkip(0);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Job Board
          </h1>
          <p className="text-sm text-text-muted mt-1">งานที่เปิดรับสมัครทั้งหมด</p>
        </div>
        {isOwner && (
          <button
            onClick={() => navigate("/app/jobs/create")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            โพสงาน
          </button>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="ค้นหางาน..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={clsx(
            "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition",
            showFilters ? "border-accent text-primary bg-accent/5" : "border-border text-text-muted bg-surface hover:border-accent/60"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          กรอง
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted font-medium">ประเภท</label>
            <select
              className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none"
              value={jobType}
              onChange={(e) => { setJobType(e.target.value as "" | "hire" | "service"); setSkip(0); }}
            >
              <option value="">ทั้งหมด</option>
              <option value="hire">จ้างงาน</option>
              <option value="service">เสนอบริการ</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted font-medium">หมวดหมู่</label>
            <select
              className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none"
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setSkip(0); }}
            >
              <option value="">ทั้งหมด</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleReset}
            className="self-end text-xs text-text-muted hover:text-primary transition underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-text-muted text-sm py-16 animate-pulse">กำลังโหลด...</div>
      ) : error ? (
        <div className="text-center text-red-500 text-sm py-16">{error}</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-16">ไม่พบงานที่ตรงกับเงื่อนไข</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => navigate(`/app/jobs/${job.id}`)}
              className="text-left rounded-xl border border-border bg-white p-5 hover:border-accent/60 hover:shadow-sm transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-text-primary line-clamp-2">{job.title}</h3>
                <span className={clsx(
                  "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border",
                  job.job_type === "hire"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-lime-50 text-lime-700 border-lime-200"
                )}>
                  {JOB_TYPE_LABEL[job.job_type] ?? job.job_type}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(job.skills ?? []).slice(0, 4).map((s) => (
                  <span key={s.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {s.name}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-text-muted">
                <span>
                  {job.budget ? `฿${job.budget.toLocaleString()}` : "เจรจาต่อรองได้"}
                </span>
                <span className="text-xs">{formatDbDate(job.created_at ?? "")}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>{job.owner?.display_name ?? job.owner?.username ?? "ไม่ระบุ"}</span>
                {job.proposals_count !== undefined && (
                  <span className="ml-auto text-xs text-text-muted">
                    {job.proposals_count} ข้อเสนอ
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && jobs.length === LIMIT && (
        <div className="flex justify-center gap-3">
          {skip > 0 && (
            <button
              onClick={() => setSkip((s) => Math.max(0, s - LIMIT))}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:border-accent/60 transition"
            >
              ← ก่อนหน้า
            </button>
          )}
          <button
            onClick={() => setSkip((s) => s + LIMIT)}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:border-accent/60 transition"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}
