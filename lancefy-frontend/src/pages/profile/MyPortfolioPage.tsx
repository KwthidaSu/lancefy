import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  ImagePlus,
  Pencil,
  Check,
  X,
  Loader2,
  ImageOff,
  BadgeCheck,
  Briefcase,
  Plus,
  FolderOpen,
  Lock,
  Globe,
} from "lucide-react";
import {
  getMyPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  uploadFileToPortfolio,
  deleteFileFromPortfolio,
  type FreelancerPortfolio,
  type PortfolioFile,
} from "@/services/portfolio.service";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";

const surfaceClass =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";
const subtleButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 hover:bg-slate-50";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(29,78,216,0.25)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";

function UploadZone({
  onUpload,
  uploading,
}: {
  onUpload: (files: File[]) => void;
  uploading: boolean;
}) {
  const { t } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (fl: FileList | null) => {
    if (!fl) return;
    const valid = Array.from(fl).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (valid.length) onUpload(valid);
  };

  return (
    <button
      type="button"
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={`aspect-square rounded-[24px] border-2 border-dashed px-3 transition ${
        dragging
          ? "border-blue-400 bg-blue-50/80"
          : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40"
      } ${uploading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm shadow-slate-200/60">
              <ImagePlus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                {t("portfolioPage.upload.title")}
              </p>
              <p className="text-[11px] leading-5 text-slate-500">
                {t("portfolioPage.upload.subtitle")}
              </p>
            </div>
            <span className="text-[11px] font-medium text-blue-600">
              {t("portfolioPage.upload.multi")}
            </span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function FileCard({
  file,
  onDelete,
  editing,
}: {
  file: PortfolioFile;
  onDelete: (id: string) => void;
  editing: boolean;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-100 shadow-sm shadow-slate-200/60">
      <img
        src={file.file_url}
        alt=""
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-slate-900/0 transition group-hover:bg-slate-900/30" />
      <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
        {editing &&
          (!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="rounded-xl bg-red-500 p-2 text-white shadow-lg transition hover:bg-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => onDelete(file.id)}
                className="rounded-xl bg-red-500 p-2 text-white shadow-lg transition hover:bg-red-600"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="rounded-xl bg-slate-800 p-2 text-white shadow-lg transition hover:bg-slate-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

function PortfolioCard({
  portfolio,
  onUpdated,
  onDeleted,
}: {
  portfolio: FreelancerPortfolio;
  onUpdated: (p: FreelancerPortfolio) => void;
  onDeleted: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(portfolio.title);
  const [description, setDescription] = useState(portfolio.description ?? "");
  const [isPublic, setIsPublic] = useState(portfolio.is_public ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState(0);
  const [files, setFiles] = useState<PortfolioFile[]>(portfolio.files);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updatePortfolio(portfolio.id, {
        title,
        description,
        is_public: isPublic,
      });
      onUpdated({ ...res.data, files });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (newFiles: File[]) => {
    setUploading(true);
    setUploadQueue(newFiles.length);
    let remaining = newFiles.length;
    for (const file of newFiles) {
      try {
        const res = await uploadFileToPortfolio(portfolio.id, file);
        setFiles((prev) => [...prev, res.data]);
      } catch {
        // keep remaining files uploading
      } finally {
        remaining -= 1;
        setUploadQueue(remaining);
      }
    }
    setUploading(false);
    setUploadQueue(0);
  };

  const handleDeleteFile = async (fileId: string) => {
    await deleteFileFromPortfolio(portfolio.id, fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleDeletePortfolio = async () => {
    await deletePortfolio(portfolio.id);
    onDeleted(portfolio.id);
  };

  return (
    <div className={`${surfaceClass} overflow-hidden`}>
      <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("portfolioPage.form.titleLabel")}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("portfolioPage.form.titlePlaceholder")}
                className={`${inputClass} font-semibold`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("portfolioPage.form.descriptionLabel")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t("portfolioPage.form.descriptionPlaceholder")}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setIsPublic((p) => !p)}
                className="inline-flex items-center gap-3 self-start text-sm text-slate-600"
              >
                <span
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    isPublic ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                      isPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
                <span className="font-medium">
                  {isPublic
                    ? t("portfolioPage.visibility.public")
                    : t("portfolioPage.visibility.private")}
                </span>
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={primaryButtonClass}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {t("save")}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className={subtleButtonClass}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-slate-900">
                      {portfolio.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      {portfolio.is_public ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {portfolio.is_public
                        ? t("portfolioPage.visibility.public")
                        : t("portfolioPage.visibility.private")}
                    </span>
                  </div>
                  {portfolio.description && (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      {portfolio.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {t("portfolioPage.meta.filesCount", { count: files.length })}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                onClick={() => setEditing(true)}
                className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm shadow-slate-200/50 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm shadow-slate-200/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDeletePortfolio}
                    className="rounded-2xl bg-red-500 p-2.5 text-white shadow-lg transition hover:bg-red-600"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-2xl bg-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-5 sm:px-6">
        {uploading && uploadQueue > 0 && (
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("portfolioPage.upload.uploading", { count: uploadQueue })}
          </p>
        )}

        {files.length === 0 && !editing ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
            <ImageOff className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {t("portfolioPage.emptyFolder.title")}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {t("portfolioPage.emptyFolder.subtitle")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {editing && <UploadZone onUpload={handleUpload} uploading={uploading} />}
            {files.map((f) => (
              <FileCard key={f.id} file={f} onDelete={handleDeleteFile} editing={editing} />
            ))}
            {files.length === 0 && editing && (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center sm:col-span-3 xl:col-span-4">
                <ImageOff className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  {t("portfolioPage.emptyFolder.title")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function sortPortfolios(list: FreelancerPortfolio[]): FreelancerPortfolio[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.updated_at || a.created_at).getTime();
    const tb = new Date(b.updated_at || b.created_at).getTime();
    return tb - ta;
  });
}

export default function MyPortfolioPage() {
  const { t, i18n } = useTranslation("common");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [portfolios, setPortfolios] = useState<FreelancerPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [createSaving, setCreateSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      authService.getCurrentUser(),
      getMyPortfolios().catch(() => ({ data: [] as FreelancerPortfolio[] })),
    ])
      .then(([u, res]) => {
        setUser(u);
        setPortfolios(sortPortfolios((res.data as unknown as FreelancerPortfolio[]) ?? []));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;
    setCreateSaving(true);
    try {
      const res = await createPortfolio({
        title: trimmedTitle,
        description: newDesc.trim() || undefined,
        is_public: newPublic,
      });
      setPortfolios((prev) =>
        sortPortfolios([res.data as unknown as FreelancerPortfolio, ...prev])
      );
      setNewTitle("");
      setNewDesc("");
      setNewPublic(true);
      setCreating(false);
    } finally {
      setCreateSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
        <div className="h-44 animate-pulse rounded-[28px] bg-slate-200/70" />
        <div className="h-48 animate-pulse rounded-[28px] bg-slate-200/60" />
        <div className="h-80 animate-pulse rounded-[28px] bg-slate-200/60" />
      </div>
    );
  }

  const language = i18n.resolvedLanguage?.startsWith("th") ? "th-TH" : "en-US";
  const displayName =
    user?.display_name ||
    [user?.firstname, user?.lastname].filter(Boolean).join(" ") ||
    user?.username;
  const initials = (
    user?.display_name?.charAt(0) ??
    user?.firstname?.charAt(0) ??
    user?.username?.charAt(0) ??
    "?"
  ).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
      <section className={`${surfaceClass} overflow-hidden`}>
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {t("accountSettings.nav.portfolio")}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.2rem]">
              {t("portfolioPage.hero.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              {t("portfolioPage.hero.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className={`${primaryButtonClass} self-start`}
          >
            <Plus className="h-4 w-4" />
            {t("portfolioPage.actions.newFolder")}
          </button>
        </div>

        <div className="border-t border-slate-200/80 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="h-20 w-20 rounded-[24px] object-cover ring-4 ring-slate-50 shadow-lg shadow-slate-200/60"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-blue-200/40">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  {displayName}
                </h2>
                {user?.kyc_status === "verified" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t("portfolioPage.meta.verified")}
                  </span>
                )}
              </div>
              {user?.tagline && (
                <p className="mt-1 text-sm text-slate-500">{user.tagline}</p>
              )}
              {user?.username && (
                <p className="mt-1 text-xs font-medium text-slate-400">
                  @{user.username}
                </p>
              )}
              {user?.hourly_rate && (
                <p className="mt-3 text-sm font-semibold text-blue-700">
                  {t("portfolioPage.meta.hourlyRate", {
                    value: user.hourly_rate.toLocaleString(language),
                  })}
                </p>
              )}
              {user?.bio && (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {user.bio}
                </p>
              )}
              {user?.skills && user.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {user.skills.map((skill) => (
                    <span
                      key={typeof skill === "string" ? skill : skill.id}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {typeof skill === "string" ? skill : skill.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`${surfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {t("portfolioPage.section.title")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t("portfolioPage.section.subtitle")}
                </p>
              </div>
            </div>
          </div>
          <span className="inline-flex self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
            {t("portfolioPage.meta.foldersCount", { count: portfolios.length })}
          </span>
        </div>

        {creating && (
          <div className="mt-6 rounded-[24px] border border-blue-200 bg-blue-50/40 p-5 shadow-sm shadow-blue-100/40">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {t("portfolioPage.create.title")}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("portfolioPage.create.subtitle")}
              </p>
            </div>

            <div className="grid gap-4">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder={t("portfolioPage.form.titlePlaceholder")}
                className={inputClass}
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t("portfolioPage.form.descriptionPlaceholder")}
                rows={3}
                className={`${inputClass} resize-none`}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setNewPublic((p) => !p)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
                >
                  {newPublic ? (
                    <>
                      <Globe className="h-4 w-4 text-blue-600" />
                      {t("portfolioPage.visibility.public")}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-slate-500" />
                      {t("portfolioPage.visibility.private")}
                    </>
                  )}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newTitle.trim() || createSaving}
                    className={primaryButtonClass}
                  >
                    {createSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {t("portfolioPage.actions.create")}
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setNewTitle("");
                      setNewDesc("");
                    }}
                    className={subtleButtonClass}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {portfolios.length === 0 && !creating ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-slate-400 shadow-sm shadow-slate-200/60">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">
              {t("portfolioPage.empty.title")}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
              {t("portfolioPage.empty.subtitle")}
            </p>
            <button
              onClick={() => setCreating(true)}
              className={`${primaryButtonClass} mt-6`}
            >
              <Plus className="h-4 w-4" />
              {t("portfolioPage.actions.newFolder")}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onUpdated={(updated) =>
                  setPortfolios((prev) =>
                    sortPortfolios(
                      prev.map((item) => (item.id === updated.id ? updated : item))
                    )
                  )
                }
                onDeleted={(id) =>
                  setPortfolios((prev) => prev.filter((item) => item.id !== id))
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
