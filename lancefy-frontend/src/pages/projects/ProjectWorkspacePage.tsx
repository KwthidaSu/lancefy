import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
  HiOutlineStar,
} from "react-icons/hi2";

import {
  fetchProjectWorkspace,
  fetchProjectPayoutSummary,
  confirmProjectCompletion,
} from "@/services/projects/project";
import MilestoneFundModal from "@/components/milestones/MilestoneFundModal";
import type {
  ProjectWorkspace,
  ProjectPayoutSummary,
  MilestoneBoardItem,
} from "@/services/projects/project.types";
import { formatDbDate } from "@/utils/date";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { getMyReviewForProject } from "@/services/review.service";

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  review: "bg-amber-100 text-amber-800",
  done: "bg-lime-100 text-lime-700",
};

const submissionColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-700",
  submitted: "bg-violet-100 text-violet-800",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-lime-100 text-lime-700",
  rejected: "bg-red-100 text-red-800",
  revision_requested: "bg-orange-100 text-orange-800",
};

const fundingColors: Record<string, string> = {
  unfunded: "bg-gray-100 text-gray-700",
  funded: "bg-indigo-100 text-indigo-800",
  released: "bg-lime-100 text-lime-700",
};

function badgeClass(
  status: string | null | undefined,
  map: Record<string, string>
) {
  if (!status) return "bg-gray-100 text-gray-700";
  return map[status] || "bg-gray-100 text-gray-700";
}

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const [workspace, setWorkspace] =
    useState<ProjectWorkspace | null>(null);
  const [payout, setPayout] =
    useState<ProjectPayoutSummary | null>(null);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] =
    useState(false);
  const [fundModal, setFundModal] = useState<MilestoneBoardItem | null>(null);
  const [hasReviewed, setHasReviewed] = useState<boolean | null>(null);
  const [reviewDeadline, setReviewDeadline] = useState<Date | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProjectWorkspace(id);
      setWorkspace(res.data);

      try {
        const payoutRes = await fetchProjectPayoutSummary(id);
        setPayout(payoutRes.data);
      } catch {
        setPayout(null);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  // Check if client has already reviewed this project
  useEffect(() => {
    if (!workspace || !currentUser || !id) return;
    const _project = workspace.project;
    if (_project.status !== "completed") return;
    const _isClient = workspace.assignment?.client_id === currentUser.id;
    if (!_isClient) return;
    getMyReviewForProject(id)
      .then((res) => {
        setHasReviewed(true);
        if (res.data.review_deadline) {
          setReviewDeadline(new Date(res.data.review_deadline));
        }
      })
      .catch((err) => {
        setHasReviewed(false);
        // Backend returns deadline in X-Review-Deadline header on 404
        const deadlineHeader = err?.response?.headers?.["x-review-deadline"];
        if (deadlineHeader) setReviewDeadline(new Date(deadlineHeader));
      });
  }, [workspace, currentUser, id]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-text-muted">
        {t("loading")}
      </div>
    );
  }

  if (error || !workspace?.project) {
    return (
      <div className="p-6 text-sm text-danger">
        {error ?? t("common.error")}
      </div>
    );
  }

  const project = workspace.project;
  const assignment = workspace.assignment;
  const milestones = workspace.milestones || [];

  const columns: {
    id: "todo" | "review" | "done";
    title: string;
  }[] = [
    { id: "todo", title: "To Do" },
    { id: "review", title: "Review" },
    { id: "done", title: "Done" },
  ];

  const grouped: Record<
    "todo" | "review" | "done",
    MilestoneBoardItem[]
  > = {
    todo: milestones.filter((m) => m.workflow_status === "todo"),
    review: milestones.filter((m) => m.workflow_status === "review"),
    done: milestones.filter((m) => m.workflow_status === "done"),
  };

  const submissionLabel = (status?: string | null) => {
    const normalized = String(status ?? "none").toLowerCase();
    if (normalized === "none") return t("project.managePage.badges.uncomplete");
    if (normalized === "submitted" || normalized === "pending") return t("project.managePage.badges.submitted");
    if (normalized === "approved") return t("project.managePage.badges.approved");
    if (normalized === "rejected" || normalized === "revision_requested") {
      return t("project.managePage.badges.revisionRequested");
    }
    return normalized;
  };

  const formatAmount = (
    amount?: number | null,
    currency?: string | null
  ) => {
    if (amount === null || amount === undefined) return "-";
    const value = Number(amount);
    const prefix = currency ? `${currency} ` : "";
    return `${prefix}${Number.isNaN(value) ? amount : value.toLocaleString()}`;
  };

  const allMilestonesDone =
    milestones.length > 0 &&
    milestones.every((m) => m.workflow_status === "done");

  const clientConfirmed =
    assignment?.client_completion_confirmed_at ?? null;
  const freelancerConfirmed =
    assignment?.freelancer_completion_confirmed_at ?? null;

  const isClient =
    !!assignment &&
    !!currentUser &&
    assignment.client_id === currentUser.id;
  const isFreelancer =
    !!assignment &&
    !!currentUser &&
    assignment.freelancer_id === currentUser.id;

  // canReview: project must be completed, user must be client, freelancer must exist
  const freelancerName =
    project.freelancer?.display_name ||
    project.freelancer?.username ||
    "Freelancer";
  const freelancerId = assignment?.freelancer_id || project.freelancer_id;
  const canReview =
    project.status === "completed" &&
    isClient &&
    !!freelancerId;

  // Days remaining to review (null = no deadline known)
  const reviewDaysLeft =
    reviewDeadline !== null
      ? Math.max(0, Math.ceil((reviewDeadline.getTime() - Date.now()) / 86_400_000))
      : null;

  const canConfirm =
    assignment &&
    allMilestonesDone &&
    ((isClient && !clientConfirmed) ||
      (isFreelancer && !freelancerConfirmed));

  const handleConfirmCompletion = async () => {
    if (!id || !canConfirm || confirming) return;

    try {
      setConfirming(true);
      await confirmProjectCompletion(id);
      showToast("ยืนยันจบงานเรียบร้อย", "success");
      setShowConfirmModal(false);
      await loadWorkspace();
    } catch {
      showToast("ยืนยันจบงานไม่สำเร็จ", "error");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      <button
        onClick={() => navigate("/app/projects")}
        className="text-sm text-text-muted hover:text-primary-foreground"
      >
        ← {t("project.backToProjects")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {project.title}
          </h1>
          <p className="text-text-muted text-sm">
            {t("project.createdAt", {
              date: formatDbDate(
                project.created_at,
                i18n.language
              ),
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              navigate(`/app/projects/${id}/manage`)
            }
            className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium"
          >
            จัดการโปรเจกต์
          </button>
          <button
            onClick={() => navigate("/app/calendar")}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium"
          >
            เปิดปฏิทิน
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 text-base font-semibold mb-4">
              <HiOutlineClipboardDocumentList className="w-5 h-5 text-primary-foreground" />
              Workspace
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-text-muted">
                  งบประมาณ
                </div>
                <div className="text-lg font-semibold text-text-primary">
                  {formatAmount(
                    project.budget,
                    project.currency
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-text-muted">
                  หมวดหมู่
                </div>
                <div className="text-lg font-semibold text-text-primary">
                  {project.categories?.[0]?.label || "-"}
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-text-muted">
                  Deadline
                </div>
                <div className="text-lg font-semibold text-text-primary">
                  {project.deadline_date
                    ? formatDbDate(
                        project.deadline_date,
                        i18n.language
                      )
                    : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 text-base font-semibold mb-4">
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-primary-foreground" />
              Milestone Board
            </div>

            {milestones.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                {t("project.milestonesEmpty")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="rounded-xl border border-border bg-white p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-text-primary">
                        {column.title}
                      </div>
                      <span className="text-xs text-text-muted">
                        {grouped[column.id].length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {grouped[column.id].map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg border border-border p-3 text-sm"
                        >
                          <div className="font-semibold text-text-primary">
                            {m.title || "Untitled milestone"}
                          </div>
                          <div className="text-xs text-text-muted mt-1">
                            ครบกำหนด:{" "}
                            {formatDbDate(
                              m.due_date ?? null,
                              i18n.language
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            <span
                              className={`rounded-full px-2 py-0.5 ${badgeClass(
                                m.workflow_status,
                                statusColors
                              )}`}
                            >
                              {m.workflow_status}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 ${badgeClass(
                                m.submission_status ?? "none",
                                submissionColors
                              )}`}
                            >
                              {submissionLabel(m.submission_status)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 ${badgeClass(
                                m.funding_status,
                                fundingColors
                              )}`}
                            >
                              {m.funding_status}
                            </span>
                          </div>

                          {isClient && m.funding_status === "unfunded" && (
                            <button
                              onClick={() => setFundModal(m)}
                              className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                            >
                              วาง Escrow
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 text-base font-semibold mb-4">
              <HiOutlineCalendarDays className="w-5 h-5 text-primary-foreground" />
              Payment Summary
            </div>

            {!payout || payout.milestones.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                ไม่มีข้อมูลการจ่ายเงิน
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-xs text-text-muted">
                    รวมงบตาม Milestone
                  </div>
                  <div className="text-lg font-semibold text-text-primary">
                    {formatAmount(
                      payout.total_milestone_amount,
                      payout.currency ?? project.currency
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="text-xs text-text-muted">
                    รวมที่จ่ายแล้ว
                  </div>
                  <div className="text-lg font-semibold text-text-primary">
                    {formatAmount(
                      payout.total_released_amount,
                      payout.currency ?? project.currency
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {payout.milestones.map((m) => (
                    <div
                      key={m.milestone_id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="text-sm font-semibold text-text-primary">
                        {m.title || "Milestone"}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        จ่ายแล้ว{" "}
                        {formatAmount(
                          m.released_amount,
                          m.currency ?? payout.currency ?? project.currency
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 text-base font-semibold mb-4">
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-primary-foreground" />
              Completion Confirmation
            </div>

            {!assignment && (
              <div className="text-sm text-text-muted">
                ยังไม่มีการจ้างงานในโปรเจกต์นี้
              </div>
            )}

            {assignment && (
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-text-muted">Client</span>
                  <span className="font-semibold text-text-primary">
                    {clientConfirmed
                      ? `ยืนยันแล้ว (${formatDbDate(
                          clientConfirmed,
                          i18n.language
                        )})`
                      : "รอยืนยัน"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-text-muted">Freelancer</span>
                  <span className="font-semibold text-text-primary">
                    {freelancerConfirmed
                      ? `ยืนยันแล้ว (${formatDbDate(
                          freelancerConfirmed,
                          i18n.language
                        )})`
                      : "รอยืนยัน"}
                  </span>
                </div>

                {!allMilestonesDone && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    ต้องอนุมัติ Milestone ทั้งหมดก่อนจึงจะยืนยันจบงานได้
                  </div>
                )}

                {canConfirm && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full rounded-lg bg-lime-600 px-4 py-2 text-white font-semibold hover:bg-lime-700"
                  >
                    ยืนยันจบงาน
                  </button>
                )}

                {!canConfirm && allMilestonesDone && (
                  <div className="text-xs text-text-muted">
                    คุณได้ยืนยันจบงานแล้ว หรือยังไม่ใช่ผู้ที่ต้องยืนยัน
                  </div>
                )}

                {canReview && (
                  hasReviewed === false ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <HiOutlineStar className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            รีวิวให้ {freelancerName}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            แชร์ประสบการณ์ของคุณเพื่อช่วย community และ freelancer คนอื่น ๆ
                          </p>
                          {reviewDaysLeft !== null && (
                            <p className={`text-xs mt-1 font-medium ${
                              reviewDaysLeft <= 3 ? "text-red-500" : "text-amber-600"
                            }`}>
                              {reviewDaysLeft > 0
                                ? `⏳ เหลือเวลารีวิว ${reviewDaysLeft} วัน`
                                : "⚠️ หมดเวลารีวิวแล้ว"}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          navigate(
                            `/app/reviews/create?projectId=${id}&revieweeId=${encodeURIComponent(freelancerId ?? "")}&revieweeName=${encodeURIComponent(freelancerName)}&projectTitle=${encodeURIComponent(project.title)}`
                          )
                        }
                        className="w-full rounded-lg bg-amber-500 px-4 py-2 text-white text-sm font-semibold hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <HiOutlineStar className="w-4 h-4" />
                        เขียนรีวิว
                      </button>
                    </div>
                  ) : hasReviewed === true ? (
                    <div className="rounded-xl border border-lime-200 bg-lime-50 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-lime-700">
                        <HiOutlineStar className="w-5 h-5 fill-lime-500 text-lime-500" />
                        <span className="text-sm font-semibold">รีวิวของคุณถูกส่งแล้ว</span>
                      </div>
                      <p className="text-xs text-lime-600">
                        ขอบคุณที่ช่วยให้ระบบน่าเชื่อถือมากขึ้น
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmModal}
        loading={confirming}
        title="ยืนยันจบงาน"
        description="เมื่อยืนยันแล้ว ระบบจะปิดโปรเจกต์เมื่อทั้งสองฝ่ายยืนยันครบ"
        confirmText="ยืนยัน"
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCompletion}
      />

      {fundModal && id && (
        <MilestoneFundModal
          projectId={id}
          milestone={fundModal}
          onSuccess={() => {
            setFundModal(null);
            loadWorkspace();
          }}
          onClose={() => setFundModal(null)}
        />
      )}
    </div>
  );
}
