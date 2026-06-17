import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Briefcase, ChevronRight, Trash2 } from "lucide-react";
import { getMyJobs, publishJob, deleteJob } from "@/services/jobs.service";
import { listJobProposals } from "@/services/jobs.service";
import type { Job, Proposal } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { formatDbDate } from "@/utils/date";
import { clsx } from "clsx";

const STATUS_STYLE: Record<string, string> = {
  draft:   "bg-gray-100 text-gray-500 border-gray-200",
  open:    "bg-lime-50 text-lime-700 border-lime-200",
  closed:  "bg-red-50 text-red-600 border-red-200",
  expired: "bg-yellow-50 text-yellow-700 border-yellow-200",
};
const STATUS_LABEL: Record<string, string> = {
  draft:   "Draft",
  open:    "เปิดรับสมัคร",
  closed:  "ปิดแล้ว",
  expired: "หมดอายุ",
};

export default function MyJobsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [proposalsMap, setProposalsMap] = useState<Record<string, Proposal[]>>({});
  const [proposalsLoading, setProposalsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getMyJobs()
      .then((res) => setJobs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleProposals = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      return;
    }
    setExpandedJob(jobId);
    if (proposalsMap[jobId]) return;

    setProposalsLoading((p) => ({ ...p, [jobId]: true }));
    try {
      const res = await listJobProposals(jobId);
      setProposalsMap((m) => ({ ...m, [jobId]: res.data }));
    } catch {
      setProposalsMap((m) => ({ ...m, [jobId]: [] }));
    } finally {
      setProposalsLoading((p) => ({ ...p, [jobId]: false }));
    }
  };

  const handlePublish = async (jobId: string) => {
    try {
      const res = await publishJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? res.data : j)));
      showToast("เผยแพร่งานสำเร็จ", "success");
    } catch {
      showToast("เผยแพร่ไม่สำเร็จ", "error");
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("ลบงานนี้ใช่หรือไม่?")) return;
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      showToast("ลบงานสำเร็จ", "success");
    } catch {
      showToast("ลบไม่สำเร็จ — อาจมีข้อเสนออยู่แล้ว", "error");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            งานของฉัน
          </h1>
          <p className="text-sm text-text-muted mt-1">งานที่คุณโพสไว้ทั้งหมด</p>
        </div>
        <button
          onClick={() => navigate("/app/jobs/create")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          โพสงานใหม่
        </button>
      </div>

      {loading ? (
        <div className="text-center text-text-muted text-sm py-16 animate-pulse">กำลังโหลด...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center space-y-3">
          <p className="text-text-muted text-sm">ยังไม่มีงานที่โพส</p>
          <button
            onClick={() => navigate("/app/jobs/create")}
            className="text-sm text-primary underline"
          >
            โพสงานแรกของคุณ
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-border bg-white overflow-hidden">
              {/* Job row */}
              <div className="p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary truncate">{job.title}</h3>
                    <span className={clsx(
                      "shrink-0 text-xs border px-2 py-0.5 rounded-full",
                      STATUS_STYLE[job.status]
                    )}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {job.budget ? `฿${job.budget.toLocaleString()}` : "เจรจาต่อรองได้"}
                    {" · "}
                    {formatDbDate(job.created_at)}
                    {" · "}
                    {job.proposals_count ?? 0} ข้อเสนอ
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === "draft" && (
                    <button
                      onClick={() => handlePublish(job.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-accent text-primary-foreground hover:opacity-90 transition"
                    >
                      เผยแพร่
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/app/jobs/${job.id}`)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-accent/60 transition"
                  >
                    ดูงาน
                  </button>
                  {(job.status === "draft" || job.status === "closed") && (
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-xs p-1.5 rounded-lg border border-border text-red-400 hover:border-red-300 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleProposals(job.id)}
                    className={clsx(
                      "text-xs p-1.5 rounded-lg border transition",
                      expandedJob === job.id
                        ? "border-accent text-primary bg-accent/5"
                        : "border-border text-text-muted hover:border-accent/60"
                    )}
                  >
                    <ChevronRight className={clsx("w-4 h-4 transition-transform", expandedJob === job.id && "rotate-90")} />
                  </button>
                </div>
              </div>

              {/* Proposals accordion */}
              {expandedJob === job.id && (
                <div className="border-t border-border bg-gray-50 divide-y divide-border">
                  {proposalsLoading[job.id] ? (
                    <div className="p-4 text-sm text-text-muted animate-pulse text-center">กำลังโหลดข้อเสนอ...</div>
                  ) : (proposalsMap[job.id] ?? []).length === 0 ? (
                    <div className="p-4 text-sm text-text-muted text-center">ยังไม่มีข้อเสนอ</div>
                  ) : (
                    (proposalsMap[job.id] ?? []).map((p) => (
                      <div
                        key={p.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-white transition cursor-pointer"
                        onClick={() => navigate(`/app/jobs/${job.id}`)}
                      >
                        <div>
                          <span className="text-sm font-medium text-text-primary">
                            {p.freelancer.display_name ?? p.freelancer.username}
                          </span>
                          {p.proposed_budget && (
                            <span className="text-xs text-text-muted ml-2">
                              ฿{p.proposed_budget.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <span className={clsx(
                          "text-xs border px-2 py-0.5 rounded-full",
                          p.status === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          p.status === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          {p.status === "pending" ? "รอตอบรับ" : p.status === "accepted" ? "รับแล้ว" : p.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
