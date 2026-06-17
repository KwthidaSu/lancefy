import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import { Send, ChevronLeft, Clock, UserRound, ImageOff, X, ChevronLeft as ChevLeft, ChevronRight as ChevRight, Trash2, Tag, Banknote, CalendarDays, AlertCircle } from "lucide-react";
import { getJob, submitProposal, listJobProposals, getMyProposals, acceptProposal, rejectProposal, deleteJob } from "@/services/jobs.service";
import type { Job, Proposal } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/services/auth.service";
import { chatService } from "@/services/chat.service";
import type { CurrentUser } from "@/auth/auth.types";
import { formatDbDate } from "@/utils/date";
import { clsx } from "clsx";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";

function Lightbox({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
        <X className="w-7 h-7" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70">
            <ChevLeft className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70">
            <ChevRight className="w-6 h-6" />
          </button>
        </>
      )}
      <img
        src={images[current]}
        alt={`image ${current + 1}`}
        className="max-h-[88vh] max-w-[88vw] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <p className="absolute bottom-5 text-white/60 text-sm">{current + 1} / {images.length}</p>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted:  "bg-lime-50 text-lime-700 border-lime-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const tokenUserId = keycloak.tokenParsed?.sub;
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(tokenUserId);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myProposalStatus, setMyProposalStatus] = useState<Proposal["status"] | null>(null);
  const [myProposalId, setMyProposalId] = useState<string | null>(null);
  const [dealRoomByProposalId, setDealRoomByProposalId] = useState<Record<string, string>>({});
  const [proposalActionLoadingId, setProposalActionLoadingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteRedirectPath = location.pathname.startsWith("/app/explore/")
    ? "/app/explore/jobs"
    : "/app/projects";

  useEffect(() => {
    let alive = true;
    authService
      .getCurrentUser()
      .then((user) => {
        if (!alive) return;
        setCurrentUserId(user.id);
        setCurrentUser(user);
      })
      .catch(() => {
        if (!alive) return;
        setCurrentUserId(tokenUserId);
      });
    return () => {
      alive = false;
    };
  }, [tokenUserId]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    getJob(id)
      .then((res) => { if (alive) setJob(res.data); })
      .catch(() => { if (alive) setJob(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  // If owner — load proposals
  useEffect(() => {
    if (!id || !job || job.owner.id !== currentUserId) return;
    listJobProposals(id)
      .then((res) => setProposals(res.data))
      .catch(() => {});
  }, [id, job, currentUserId]);

  useEffect(() => {
    if (!id || !currentUserId || !job) return;
    if (job.owner.id === currentUserId) return;
    getMyProposals()
      .then((res) => {
        const mine = (res.data || [])
          .filter((p) => p.job_id === id)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setMyProposalStatus(mine[0]?.status ?? null);
        setMyProposalId(mine[0]?.id ?? null);
      })
      .catch(() => {
        setMyProposalStatus(null);
        setMyProposalId(null);
      });
  }, [id, currentUserId, job]);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSubmitting(true);
      const res = await submitProposal(id, {
        message: message.trim() || undefined,
      });
      showToast(t("jobs.detailPage.toast.submitSuccess"), "success");
      setShowForm(false);
      setMessage("");
      setMyProposalStatus("pending");
      setMyProposalId(res.data.id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail ?? t("jobs.detailPage.toast.submitError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const ensureDealRoomMap = async (force = false) => {
    if (!force && Object.keys(dealRoomByProposalId).length > 0) return dealRoomByProposalId;
    const rooms = await chatService.getRooms();
    const mapped = rooms.reduce<Record<string, string>>((acc, room) => {
      if (room.room_type === "deal" && room.proposal_id) {
        acc[String(room.proposal_id)] = room.id;
      }
      return acc;
    }, {});
    setDealRoomByProposalId(mapped);
    return mapped;
  };

  const handleOpenDealChat = async (proposalId?: string) => {
    if (!proposalId) {
      showToast(t("jobs.detailPage.errors.dealChatMissing"), "error");
      return;
    }
    try {
      const mapping = await ensureDealRoomMap();
      let roomId = mapping[proposalId];
      if (!roomId) {
        const refreshed = await ensureDealRoomMap(true);
        roomId = refreshed[proposalId];
      }
      if (!roomId) {
        showToast(t("jobs.detailPage.errors.dealChatMissing"), "error");
        return;
      }
      navigate(`/app/messages?roomId=${roomId}`);
    } catch {
      showToast(t("jobs.detailPage.errors.openDealChatFailed"), "error");
    }
  };

  const handleAcceptProposal = async (proposal: Proposal) => {
    if (proposal.status !== "pending") return;
    setProposalActionLoadingId(proposal.id);
    try {
      const res = await acceptProposal(proposal.id);
      const roomId =
        res.data.deal_chat_room_id ?? res.data.project_chat_room_id ?? null;

      if (roomId) {
        setDealRoomByProposalId((prev) => ({
          ...prev,
          [proposal.id]: roomId,
        }));
      }

      setProposals((prev) =>
        prev.map((item) =>
          item.id === proposal.id
            ? {
                ...item,
                status: "accepted",
                responded_at: new Date().toISOString(),
              }
            : item
        )
      );

      showToast(
        t("project.managePage.offers.dealAcceptedToast", {
          defaultValue:
            "The proposal has been accepted. Please continue the discussion in chat.",
        }),
        "success"
      );

      if (roomId) {
        navigate(`/app/messages?roomId=${roomId}`);
        return;
      }

      await handleOpenDealChat(proposal.id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(
        detail ??
          t("project.managePage.offers.hireError", {
            defaultValue: "Unable to hire right now",
          }),
        "error"
      );
    } finally {
      setProposalActionLoadingId(null);
    }
  };

  const handleRejectProposal = async (proposal: Proposal) => {
    if (proposal.status !== "pending") return;
    const reason = window.prompt(
      t("project.managePage.offers.rejectReasonPlaceholder", {
        defaultValue:
          "Enter a reason, e.g. budget or plan does not match requirements",
      })
    );
    if (reason === null) return;

    setProposalActionLoadingId(proposal.id);
    try {
      const res = await rejectProposal(proposal.id, reason.trim() || undefined);
      setProposals((prev) =>
        prev.map((item) => (item.id === proposal.id ? res.data : item))
      );
      showToast(
        t("project.managePage.offers.rejectSuccess", {
          defaultValue: "Offer rejected successfully",
        }),
        "success"
      );
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(
        detail ??
          t("project.managePage.offers.rejectError", {
            defaultValue: "Unable to reject offer",
          }),
        "error"
      );
    } finally {
      setProposalActionLoadingId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!id || deleting) return;
    if (!job || job.owner.id !== currentUserId) {
      showToast(
        t("jobs.detailPage.deleteModal.notAllowed", {
          defaultValue: "Only project owner can delete this project",
        }),
        "error"
      );
      return;
    }
    try {
      setDeleting(true);
      await deleteJob(id);
      showToast(
        t("jobs.detailPage.deleteModal.success", {
          defaultValue: "Project deleted successfully",
        }),
        "success"
      );
      setShowDeleteModal(false);
      navigate(deleteRedirectPath, { replace: true });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(
        detail ??
          t("jobs.detailPage.deleteModal.error", {
            defaultValue: "Unable to delete this project",
          }),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse">{t("loading")}</div>;
  }

  if (!job) {
    return <div className="p-8 text-center text-text-muted">{t("jobs.detailPage.notFound")}</div>;
  }

  const isOwner = job.owner.id === currentUserId;
  const isFreelancer = !!(currentUser?.skills?.length || currentUser?.tagline || currentUser?.is_public);
  const isKycVerified = currentUser?.kyc_status === "verified";
  const hasSubmittedProposal = myProposalStatus !== null;
  const canDeleteProject = isOwner;
  const isExpired =
    job.status === "expired" ||
    (job.status === "open" && !!job.expires_at && new Date(job.expires_at) < new Date());
  // SERVICE job: proposer = client (ไม่ต้องมี freelance profile / KYC)
  // HIRE job:    proposer = freelancer (ต้องมี freelance profile + KYC)
  const isServiceJob = job.job_type === "service";
  const canSendProposal =
    !!currentUserId &&
    !isOwner &&
    job.status === "open" &&
    !isExpired &&
    !hasSubmittedProposal &&
    (isServiceJob ? true : (isFreelancer && isKycVerified));
  const images = job.images ?? [];
  const ownerName = job.owner.display_name ?? job.owner.username ?? t("jobs.detailPage.unknownOwner");
  const postedAt = job.published_at ?? job.created_at;
  const statusLabel = (value: Proposal["status"]) =>
    t(`jobs.detailPage.status.${value}`, { defaultValue: value });

  return (
    <div className="p-6">
      {lightboxIndex !== null && (
        <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("jobs.detailPage.backToList")}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-text-primary">{job.title}</h1>
                    {isExpired && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-300 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                        หมดอายุแล้ว
                      </span>
                    )}
                    {!isExpired && job.status === "closed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                        ปิดรับแล้ว
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDbDate(postedAt, i18n.language)}
                    </span>
                    {job.category?.name && (
                      <>
                        <span>•</span>
                        <span>{job.category.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {job.budget ? `฿${job.budget.toLocaleString()}` : "-"}
                  </div>
                  <div className="text-sm text-text-muted">{t("jobs.detailPage.summary.budget")}</div>
                </div>
              </div>

              <div className="mt-6">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[0]}
                      alt={job.title}
                      className="w-full h-[280px] object-cover rounded-xl border border-border cursor-zoom-in"
                      onClick={() => setLightboxIndex(0)}
                    />
                    {images.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                        {images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`image ${i + 1}`}
                            className={clsx(
                              "h-16 w-24 flex-shrink-0 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition",
                              i === 0 ? "border-primary" : "border-border"
                            )}
                            onClick={() => setLightboxIndex(i)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-[220px] rounded-xl border border-border bg-surface flex items-center justify-center">
                    <ImageOff className="w-10 h-10 text-text-muted" />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
              <h2 className="text-base font-semibold text-text-primary">{t("jobs.detailPage.jobDetails")}</h2>

              {/* Category breadcrumb */}
              {(job.category || job.subcategory) && (
                <div className="flex flex-wrap items-center gap-2">
                  {job.category && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {job.category.name}
                    </span>
                  )}
                  {job.category && job.subcategory && (
                    <span className="text-gray-300 text-xs">/</span>
                  )}
                  {job.subcategory && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                      {job.subcategory.name}
                    </span>
                  )}
                </div>
              )}

              <p className="text-sm text-text-secondary whitespace-pre-wrap">
                {job.description || t("jobs.detailPage.noDescription")}
              </p>

              {(job.skills ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-2">ทักษะที่ต้องการ</p>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <span key={s.id} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(job.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      <Tag className="w-3 h-3" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isOwner && (
              <div className="space-y-3">
                <h2 className="font-semibold text-text-primary">{t("jobs.detailPage.receivedProposals", { count: proposals.length })}</h2>
                {proposals.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-text-muted">
                    {t("jobs.detailPage.noProposals")}
                  </div>
                ) : (
                  proposals.map((p) => {
                    const counterpart =
                      p.client_id === job.owner.id
                        ? p.freelancer
                        : p.client;
                    const isActionLoading = proposalActionLoadingId === p.id;
                    return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-border bg-white p-5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {counterpart.display_name ?? counterpart.username}
                        </span>
                        <span className={clsx("text-xs border px-2 py-0.5 rounded-full", STATUS_STYLE[p.status])}>
                          {statusLabel(p.status)}
                        </span>
                      </div>
                      {p.proposed_budget && <p className="text-sm text-text-muted">฿{p.proposed_budget.toLocaleString()}</p>}
                      {p.message && <p className="text-sm text-text-muted line-clamp-2">{p.message}</p>}
                      {p.status === "pending" && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => navigate(`/app/users/${counterpart.id}`)}
                            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-50"
                          >
                            {t("project.detail.viewProfile", { defaultValue: "View Profile" })}
                          </button>
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleAcceptProposal(p)}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {isActionLoading
                              ? t("loading")
                              : t("project.managePage.offers.accept", { defaultValue: "Accept Offer" })}
                          </button>
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleRejectProposal(p)}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            {t("project.managePage.offers.reject", { defaultValue: "Reject Offer" })}
                          </button>
                        </div>
                      )}
                      {p.status === "accepted" && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-emerald-700">
                            {t("jobs.detailPage.accepted.notice")}
                          </p>
                          <button
                            onClick={() => handleOpenDealChat(p.id)}
                            className="shrink-0 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            {t("jobs.detailPage.accepted.goToChat")}
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-text-muted">{formatDbDate(p.created_at)}</p>
                    </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {/* Owner card */}
            <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
              <h3 className="text-base font-semibold text-text-primary">
                {isServiceJob
                  ? t("jobs.detailPage.freelancerInfoTitle", { defaultValue: "ข้อมูล Freelancer" })
                  : t("jobs.detailPage.clientInfoTitle")}
              </h3>
              <Link
                to={`/app/users/${job.owner.id}`}
                className="flex items-center gap-3 group"
                onClick={(e) => e.stopPropagation()}
              >
                {job.owner.avatar_url ? (
                  <img
                    src={job.owner.avatar_url}
                    alt={ownerName}
                    className="w-10 h-10 rounded-full object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserRound className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-blue-600 transition">
                    {ownerName}
                  </p>
                  {job.owner.username && (
                    <p className="text-xs text-text-muted">@{job.owner.username}</p>
                  )}
                </div>
              </Link>
            </div>

            {/* Job summary */}
            <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
              <h3 className="text-base font-semibold text-text-primary">{t("jobs.detailPage.summary.title")}</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("jobs.detailPage.summary.type")}</span>
                <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                  job.job_type === "hire" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                }`}>
                  {job.job_type === "hire"
                    ? t("jobs.detailPage.jobType.hire")
                    : t("jobs.detailPage.jobType.service")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("jobs.detailPage.summary.budget")}</span>
                <span className="font-semibold flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-gray-400" />
                  {job.budget ? `฿${job.budget.toLocaleString()}` : "-"}
                </span>
              </div>
              {job.category && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">หมวด</span>
                  <span className="font-medium">{job.category.name}</span>
                </div>
              )}
              {job.subcategory && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">หมวดย่อย</span>
                  <span className="font-medium">{job.subcategory.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("jobs.detailPage.summary.deliveryDate")}</span>
                <span className="font-medium flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                  {job.delivery_date ? formatDbDate(job.delivery_date, i18n.language) : "-"}
                </span>
              </div>
              {job.expires_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">หมดอายุ</span>
                  <span className={`font-medium flex items-center gap-1 ${
                    isExpired ? "text-gray-400 line-through" : "text-amber-600"
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formatDbDate(job.expires_at, i18n.language)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("jobs.detailPage.summary.proposals")}</span>
                <span className="font-medium">{job.proposals_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">โพสต์เมื่อ</span>
                <span className="font-medium">{formatDbDate(job.published_at ?? job.created_at, i18n.language)}</span>
              </div>
            </div>

            {/* Expired banner */}
            {!isOwner && isExpired && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-1">
                <p className="text-sm font-semibold text-gray-600">งานนี้หมดอายุแล้ว</p>
                <p className="text-xs text-gray-500">ไม่สามารถส่ง proposal ได้อีกต่อไป</p>
              </div>
            )}

            {/* Freelancer profile gate — เฉพาะ HIRE jobs (proposer = freelancer) */}
            {!isOwner && !isServiceJob && !!currentUserId && !isExpired && job.status === "open" && !hasSubmittedProposal && !isFreelancer && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                <p className="text-sm font-semibold text-amber-800">ต้องตั้งค่า Freelancer Profile ก่อน</p>
                <p className="text-sm text-amber-700">ตั้งค่าโปรไฟล์ freelancer ของคุณก่อนเพื่อส่ง proposal</p>
                <Link
                  to="/app/settings/freelancer"
                  className="block w-full text-center px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
                >
                  ตั้งค่า Freelancer Profile
                </Link>
              </div>
            )}

            {/* KYC gate — เฉพาะ HIRE jobs (proposer = freelancer ต้องผ่าน KYC) */}
            {!isOwner && !isServiceJob && !!currentUserId && !isExpired && job.status === "open" && !hasSubmittedProposal && isFreelancer && !isKycVerified && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
                <p className="text-sm font-semibold text-blue-800">ต้องยืนยันตัวตน (KYC) ก่อน</p>
                <p className="text-sm text-blue-700">ยืนยันตัวตนออนไลน์ก่อนเพื่อส่ง proposal</p>
                <Link
                  to="/app/kyc"
                  className="block w-full text-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  ยืนยัน KYC
                </Link>
              </div>
            )}

            {/* Delete Project (owner only) */}
            {canDeleteProject && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 space-y-3">
                <h3 className="text-base font-semibold text-rose-700">
                  {t("jobs.detailPage.deleteModal.title", { defaultValue: "Delete Project" })}
                </h3>
                <p className="text-sm text-rose-700/90">
                  {t("jobs.detailPage.deleteModal.description", {
                    defaultValue: "This action cannot be undone.",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("jobs.detailPage.deleteModal.title", { defaultValue: "Delete Project" })}
                </button>
              </div>
            )}

            {canSendProposal && (
              <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
                {!showForm ? (
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                  >
                    <Send className="w-4 h-4" />
                    {t("jobs.detailPage.sendProposal")}
                  </button>
                ) : (
                  <form onSubmit={handleSubmitProposal} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-text-secondary">
                        {t("jobs.detailPage.form.message")} <span className="text-text-muted font-normal text-xs">(ไม่บังคับ)</span>
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                        placeholder={t("jobs.detailPage.form.messagePlaceholder")}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                      >
                        {submitting ? t("jobs.detailPage.form.submitting") : t("jobs.detailPage.form.submit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:border-accent/60 transition"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {!isOwner && myProposalStatus === "pending" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
                <p className="text-sm font-semibold text-amber-800">
                  {t("jobs.detailPage.pending.title")}
                </p>
                <p className="text-sm text-amber-700">
                  {t("jobs.detailPage.pending.subtitle")}
                </p>
              </div>
            )}
            {!isOwner && myProposalStatus === "accepted" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
                <p className="text-sm font-semibold text-emerald-800">
                  {t("jobs.detailPage.accepted.notice")}
                </p>
                <button
                  onClick={() => handleOpenDealChat(myProposalId ?? undefined)}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
                >
                  {t("jobs.detailPage.accepted.goToChat")}
                </button>
              </div>
            )}
            {!isOwner &&
              (myProposalStatus === "rejected" || myProposalStatus === "withdrawn") && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {t("jobs.detailPage.submitted.title")}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t("jobs.detailPage.submitted.latestStatus", { status: statusLabel(myProposalStatus) })}
                  </p>
                </div>
              )}
          </aside>
        </div>
      </div>

      <ConfirmDeleteModal
        open={showDeleteModal}
        loading={deleting}
        title={t("jobs.detailPage.deleteModal.title", { defaultValue: "Delete Project" })}
        description={t("jobs.detailPage.deleteModal.prompt", {
          defaultValue: "Type the project name exactly to confirm deletion.",
        })}
        requireExactText={job.title}
        onCancel={() => {
          if (deleting) return;
          setShowDeleteModal(false);
        }}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
