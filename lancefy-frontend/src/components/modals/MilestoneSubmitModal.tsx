import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  submitMilestoneWork,
  uploadProjectSubmissionFile,
} from "@/services/projects/project";
import type { MilestoneBoardItem, MilestoneSubmission } from "@/services/projects/project.types";
import { authHttp } from "@/lib/authHttp";
import { useToast } from "@/components/ui/Toast";
import { formatDbDate } from "@/utils/date";

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
  if (["PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG"].includes(upper)) return "image";
  if (["PDF", "DOC", "DOCX", "TXT", "MD"].includes(upper)) return "document";
  if (["ZIP", "RAR", "7Z"].includes(upper)) return "archive";
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
    | { file_id?: string | null; file_url?: string | null; original_name?: string | null }
  > | null;
  file_urls?: string[] | null;
};

type SubmissionFileEntry = { url: string; name?: string | null };

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
    if (!prev || (!prev.name && entry.name)) dedup.set(entry.url, entry);
  }
  return Array.from(dedup.values());
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

function stripFileLinksFromMessage(message?: string | null) {
  if (!message) return "";
  return message
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      const isUrlOnly = /^https?:\/\/\S+$/i.test(trimmed);
      const isFileLink =
        /\.(png|jpe?g|gif|webp|svg|pdf|psd|ai|zip|rar|7z|docx?|xlsx?|txt|mp4|webm)(\?|#|$)/i.test(
          trimmed,
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
    return { submissionNote: stripFileLinksFromMessage(raw), revisionFeedback: "" };
  }
  return {
    submissionNote: stripFileLinksFromMessage(raw.slice(0, markerIndex)),
    revisionFeedback: raw.slice(markerIndex + REVISION_REQUEST_MARKER.length).trim(),
  };
}

