import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  File as FileIcon,
  FileArchive,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import {
  fetchMilestoneSubmissions,
  fetchProjectWorkspace,
  releaseMilestonePayment,
  reviewMilestoneSubmission,
} from "@/services/projects/project";
import type {
  MilestoneBoardItem,
  MilestoneSubmission,
  ProjectWorkspace,
} from "@/services/projects/project.types";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { useToast } from "@/components/ui/Toast";
import { formatDbDate } from "@/utils/date";
import { authHttp } from "@/lib/authHttp";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

type SubmissionWithFiles = MilestoneSubmission & {
  attachments?: string[] | null;
  files?: Array<
    | string
    | {
        file_id?: string | null;
        file_url?: string | null;
        original_name?: string | null;
      }
  > | null;
  file_urls?: string[] | null;
};

type SubmissionFileEntry = {
  url: string;
  name?: string | null;
};

function formatDbDateTime(value?: string | null, locale: string = "en") {
  if (!value) return "-";
  const isoLike = value.replace(" ", "T");
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileExtension(filename: string) {
  const ext = filename.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

function getFileCategory(ext: string) {
  const upper = ext.toUpperCase();
  if (["PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG"].includes(upper)) {
    return "image";
  }
  if (["PDF", "DOC", "DOCX", "TXT", "MD"].includes(upper)) {
    return "document";
  }
  if (["ZIP", "RAR", "7Z"].includes(upper)) {
    return "archive";
  }
  return "file";
}

function getFileNameFromUrl(value: string) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const raw = segments[segments.length - 1];
    if (!raw) return value;
    const decoded = decodeURIComponent(raw);
    if (decoded === "content" || decoded === "download") {
      const maybeId = segments[segments.length - 2];
      if (maybeId && maybeId.length >= 8) return `file-${maybeId.slice(0, 8)}`;
    }
    return decoded;
  } catch {
    const segments = value.split("/").filter(Boolean);
    const raw = segments[segments.length - 1] || value;
    if (raw === "content" || raw === "download") {
      const maybeId = segments[segments.length - 2];
      if (maybeId && maybeId.length >= 8) return `file-${maybeId.slice(0, 8)}`;
    }
    return raw;
  }
}

function extractSubmissionFiles(submission: MilestoneSubmission | null): SubmissionFileEntry[] {
  if (!submission) return [];
  const enriched = submission as SubmissionWithFiles;
  const entries: SubmissionFileEntry[] = [];
  for (const item of enriched.files ?? []) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) entries.push({ url: trimmed });
      continue;
    }
    const fallbackUrl = item?.file_id ? `/api/files/${item.file_id}/content` : "";
    const url = (item?.file_url?.trim() || fallbackUrl).trim();
    if (url) entries.push({ url, name: item.original_name ?? null });
  }
  for (const url of [...(enriched.attachments ?? []), ...(enriched.file_urls ?? [])]) {
    const trimmed = String(url ?? "").trim();
    if (trimmed) entries.push({ url: trimmed });
  }

  const dedup = new Map<string, SubmissionFileEntry>();
  for (const entry of entries) {
    const prev = dedup.get(entry.url);
    if (!prev || (!prev.name && entry.name)) {
      dedup.set(entry.url, entry);
    }
  }
  return Array.from(dedup.values());
}

function stripFileLinksFromMessage(message?: string | null) {
  if (!message) return "";
  return message
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      const isUrlOnly = /^https?:\/\/\S+$/i.test(trimmed);
      const isFileLink = /\.(png|jpe?g|gif|webp|svg|pdf|psd|ai|zip|rar|7z|docx?|xlsx?|txt|mp4|webm)(\?|#|$)/i.test(
        trimmed
      );
      return !(isUrlOnly && isFileLink);
    })
    .join("\n")
    .trim();
}

