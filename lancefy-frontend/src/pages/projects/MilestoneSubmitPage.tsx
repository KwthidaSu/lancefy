import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  File as FileIcon,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  fetchMilestoneSubmissions,
  fetchProjectWorkspace,
  submitMilestoneWork,
  uploadProjectSubmissionFile,
} from "@/services/projects/project";
import type {
  ProjectWorkspace,
  MilestoneBoardItem,
  MilestoneSubmission,
} from "@/services/projects/project.types";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { useToast } from "@/components/ui/Toast";
import { formatDbDate } from "@/utils/date";
import { authHttp } from "@/lib/authHttp";

const MAX_ATTACH_FILES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const REVISION_REQUEST_MARKER = "[REVISION_REQUEST]";

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
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

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

type SubmissionWithFiles = MilestoneSubmission & {
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

function splitRevisionFeedback(message?: string | null) {
  const raw = String(message ?? "");
  const markerIndex = raw.lastIndexOf(REVISION_REQUEST_MARKER);
  if (markerIndex < 0) {
    return {
      submissionNote: stripFileLinksFromMessage(raw),
      revisionFeedback: "",
    };
  }

  const submissionNote = stripFileLinksFromMessage(raw.slice(0, markerIndex));
  const revisionFeedback = raw
    .slice(markerIndex + REVISION_REQUEST_MARKER.length)
    .trim();

  return {
    submissionNote,
    revisionFeedback,
  };
}

export default function MilestoneSubmitPage() {
  const { id, milestoneId } = useParams<{ id: string; milestoneId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<MilestoneSubmission[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchProjectWorkspace(id)
      .then((res) => {
        setWorkspace(res.data);
      })
      .catch(() => {
        setError(t("common.error"));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!id || !milestoneId) return;
    fetchMilestoneSubmissions(id, milestoneId)
      .then((res) => setSubmissions(res.data ?? []))
      .catch(() => setSubmissions([]));
  }, [id, milestoneId]);

  const milestone = useMemo<MilestoneBoardItem | null>(() => {
    if (!workspace || !milestoneId) return null;
    return (
      workspace.milestones?.find((m) => m.id === milestoneId) ?? null
    );
  }, [workspace, milestoneId]);

  const fileItems = useMemo(
    () =>
      files.map((file) => {
        const extension = getFileExtension(file.name);
        const category = getFileCategory(extension);
        return {
          file,
          key: getFileKey(file),
          extension,
          category,
          previewUrl: category === "image" ? URL.createObjectURL(file) : null,
        };
      }),
    [files]
  );

  const totalAttachedSize = useMemo(
    () => files.reduce((sum, file) => sum + (file.size || 0), 0),
    [files]
  );

  useEffect(() => {
    return () => {
      fileItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [fileItems]);

  const assigneeId =
    workspace?.assignment?.freelancer_id ??
    (workspace?.project as { freelancer_id?: string | null } | undefined)?.freelancer_id ??
    workspace?.project?.freelancer?.id ??
    null;

  const isAssignee = !!assigneeId && !!currentUser && assigneeId === currentUser.id;

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    handleAppendFiles(list);
    e.currentTarget.value = "";
  };

  const handleAppendFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const next: File[] = [...files];
    const existingKeys = new Set(
      files.map(getFileKey)
    );

    let tooLargeCount = 0;
    let duplicateCount = 0;
    let overflowCount = 0;

    for (const file of incoming) {
      const key = getFileKey(file);

      if (existingKeys.has(key)) {
        duplicateCount += 1;
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        tooLargeCount += 1;
        continue;
      }

      if (next.length >= MAX_ATTACH_FILES) {
        overflowCount += 1;
        continue;
      }

      existingKeys.add(key);
      next.push(file);
    }

    setFiles(next);

    if (tooLargeCount || duplicateCount || overflowCount) {
      const parts: string[] = [];
      if (tooLargeCount) parts.push(`ไฟล์เกิน 20MB: ${tooLargeCount}`);
      if (duplicateCount) parts.push(`ไฟล์ซ้ำ: ${duplicateCount}`);
      if (overflowCount) parts.push(`เกินจำนวนสูงสุด ${MAX_ATTACH_FILES} ไฟล์`);
      setFileError(parts.join(" • "));
    } else {
      setFileError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    handleAppendFiles(dropped);
  };

  const handleRemoveFile = (target: File) => {
    setFiles((prev) =>
      prev.filter(
        (f) =>
          !(f.name === target.name && f.size === target.size && f.lastModified === target.lastModified)
      )
    );
  };

  const handleClearFiles = () => {
    setFiles([]);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenFile = async (url: string, filename?: string) => {
    try {
      if (/^https?:\/\//i.test(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const normalized = url.startsWith("/api/") ? url.slice(4) : url;
      const res = await authHttp.get<Blob>(normalized, {
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(res.data);
      const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename || "file";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      showToast(t("common.error"), "error");
    }
  };

  const handleSubmit = async () => {
    if (!id || !milestoneId || submitting) return;
    if (
      milestone &&
      (milestone.sequence ?? 0) > 1 &&
      (workspace?.milestones ?? []).some(
        (prev) =>
          (prev.sequence ?? 0) < (milestone.sequence ?? 0) &&
          prev.workflow_status !== "done"
      )
    ) {
      showToast(t("project.submitWork.errors.previousMilestoneRequired"), "error");
      return;
    }
    if (milestone?.submission_status === "submitted") {
      showToast(t("project.submitWork.errors.alreadySubmitted"), "error");
      return;
    }
    if (milestone?.submission_status === "approved" || milestone?.workflow_status === "done") {
      showToast(t("project.submitWork.errors.alreadyApproved"), "error");
      return;
    }
    try {
      setSubmitting(true);
      // Upload files to /files/upload first, then submit with file_ids.
      const uploaded: { id: string; url: string }[] = [];
      for (const file of files) {
        const res = await uploadProjectSubmissionFile(file);
        uploaded.push({ id: res.id, url: res.url });
      }
      await submitMilestoneWork(id, milestoneId, {
        message: message.trim() || undefined,
        file_ids: uploaded.map((item) => item.id),
      });
      showToast(t("project.submitWork.toast.success"), "success");
      navigate(`/app/projects/${id}`);
    } catch (err) {
      const detail =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      if (detail) {
        showToast(detail, "error");
      } else {
        showToast(t("project.submitWork.toast.error"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

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

  if (!milestone) {
    return (
      <div className="p-6 text-sm text-text-muted">
        {t("project.submitWork.errors.notFound")}
      </div>
    );
  }

  if (!isAssignee) {
    return (
      <div className="p-6 text-sm text-text-muted">
        {t("project.submitWork.errors.onlyAssignee")}
      </div>
    );
  }

  const due = milestone.due_date
    ? formatDbDate(milestone.due_date, i18n.language)
    : "-";
  const latestSubmission =
    submissions
      .slice()
      .sort((a, b) => {
        const revA = Number(a.revision_number ?? 0);
        const revB = Number(b.revision_number ?? 0);
        if (revA !== revB) return revB - revA;
        const timeA = new Date(a.submitted_at ?? 0).getTime();
        const timeB = new Date(b.submitted_at ?? 0).getTime();
        return timeB - timeA;
      })[0] ?? null;
  const latestSubmissionStatus = String(
    latestSubmission?.status ?? milestone.submission_status ?? "none"
  ).toLowerCase();
  const isPendingReview =
    latestSubmissionStatus === "pending" || latestSubmissionStatus === "submitted";
  const isApproved =
    latestSubmissionStatus === "approved" ||
    milestone.workflow_status === "done";
  const isRevisionRequested =
    latestSubmissionStatus === "rejected" || latestSubmissionStatus === "revision_requested";
  const hasPreviousIncomplete =
    (milestone.sequence ?? 0) > 1 &&
    (workspace.milestones ?? []).some(
      (prev) =>
        (prev.sequence ?? 0) < (milestone.sequence ?? 0) &&
        prev.workflow_status !== "done"
    );
  const hasMinimumPayload = files.length > 0 && message.trim().length > 0;
  const canSubmit = !isPendingReview && !isApproved && !hasPreviousIncomplete && hasMinimumPayload;
  const statusLabel = isApproved
    ? t("project.managePage.badges.approved")
    : isRevisionRequested
      ? t("project.managePage.badges.revisionRequested")
      : isPendingReview
        ? t("project.managePage.badges.submitted")
        : t("project.managePage.badges.inProgress");
  const statusBadgeClass = isApproved
    ? "bg-lime-100 text-lime-700 border-lime-200"
    : isRevisionRequested
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : isPendingReview
        ? "bg-violet-100 text-violet-800 border-violet-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  const latestSubmissionFiles = extractSubmissionFiles(latestSubmission);
  const latestSubmissionDate = formatDbDateTime(latestSubmission?.submitted_at, i18n.language);
  const { submissionNote: latestSubmissionNote, revisionFeedback: latestRevisionFeedback } =
    splitRevisionFeedback(latestSubmission?.message);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {t("project.submitWork.title")}
        </h1>
        <p className="text-base text-text-muted">
          {workspace.project.title}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-white p-6 space-y-6">
          <div>
            <div className="text-xs text-text-muted mb-1">
              {t("project.submitWork.milestoneLabel")}
            </div>
            <div className="text-xl font-semibold text-text-primary">
              {milestone.title || t("project.submitWork.untitledMilestone")}
            </div>
            {milestone.description && (
              <div className="text-base text-text-muted mt-1">
                {milestone.description}
              </div>
            )}
          </div>

          <div>
            <div className="text-base font-semibold text-text-primary mb-2">
              {t("project.submitWork.uploadFiles")}
            </div>
            {isRevisionRequested && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-semibold text-amber-800">
                  {t("project.managePage.badges.revisionRequested", {
                    defaultValue: "Revision Request",
                  })}
                </div>
                <div className="mt-1 text-sm text-amber-800 whitespace-pre-wrap break-words">
                  {latestRevisionFeedback ||
                    t("project.reviewSubmissionPage.revision.description", {
                      defaultValue: "Client requested updates before resubmission.",
                    })}
                </div>
              </div>
            )}
            {/* <div className="rounded-2xl border border-border bg-surface/20 p-2 md:p-5"> */}
              <div
                className={[
                  "border-2 border-dashed rounded-xl p-5 md:p-6 transition-colors text-center",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/60 bg-white",
                ].join(" ")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <div className="mx-auto w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-text-muted">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="mt-3 text-sm font-semibold text-text-primary">
                  แนบไฟล์งานของไมล์สโตนนี้
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {t("project.submitWork.dragAndDrop")} • {t("project.submitWork.fileTypes")}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-text-primary hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("project.submitWork.clickToUpload")}
                  </button>
                  {files.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFiles}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-text-muted hover:text-danger hover:border-danger/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ล้างไฟล์ทั้งหมด
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-border bg-white px-3 py-2 flex items-center justify-between text-xs">
                <div className="text-text-muted">
                  แนบแล้ว {files.length}/{MAX_ATTACH_FILES} ไฟล์
                </div>
                <div className="font-medium text-text-primary">
                  รวม {formatFileSize(totalAttachedSize)}
                </div>
              </div>
            {/* </div> */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar,.7z,.psd,.ai,.mp4,.webm"
              className="hidden"
              onChange={handleFilePick}
            />
            {fileError && (
              <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {fileError}
              </div>
            )}
            {fileItems.length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {fileItems.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-border bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-start gap-3">
                        <div className="w-14 h-14 rounded-lg border border-border bg-surface overflow-hidden shrink-0 flex items-center justify-center text-text-muted">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
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
                            {item.file.name}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {formatFileSize(item.file.size)}
                          </div>
                          <div className="mt-2 inline-flex rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                            {item.extension}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.file)}
                        className="w-7 h-7 rounded-md border border-border text-text-muted hover:text-danger hover:border-danger/40 flex items-center justify-center shrink-0"
                        aria-label={`remove-${item.file.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-base font-semibold text-text-primary mb-2">
              {t("project.submitWork.submissionNotes")}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("project.submitWork.notesPlaceholder")}
              className="w-full min-h-[140px] rounded-lg border border-border p-3 text-base"
            />
            {!hasMinimumPayload && (
              <div className="mt-2 text-xs text-text-muted">
                แนบไฟล์อย่างน้อย 1 ไฟล์ และกรอกหมายเหตุก่อนส่งงาน
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/app/projects/${id}/manage`)}
              className="px-4 py-2 rounded-lg border border-border bg-white text-base"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-base font-semibold disabled:opacity-60"
            >
              {t("project.submitWork.submit")}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 space-y-4">
          <div className="text-base font-semibold text-text-primary">
            {t("project.submitWork.details.title")}
          </div>
          <div>
            <div className="text-xs text-text-muted">
              {t("project.submitWork.details.amount")}
            </div>
            <div className="text-xl font-semibold">
              {milestone.amount?.toLocaleString?.() ?? milestone.amount ?? "-"} {milestone.currency ?? workspace.project.currency}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">
              {t("project.submitWork.details.dueDate")}
            </div>
            <div className="text-base font-semibold">{due}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">
              {t("project.submitWork.details.status")}
            </div>
            <div
              className={[
                "mt-1 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                statusBadgeClass,
              ].join(" ")}
            >
              {statusLabel}
            </div>
          </div>

          {latestSubmission && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-sm font-semibold text-text-primary">
                {t("project.submitWork.details.submissionDetail")}
              </div>
              <div className="text-xs text-text-muted">
                {t("project.submitWork.details.lastSubmitted")}: {latestSubmissionDate}
                {latestSubmission.revision_number ? ` • รอบที่ ${latestSubmission.revision_number}` : ""}
              </div>
              {latestSubmissionNote && (
                <div className="rounded-lg border border-border bg-surface/40 p-2.5 text-xs text-text-primary whitespace-pre-wrap break-words">
                  {latestSubmissionNote}
                </div>
              )}
              {latestSubmissionFiles.length > 0 && (
                <div className="space-y-1">
                  {latestSubmissionFiles.map((entry) => (
                    <button
                      key={entry.url}
                      type="button"
                      onClick={() =>
                        handleOpenFile(
                          entry.url,
                          (entry.name ?? "").trim() || getFileNameFromUrl(entry.url)
                        )
                      }
                      className="block w-full truncate text-left text-xs text-blue-700 hover:underline"
                    >
                      {(entry.name ?? "").trim() || getFileNameFromUrl(entry.url)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border pt-3 text-base">
            <div className="font-semibold mb-2">
              {t("project.submitWork.tips.title")}
            </div>
            <ul className="text-sm text-text-muted space-y-1">
              <li>• {t("project.submitWork.tips.items.upload")}</li>
              <li>• {t("project.submitWork.tips.items.notes")}</li>
              <li>• {t("project.submitWork.tips.items.review")}</li>
              <li>• {t("project.submitWork.tips.items.release")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