function formatDbDateTime(value?: string | null, locale = "en") {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  open: boolean;
  projectId: string;
  milestone: MilestoneBoardItem;
  allMilestones: MilestoneBoardItem[];
  projectCurrency?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function MilestoneSubmitModal({
  open,
  projectId,
  milestone,
  allMilestones,
  projectCurrency,
  onClose,
  onSuccess,
}: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<MilestoneSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setFiles([]);
    setFileError(null);
    setSubmissions([]);
    setLoadingSubmissions(true);
    fetchMilestoneSubmissions(projectId, milestone.id)
      .then((res) => setSubmissions(res.data ?? []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoadingSubmissions(false));
  }, [open, projectId, milestone.id]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    [files],
  );

  useEffect(() => {
    return () => {
      fileItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [fileItems]);

  const totalAttachedSize = useMemo(() => files.reduce((sum, f) => sum + (f.size || 0), 0), [files]);

  const handleAppendFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const next: File[] = [...files];
    const existingKeys = new Set(files.map(getFileKey));
    let tooLargeCount = 0;
    let duplicateCount = 0;
    let overflowCount = 0;
    for (const file of incoming) {
      const key = getFileKey(file);
      if (existingKeys.has(key)) { duplicateCount += 1; continue; }
      if (file.size > MAX_FILE_SIZE_BYTES) { tooLargeCount += 1; continue; }
      if (next.length >= MAX_ATTACH_FILES) { overflowCount += 1; continue; }
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

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAppendFiles(Array.from(e.target.files || []));
    e.currentTarget.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleAppendFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleRemoveFile = (target: File) => {
    setFiles((prev) =>
      prev.filter(
        (f) => !(f.name === target.name && f.size === target.size && f.lastModified === target.lastModified),
      ),
    );
  };

  const handleOpenFile = async (url: string, filename?: string) => {
    try {
      if (/^https?:\/\//i.test(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const normalized = url.startsWith("/api/") ? url.slice(4) : url;
      const res = await authHttp.get<Blob>(normalized, { responseType: "blob" });
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

  const latestSubmission =
    submissions
      .slice()
      .sort((a, b) => {
        const revDiff = Number(b.revision_number ?? 0) - Number(a.revision_number ?? 0);
        if (revDiff !== 0) return revDiff;
        return new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime();
      })[0] ?? null;

  const latestStatus = String(
    latestSubmission?.status ?? milestone.submission_status ?? "none",
  ).toLowerCase();
  const isPendingReview = latestStatus === "pending" || latestStatus === "submitted";
  const isApproved = latestStatus === "approved" || milestone.workflow_status === "done";
  const isRevisionRequested = latestStatus === "rejected" || latestStatus === "revision_requested";
  const blockedBySequence =
    (milestone.sequence ?? 0) > 1 &&
    allMilestones.some(
      (prev) =>
        (prev.sequence ?? 0) < (milestone.sequence ?? 0) && prev.workflow_status !== "done",
    );

  const hasMinimumPayload = files.length > 0 && message.trim().length > 0;
  const canSubmit = !isPendingReview && !isApproved && !blockedBySequence && hasMinimumPayload;

  const latestSubmissionFiles = extractSubmissionFiles(latestSubmission);
  const { submissionNote: latestSubmissionNote, revisionFeedback: latestRevisionFeedback } =
    splitRevisionFeedback(latestSubmission?.message);

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

  const handleSubmit = async () => {
    if (!submitting && canSubmit) {
      try {
        setSubmitting(true);
        const uploaded: { id: string }[] = [];
        for (const file of files) {
          const res = await uploadProjectSubmissionFile(file);
          uploaded.push({ id: res.id });
        }
        await submitMilestoneWork(projectId, milestone.id, {
          message: message.trim() || undefined,
          file_ids: uploaded.map((item) => item.id),
        });
        showToast(t("project.submitWork.toast.success"), "success");
        onSuccess();
        onClose();
      } catch (err) {
        const detail =
          typeof err === "object" &&
          err !== null &&
          "response" in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : null;
        showToast(detail ?? t("project.submitWork.toast.error"), "error");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {t("project.submitWork.title")}
            </h2>
            <p className="text-sm text-text-muted mt-0.5 truncate max-w-xs">
              {milestone.title || t("project.submitWork.untitledMilestone")}
              {milestone.amount != null && (
                <span className="ml-2 font-medium text-text-primary">
                  {milestone.amount.toLocaleString()} {milestone.currency ?? projectCurrency}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass}`}
            >
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Revision request banner */}
          {isRevisionRequested && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-sm font-semibold text-amber-800">
                {t("project.managePage.badges.revisionRequested", { defaultValue: "Revision Request" })}
              </div>
              <div className="mt-1 text-sm text-amber-800 whitespace-pre-wrap break-words">
                {latestRevisionFeedback ||
                  t("project.reviewSubmissionPage.revision.description", {
                    defaultValue: "Client requested updates before resubmission.",
                  })}
              </div>
            </div>
          )}

          {/* Blocked by sequence */}
          {blockedBySequence && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {t("project.submitWork.errors.previousMilestoneRequired")}
            </div>
          )}

          {/* Already approved */}
          {isApproved && (
            <div className="rounded-lg border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-800">
              ✓{" "}
              {t("project.submitWork.errors.alreadyApproved", {
                defaultValue: "This milestone has already been approved.",
              })}
            </div>
          )}

          {/* Previous submission detail */}
          {!loadingSubmissions && latestSubmission && (
            <div className="rounded-lg border border-border bg-slate-50 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary">
                  {t("project.submitWork.details.submissionDetail")}
                </div>
                <div className="text-xs text-text-muted">
                  {formatDbDateTime(latestSubmission.submitted_at, i18n.language)}
                  {latestSubmission.revision_number
                    ? ` • รอบที่ ${latestSubmission.revision_number}`
                    : ""}
                </div>
              </div>
              {latestSubmissionNote && (
                <div className="text-sm text-text-primary whitespace-pre-wrap break-words">
                  {latestSubmissionNote}
                </div>
              )}
              {latestSubmissionFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {latestSubmissionFiles.map((entry) => (
                    <button
                      key={entry.url}
                      type="button"
                      onClick={() =>
                        handleOpenFile(
                          entry.url,
                          (entry.name ?? "").trim() || getFileNameFromUrl(entry.url),
                        )
                      }
                      className="inline-flex items-center gap-1.5 truncate max-w-[200px] px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs text-blue-700 hover:underline"
                    >
                      <Paperclip className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {(entry.name ?? "").trim() || getFileNameFromUrl(entry.url)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload drop zone */}
          {!isApproved && (
            <>
              <div>
                <div className="text-sm font-semibold text-text-primary mb-2">
                  {t("project.submitWork.uploadFiles")}
                </div>
                <div
                  className={[
                    "border-2 border-dashed rounded-xl p-5 transition-colors text-center",
                    dragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/60 bg-white",
                  ].join(" ")}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto w-10 h-10 rounded-lg border border-border bg-white flex items-center justify-center text-text-muted">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">
                    แนบไฟล์งานของไมล์สโตนนี้
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {t("project.submitWork.dragAndDrop")} • {t("project.submitWork.fileTypes")}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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
                        onClick={() => { setFiles([]); setFileError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-text-muted hover:text-danger hover:border-danger/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ล้างไฟล์ทั้งหมด
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 rounded-lg border border-border bg-white px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    แนบแล้ว {files.length}/{MAX_ATTACH_FILES} ไฟล์
                  </span>
                  <span className="font-medium text-text-primary">
                    รวม {formatFileSize(totalAttachedSize)}
                  </span>
                </div>
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
              </div>

              {/* File preview grid */}
              {fileItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fileItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-border bg-white p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg border border-border bg-white overflow-hidden shrink-0 flex items-center justify-center text-text-muted">
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
                          <div className="mt-1.5 inline-flex rounded-md border border-border bg-white px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                            {item.extension}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.file)}
                        className="w-7 h-7 rounded-md border border-border text-text-muted hover:text-danger hover:border-danger/40 flex items-center justify-center shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="text-sm font-semibold text-text-primary mb-2">
                  {t("project.submitWork.submissionNotes")}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("project.submitWork.notesPlaceholder")}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                {!hasMinimumPayload && files.length === 0 && (
                  <p className="mt-1.5 text-xs text-text-muted">
                    แนบไฟล์อย่างน้อย 1 ไฟล์ และกรอกหมายเหตุก่อนส่งงาน
                  </p>
                )}
              </div>
            </>
          )}

          {/* Due date info */}
          {milestone.due_date && (
            <div className="text-xs text-text-muted">
              {t("project.submitWork.details.dueDate")}: {formatDbDate(milestone.due_date, i18n.language)}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isApproved && (
          <div className="shrink-0 border-t border-border px-5 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-border bg-white text-sm text-text-primary hover:bg-slate-50 disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700"
            >
              {submitting ? "กำลังส่ง..." : t("project.submitWork.submit")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