export default function MilestoneReviewPage() {
  const { id, milestoneId } = useParams<{ id: string; milestoneId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [submissions, setSubmissions] = useState<MilestoneSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState<"approve" | "revision" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "revision" | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchProjectWorkspace(id),
      authService.getCurrentUser().catch(() => null),
    ])
      .then(([workspaceRes, user]) => {
        setWorkspace(workspaceRes.data);
        setCurrentUser(user);
      })
      .catch(() => {
        setError(t("common.error"));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    if (!id || !milestoneId) return;
    setSubmissionLoading(true);
    fetchMilestoneSubmissions(id, milestoneId)
      .then((res) => setSubmissions(res.data ?? []))
      .catch(() => setSubmissions([]))
      .finally(() => setSubmissionLoading(false));
  }, [id, milestoneId]);

  const milestone = useMemo<MilestoneBoardItem | null>(() => {
    if (!workspace || !milestoneId) return null;
    return workspace.milestones?.find((m) => m.id === milestoneId) ?? null;
  }, [workspace, milestoneId]);

  const targetSubmission = useMemo(
    () => {
      const sorted = submissions
        .slice()
        .sort((a, b) => {
          const revA = Number(a.revision_number ?? 0);
          const revB = Number(b.revision_number ?? 0);
          if (revA !== revB) return revB - revA;
          const timeA = new Date(a.submitted_at ?? 0).getTime();
          const timeB = new Date(b.submitted_at ?? 0).getTime();
          return timeB - timeA;
        });
      return (
        sorted.find(
          (submission) =>
            submission.status === "submitted" || submission.status === "pending"
        ) ??
        sorted[0] ??
        null
      );
    },
    [submissions]
  );

  const submissionFiles = useMemo(
    () => extractSubmissionFiles(targetSubmission),
    [targetSubmission]
  );

  const fileItems = useMemo(
    () =>
      submissionFiles.map((entry) => {
        const fileName = (entry.name ?? "").trim() || getFileNameFromUrl(entry.url);
        const extension = getFileExtension(fileName);
        const category = getFileCategory(extension);
        return { url: entry.url, fileName, extension, category };
      }),
    [submissionFiles]
  );

  useEffect(() => {
    let disposed = false;
    const objectUrls: string[] = [];

    const loadImagePreviews = async () => {
      const previewMap: Record<string, string> = {};
      for (const item of fileItems) {
        if (item.category !== "image") continue;
        if (/^https?:\/\//i.test(item.url)) {
          previewMap[item.url] = item.url;
          continue;
        }
        try {
          const normalized = item.url.startsWith("/api/") ? item.url.slice(4) : item.url;
          const res = await authHttp.get<Blob>(normalized, {
            responseType: "blob",
          });
          const objectUrl = URL.createObjectURL(res.data);
          objectUrls.push(objectUrl);
          previewMap[item.url] = objectUrl;
        } catch {
          // Keep fallback icon if preview loading fails.
        }
      }
      if (!disposed) {
        setImagePreviewUrls(previewMap);
      } else {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    };

    loadImagePreviews();

    return () => {
      disposed = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fileItems]);

  const workflowLabel = (status?: string | null) => {
    if (status === "review") return t("project.managePage.badges.inReview");
    if (status === "done") return t("project.managePage.badges.done");
    return t("project.managePage.badges.inProgress");
  };
  const workflowBadgeClass = (status?: string | null) => {
    if (status === "review") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "done") return "bg-lime-100 text-lime-700 border-lime-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const submissionStatusLabel = (status?: string | null) => {
    if (status === "none") return t("project.managePage.badges.uncomplete");
    if (status === "pending") return t("project.managePage.badges.submitted");
    if (status === "submitted") return t("project.managePage.badges.submitted");
    if (status === "approved") return t("project.managePage.badges.approved");
    if (status === "rejected" || status === "revision_requested") {
      return t("project.managePage.badges.revisionRequested");
    }
    return status || "-";
  };
  const submissionStatusBadgeClass = (status?: string | null) => {
    if (status === "approved") return "bg-lime-100 text-lime-700 border-lime-200";
    if (status === "rejected") return "bg-red-100 text-red-800 border-red-200";
    if (status === "revision_requested") return "bg-orange-100 text-orange-800 border-orange-200";
    if (status === "submitted") return "bg-violet-100 text-violet-800 border-violet-200";
    if (status === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };
  const fundingStatusLabel = (status?: string | null) => {
    if (status === "released") return t("project.managePage.badges.released");
    if (status === "funded") return t("project.managePage.badges.funded");
    if (status === "unfunded") return t("project.managePage.badges.unfunded");
    return t("project.managePage.badges.unfunded");
  };
  const fundingStatusBadgeClass = (status?: string | null) => {
    if (status === "released") return "bg-lime-100 text-lime-700 border-lime-200";
    if (status === "funded") return "bg-indigo-100 text-indigo-800 border-indigo-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const clientId =
    workspace?.assignment?.client_id ??
    (workspace?.project as { client_id?: string | null } | undefined)?.client_id ??
    workspace?.project?.client?.id ??
    (workspace?.project as { owner_id?: string | null } | undefined)?.owner_id ??
    null;
  const freelancerId =
    workspace?.assignment?.freelancer_id ??
    (workspace?.project as { freelancer_id?: string | null } | undefined)?.freelancer_id ??
    workspace?.project?.freelancer?.id ??
    null;

  const isClientReviewer =
    !!currentUser &&
    !!clientId &&
    clientId === currentUser.id;

  const isAssignee =
    !!currentUser &&
    !!freelancerId &&
    freelancerId === currentUser.id;

  const canReview =
    isClientReviewer &&
    !!milestone &&
    !!targetSubmission &&
    (targetSubmission.status === "submitted" || targetSubmission.status === "pending");
  const reviewedStatus = String(targetSubmission?.status ?? "").toLowerCase();
  const hasReviewedAction =
    !!targetSubmission &&
    reviewedStatus !== "submitted" &&
    reviewedStatus !== "pending";

  const handleApproveAndRelease = async () => {
    if (!id || !milestone || !targetSubmission || !canReview || reviewLoading) return;
    try {
      setReviewLoading("approve");
      await reviewMilestoneSubmission(
        id,
        milestone.id,
        targetSubmission.id,
        { action: "approve" }
      );
    } catch {
      showToast(t("project.reviewSubmissionPage.toast.approveError"), "error");
      setReviewLoading(null);
      return;
    }
    // Review succeeded — navigate away before attempting payment release
    // so a payment failure cannot leave the page open on an already-approved submission.
    showToast(t("project.reviewSubmissionPage.toast.approveSuccess"), "success");
    setReviewLoading(null);
    navigate(`/app/projects/${id}/manage`);
    try {
      await releaseMilestonePayment(id, milestone.id, {});
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Submission approved, but payment was not released.";
      showToast(message, "error");
    }
  };

  const handleOpenApproveConfirm = () => {
    if (!canReview || reviewLoading) return;
    setConfirmAction("approve");
  };

  const handleRequestRevision = async () => {
    if (!id || !milestone || !targetSubmission || !canReview || reviewLoading) return;
    if (!revisionMessage.trim()) {
      showToast(t("project.reviewSubmissionPage.errors.revisionRequired"), "error");
      return;
    }
    try {
      setReviewLoading("revision");
      await reviewMilestoneSubmission(
        id,
        milestone.id,
        targetSubmission.id,
        {
          action: "reject",
          feedback: revisionMessage.trim(),
        }
      );
      showToast(t("project.reviewSubmissionPage.toast.revisionSuccess"), "success");
      navigate(`/app/projects/${id}/manage`);
    } catch {
      showToast(t("project.reviewSubmissionPage.toast.revisionError"), "error");
    } finally {
      setReviewLoading(null);
    }
  };

  const handleOpenRevisionConfirm = () => {
    if (!canReview || reviewLoading) return;
    if (!revisionMessage.trim()) {
      showToast(t("project.reviewSubmissionPage.errors.revisionRequired"), "error");
      return;
    }
    setConfirmAction("revision");
  };

  const handleConfirmReviewAction = async () => {
    const action = confirmAction;
    if (!action) return;
    try {
      if (action === "approve") {
        await handleApproveAndRelease();
        return;
      }
      if (action === "revision") {
        await handleRequestRevision();
        return;
      }
    } finally {
      setConfirmAction(null);
    }
  };

  const handleOpenDispute = () => {
    if (!id || !milestoneId || !workspace?.assignment) {
      showToast("ไม่พบข้อมูลที่จำเป็น", "error");
      return;
    }
    const params = new URLSearchParams({
      projectId: id,
      milestoneId,
      assignmentId: workspace.assignment.id,
    });
    navigate(`/app/disputes/open?${params.toString()}`);
  };

  const handleDownloadFile = async (url: string, filename?: string) => {
    try {
      if (/^https?:\/\//i.test(url)) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "file";
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      const normalized = url.startsWith("/api/") ? url.slice(4) : url;
      const res = await authHttp.get<Blob>(normalized, {
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || "file";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      showToast(t("common.error"), "error");
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">{t("loading")}</div>;
  }

  if (error || !workspace?.project) {
    return <div className="p-6 text-sm text-danger">{error ?? t("common.error")}</div>;
  }

  if (!milestone) {
    return <div className="p-6 text-sm text-text-muted">{t("project.reviewSubmissionPage.errors.notFound")}</div>;
  }

  if (!isClientReviewer && !isAssignee) {
    return (
      <div className="p-6 text-sm text-text-muted">
        ไม่มีสิทธิ์เข้าถึงหน้านี้
      </div>
    );
  }

  const due = milestone.due_date ? formatDbDate(milestone.due_date, i18n.language) : "-";
  const submittedAt = formatDbDateTime(targetSubmission?.submitted_at, i18n.language);
  const currency = milestone.currency ?? workspace.project.currency ?? "";
  const amount = Number(milestone.amount ?? 0);
  const freelancerReceives = amount;
  const projectFreelancer = workspace.project.freelancer;
  const freelancerLabel =
    (projectFreelancer?.display_name ?? "").trim() ||
    (projectFreelancer?.username ? `@${projectFreelancer.username}` : "") ||
    (freelancerId ? `#${freelancerId.slice(0, 8)}` : "-");
  const freelancerAvatarUrl = projectFreelancer?.avatar_url ?? undefined;
  const freelancerFallbackSource =
    (projectFreelancer?.display_name ?? "").trim() ||
    (projectFreelancer?.username ?? "").trim() ||
    "F";
  const freelancerFallback = freelancerFallbackSource.charAt(0).toUpperCase();

  return (
    <div className="p-6 space-y-6">
      <div>
        <button
          onClick={() => navigate(`/app/projects/${id}`)}
          className="mb-2 text-sm text-primary hover:underline"
        >
          ← {t("project.backToDetail")}
        </button>
        <h1 className="text-2xl font-semibold text-text-primary">
          {t("project.reviewSubmissionPage.title")}
        </h1>
        <p className="text-base text-text-muted">
          {workspace.project.title}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-white p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-text-muted mb-1">
                  {t("project.submitWork.milestoneLabel")}
                </div>
                <div className="text-xl font-semibold text-text-primary">
                  {milestone.title || t("project.submitWork.untitledMilestone")}
                </div>
              </div>
              <span
                className={[
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                  submissionStatusBadgeClass(targetSubmission?.status),
                ].join(" ")}
              >
                {submissionStatusLabel(targetSubmission?.status)}
              </span>
            </div>
            {milestone.description && (
              <div className="text-base text-text-muted mt-1">
                {milestone.description}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface/50 p-3">
                <div className="text-xs text-text-muted">
                  {t("project.reviewSubmissionPage.summary.amount")}
                </div>
                <div className="text-base font-semibold text-text-primary">
                  {amount.toLocaleString()} {currency}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface/50 p-3">
                <div className="text-xs text-text-muted">
                  {t("project.reviewSubmissionPage.summary.dueDate")}
                </div>
                <div className="text-base font-semibold text-text-primary">
                  {due}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <div className="text-base font-semibold text-text-primary mb-3">
              {t("project.reviewSubmissionPage.submittedFiles")}
            </div>

            {submissionLoading ? (
              <div className="text-sm text-text-muted">{t("loading")}</div>
            ) : fileItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">
                {t("project.reviewSubmissionPage.noSubmittedFiles")}
              </div>
            ) : (
              <div className="space-y-2">
                {fileItems.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => handleDownloadFile(item.url, item.fileName)}
                    className="w-full flex items-center justify-between rounded-lg border border-border bg-white p-3 hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg border border-border bg-surface overflow-hidden shrink-0 flex items-center justify-center text-text-muted">
                        {item.category === "image" && imagePreviewUrls[item.url] ? (
                          <img
                            src={imagePreviewUrls[item.url]}
                            alt={item.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            {item.category === "archive" && <FileArchive className="w-4 h-4" />}
                            {item.category === "document" && <FileText className="w-4 h-4" />}
                            {item.category === "image" && <ImageIcon className="w-4 h-4" />}
                            {item.category === "file" && <FileIcon className="w-4 h-4" />}
                          </>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {item.fileName}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {item.extension}
                        </div>
                      </div>
                    </div>
                    <div
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-primary"
                      aria-label="download-file"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-text-muted mb-1">
                {t("project.reviewSubmissionPage.freelancerNote")}
              </div>
              <div className="text-sm text-text-primary whitespace-pre-wrap break-words">
                {stripFileLinksFromMessage(targetSubmission?.message) || "-"}
              </div>
            </div>
          </div>

          {isClientReviewer && (
            <div className="rounded-xl border border-border bg-white p-6 space-y-3">
              <div className="text-base font-semibold text-text-primary">
                {t("project.reviewSubmissionPage.reviewActions")}
              </div>

              {!targetSubmission && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {t("project.reviewSubmissionPage.errors.noSubmission")}
                </div>
              )}

              {canReview && (
                <>
                  <div className="rounded-xl border border-lime-200 bg-lime-50/70 p-4">
                    <div className="flex items-center gap-2 text-lime-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      {t("project.reviewSubmissionPage.approve.title")}
                    </div>
                    <div className="text-sm text-lime-800/90 mt-1">
                      {t("project.reviewSubmissionPage.approve.description")}
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenApproveConfirm}
                      disabled={!canReview || reviewLoading !== null}
                      className="mt-3 px-4 py-2 rounded-lg bg-lime-600 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {reviewLoading === "approve"
                        ? t("loading")
                        : t("project.reviewSubmissionPage.approve.button")}
                    </button>
                  </div>

                  <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
                      <ImageIcon className="w-4 h-4" />
                      {t("project.reviewSubmissionPage.revision.title")}
                    </div>
                    <div className="text-sm text-amber-900/90 mt-1">
                      {t("project.reviewSubmissionPage.revision.description")}
                    </div>
                    <textarea
                      value={revisionMessage}
                      onChange={(event) => setRevisionMessage(event.target.value)}
                      placeholder={t("project.reviewSubmissionPage.revision.placeholder")}
                      className="w-full mt-3 min-h-[110px] rounded-lg border border-amber-200 bg-white p-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleOpenRevisionConfirm}
                      disabled={!canReview || reviewLoading !== null}
                      className="mt-3 px-4 py-2 rounded-lg border border-amber-300 bg-white text-amber-900 text-sm font-semibold disabled:opacity-60"
                    >
                      {reviewLoading === "revision"
                        ? t("loading")
                        : t("project.reviewSubmissionPage.revision.button")}
                    </button>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                    <div className="flex items-center gap-2 text-rose-800 font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      {t("project.reviewSubmissionPage.dispute.title")}
                    </div>
                    <div className="text-sm text-rose-800/90 mt-1">
                      {t("project.reviewSubmissionPage.dispute.description")}
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenDispute}
                      className="mt-3 px-4 py-2 rounded-lg border border-rose-300 bg-white text-rose-800 text-sm font-semibold"
                    >
                      {t("project.reviewSubmissionPage.dispute.button")}
                    </button>
                  </div>
                </>
              )}

              {hasReviewedAction && reviewedStatus === "approved" && (
                <div className="rounded-xl border border-lime-200 bg-lime-50/70 p-4">
                  <div className="flex items-center gap-2 text-lime-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("project.reviewSubmissionPage.approve.title")}
                  </div>
                  <div className="text-sm text-lime-800/90 mt-1">
                    {t("project.reviewSubmissionPage.approve.description")}
                  </div>
                </div>
              )}

              {hasReviewedAction &&
                (reviewedStatus === "rejected" || reviewedStatus === "revision_requested") && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <ImageIcon className="w-4 h-4" />
                    {t("project.reviewSubmissionPage.revision.title")}
                  </div>
                  <div className="text-sm text-amber-900/90 mt-1">
                    {t("project.reviewSubmissionPage.revision.description")}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6 space-y-4 h-fit">
          <div className="text-base font-semibold text-text-primary">
            {t("project.reviewSubmissionPage.details.title")}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {t("project.reviewSubmissionPage.details.milestoneAmount")}
              </span>
              <span className="font-semibold text-text-primary">
                {amount.toLocaleString()} {currency}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="font-semibold text-text-primary">
                {t("project.reviewSubmissionPage.details.freelancerReceives")}
              </span>
              <span className="font-semibold text-lime-600">
                {freelancerReceives.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {t("project.reviewSubmissionPage.summary.freelancer")}
              </span>
              <span className="inline-flex items-center gap-2 min-w-0 max-w-[65%]">
                <Avatar
                  src={freelancerAvatarUrl}
                  alt={freelancerLabel}
                  fallback={freelancerFallback}
                  size="sm"
                />
                <span className="font-semibold text-text-primary truncate">
                  {freelancerLabel}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {t("project.reviewSubmissionPage.details.dueDate")}
              </span>
              <span className="font-semibold text-text-primary">{due}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {t("project.reviewSubmissionPage.details.status")}
              </span>
              <span
                className={[
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                  targetSubmission
                    ? submissionStatusBadgeClass(targetSubmission.status)
                    : workflowBadgeClass(milestone.workflow_status),
                ].join(" ")}
              >
                {targetSubmission
                  ? submissionStatusLabel(targetSubmission.status)
                  : workflowLabel(milestone.workflow_status)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {t("project.reviewSubmissionPage.details.paidStatus")}
              </span>
              <span
                className={[
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                  fundingStatusBadgeClass(milestone.funding_status),
                ].join(" ")}
              >
                {fundingStatusLabel(milestone.funding_status)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {t("project.reviewSubmissionPage.details.submittedAt")}
              </span>
              <span className="font-semibold text-text-primary">{submittedAt}</span>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="font-semibold mb-2 text-text-primary">
              {t("project.reviewSubmissionPage.tips.title")}
            </div>
            <ul className="text-sm text-text-muted space-y-1">
              <li>• {t("project.reviewSubmissionPage.tips.items.files")}</li>
              <li>• {t("project.reviewSubmissionPage.tips.items.scope")}</li>
              <li>• {t("project.reviewSubmissionPage.tips.items.feedback")}</li>
              <li>• {t("project.reviewSubmissionPage.tips.items.dispute")}</li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === "approve"
            ? t("project.reviewSubmissionPage.approve.confirmTitle", {
                defaultValue: "Confirm Approval",
              })
            : t("project.reviewSubmissionPage.revision.confirmTitle", {
                defaultValue: "Confirm Rejection",
              })
        }
        description={
          confirmAction === "approve"
            ? t("project.reviewSubmissionPage.approve.confirmDescription", {
                defaultValue:
                  "Are you sure you want to approve this submission and release payment?",
              })
            : t("project.reviewSubmissionPage.revision.confirmDescription", {
                defaultValue:
                  "Are you sure you want to reject this submission and request a revision?",
              })
        }
        confirmText={
          confirmAction === "approve"
            ? t("project.reviewSubmissionPage.approve.button")
            : t("project.reviewSubmissionPage.revision.button")
        }
        variant={confirmAction === "revision" ? "danger" : "default"}
        loading={reviewLoading !== null}
        onCancel={() => {
          if (reviewLoading !== null) return;
          setConfirmAction(null);
        }}
        onConfirm={() => {
          void handleConfirmReviewAction();
        }}
      />
    </div>
  );
}
