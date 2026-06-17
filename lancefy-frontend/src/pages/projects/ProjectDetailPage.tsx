import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HiOutlineArchiveBox,
  HiOutlineLockClosed,
  HiOutlinePencilSquare,
  HiOutlineRocketLaunch,
  HiOutlineTrash,
} from "react-icons/hi2";

import {
  acceptOffer,
  fetchOffers,
  fetchProject,
  deleteProject,
  publishProject,
  fetchMilestoneBoard,
  fetchProjectPayoutSummary,
  fetchProjectWorkspace,
  submitOffer,
  replaceOfferMilestones,
  acceptCounterOffer,
  counterOffer,
  withdrawOffer,
  closeProject,
  requestProjectExtension,
  reviewMilestonePlan,
  rejectOffer,
  type JobOffer,
} from "@/services/projects/project";
import {
  getJob,
  listJobProposals,
  acceptProposal,
  rejectProposal,
  deleteJob,
} from "@/services/jobs.service";
import type { Job, Proposal } from "@/types";
import type {
  Project,
  MilestoneBoardItem,
  AssignmentSummary,
  ProjectPayoutSummary,
} from "@/services/projects/project.types";

import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import MilestonePlanEditModal from "@/components/modals/MilestonePlanEditModal";
import MilestoneReviewModal from "@/components/modals/MilestoneReviewModal";
import MilestoneSubmitModal from "@/components/modals/MilestoneSubmitModal";
import MilestoneFundModal from "@/components/milestones/MilestoneFundModal";
import OfferModal from "@/components/modals/OfferModal";
import CompletionPanel from "@/components/projects/CompletionPanel";
import MilestoneFormModal from "@/components/projects/MilestoneFormModal";
import RequestExtensionModal from "@/components/projects/RequestExtensionModal";
import Avatar from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import type { Message } from "@/types/chat.types";
import { formatDbDate } from "@/utils/date";
import { sanitizeHtml, htmlToText } from "@/utils/html";
import { chatService } from "@/services/chat.service";
import {
  type ActivityItem,
  type AttachmentItem,
  type MilestoneSubmissionLog,
  buildChatAttachmentItems,
  buildMilestoneArtifacts,
  formatProjectChatTime,
  formatProjectDaySeparator,
  getActivityToneClass,
  isImageFileUrl,
  isSameProjectDay,
  type ProjectPageUserLike,
  resolveChatPeer,
  resolveDisplayUserName,
  resolveMessageFileMeta,
  sortByOccurredAtDesc,
} from "./projectPage.shared";

const mapJobToProjectLike = (job: Job): Project => ({
  id: job.id,
  owner_id: job.owner?.id ?? null,
  owner_username: job.owner?.username ?? null,
  title: job.title,
  description: job.description ?? "",
  images: job.images ?? [],
  skill_tags: (job.skills ?? []).map((s) => s.name),
  budget: Number(job.budget ?? 0),
  currency: "THB",
  categories: job.category
    ? [
        {
          code: job.category.slug ?? "",
          type: "job",
          label: job.category.name ?? "-",
        },
      ]
    : [],
  assignee: null,
  status: job.status === "expired" ? "closed" : (job.status as Project["status"]),
  progress_percent: job.status === "closed" || job.status === "expired" ? 100 : 0,
  deadline_date: job.delivery_date ?? null,
  created_at: job.created_at,
  published_at: job.published_at ?? null,
});

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [, setOffersLoading] = useState(false);
  const [proposalRequests, setProposalRequests] = useState<Proposal[]>([]);
  const [proposalRequestsLoading, setProposalRequestsLoading] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneBoardItem[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [payout, setPayout] = useState<ProjectPayoutSummary | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentSummary | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "board" | "milestones" | "chat" | "files" | "activity"
  >("overview");

  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [closing, setClosing] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showAcceptOfferModal, setShowAcceptOfferModal] = useState(false);
  const [acceptOfferId, setAcceptOfferId] = useState<string | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [showRejectOfferModal, setShowRejectOfferModal] = useState(false);
  const [rejectOfferId, setRejectOfferId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingOffer, setRejectingOffer] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [editingOfferMilestones, setEditingOfferMilestones] = useState(false);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterOfferOpen, setCounterOfferOpen] = useState(false);
  const [reviewMilestoneId, setReviewMilestoneId] = useState<string | null>(null);
  const [fundMilestone, setFundMilestone] = useState<MilestoneBoardItem | null>(null);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extending, setExtending] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [planEditOpen, setPlanEditOpen] = useState(false);
  const [reviewingPlan, setReviewingPlan] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneBoardItem | null>(null);
  const [submitWorkMilestone, setSubmitWorkMilestone] = useState<MilestoneBoardItem | null>(null);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [milestoneFiles, setMilestoneFiles] = useState<AttachmentItem[]>([]);
  const [milestoneSubmissionLogs, setMilestoneSubmissionLogs] = useState<
    MilestoneSubmissionLog[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatParticipants, setChatParticipants] = useState<CurrentUser[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;

    fetchProject(id)
      .then((res) => {
        setProject(res.data);
        fetchWorkspace();
      })
      .catch(async () => {
        try {
          const jobRes = await getJob(id);
          setProject(mapJobToProjectLike(jobRes.data));
          setAssignment(null);
        } catch {
          setProject(null);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const FREELANCER_STATUSES = ["active", "complete", "completed", "closed", "cancelled", "disputed"];

  useEffect(() => {
    if (!project) return;
    const hasFreelancer = !!assignment || FREELANCER_STATUSES.includes(project.status);
    if (!hasFreelancer && (activeTab === "board" || activeTab === "milestones" || activeTab === "chat")) {
      setActiveTab("overview");
    }
  }, [assignment, project?.status]);

  useEffect(() => {
    if (!project || !currentUser) return;
    const ownerId =
      project.owner_id ??
      project.client_id ??
      project.client?.id ??
      assignment?.client_id ??
      null;
    const owner = !!ownerId && ownerId === currentUser.id;
    const assignee =
      !!assignment && assignment.freelancer_id === currentUser.id;
    if (owner) {
      fetchProposalRequests();
    }
    if (
      !project.job_id &&
      ((project.status === "open" && !assignee) ||
        (owner && project.status === "active"))
    ) {
      fetchOfferList();
    } else {
      setOffers([]);
    }
    if (
      (owner || assignee) &&
      ["active", "complete", "completed", "closed"].includes(project.status)
    ) {
      fetchMilestones();
      fetchPayout();
    }
  }, [project, currentUser, assignment]);

  const fetchOfferList = async () => {
    if (!id) return;
    try {
      setOffersLoading(true);
      const res = await fetchOffers(id);
      setOffers(res.data);
    } catch (err) {
      console.error("Failed to fetch offers", err);
    } finally {
      setOffersLoading(false);
    }
  };

  const fetchProposalRequests = async () => {
    const jobId = project?.job_id;
    if (!jobId) return;
    try {
      setProposalRequestsLoading(true);
      const res = await listJobProposals(jobId);
      setProposalRequests(res.data);
    } catch {
      setProposalRequests([]);
    } finally {
      setProposalRequestsLoading(false);
    }
  };

  const fetchMilestones = async () => {
    if (!id) return;
    try {
      setMilestonesLoading(true);
      const res = await fetchMilestoneBoard(id);
      setMilestones(res.data);
    } catch (err) {
      console.error("Failed to fetch milestones", err);
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  };

  const fetchPayout = async () => {
    if (!id) return;
    try {
      setPayoutLoading(true);
      const res = await fetchProjectPayoutSummary(id);
      setPayout(res.data);
    } catch (err) {
      setPayout(null);
    } finally {
      setPayoutLoading(false);
    }
  };

  const fetchWorkspace = async () => {
    if (!id) return;
    try {
      const res = await fetchProjectWorkspace(id);
      setAssignment(res.data.assignment ?? null);
    } catch {
      setAssignment(null);
    }
  };

  const handleOpenAcceptOffer = (offerId: string) => {
    setAcceptOfferId(offerId);
    setShowAcceptOfferModal(true);
  };

  const handleAcceptOffer = async () => {
    if (!id || !acceptOfferId || acceptingOffer) return;
    const selectedProposal = proposalRequests.find((proposal) => proposal.id === acceptOfferId);
    const selectedOffer = offers.find((offer) => offer.id === acceptOfferId);
    try {
      setAcceptingOffer(true);
      if (selectedProposal) {
        const res = await acceptProposal(selectedProposal.id);
        showToast(t("project.managePage.offers.hireSuccess"), "success");
        setShowAcceptOfferModal(false);
        setAcceptOfferId(null);
        await fetchProposalRequests();
        if (res.data.project_chat_room_id) {
          navigate(`/app/messages?roomId=${res.data.project_chat_room_id}`);
        } else {
          void handleChatWithFreelancer(selectedProposal.freelancer_id);
        }
        return;
      }
      await acceptOffer(id, acceptOfferId);
      showToast(t("project.managePage.offers.hireSuccess"), "success");
      const res = await fetchProject(id);
      setProject(res.data);
      setShowAcceptOfferModal(false);
      setAcceptOfferId(null);
      fetchOfferList();
      if (res.data.status === "active") {
        fetchMilestones();
        fetchPayout();
      }
      if (selectedOffer?.freelancer_id) {
        void handleChatWithFreelancer(selectedOffer.freelancer_id);
      }
    } catch {
      showToast(t("project.managePage.offers.hireError"), "error");
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleOpenRejectOffer = (offerId: string) => {
    setRejectOfferId(offerId);
    setRejectReason("");
    setShowRejectOfferModal(true);
  };

  const handleRejectOffer = async () => {
    if (!id || !rejectOfferId || rejectingOffer) return;
    const reason = rejectReason.trim();
    if (!reason) {
      showToast(t("project.managePage.offers.rejectReasonRequired"), "error");
      return;
    }

    try {
      setRejectingOffer(true);
      const selectedProposal = proposalRequests.find((proposal) => proposal.id === rejectOfferId);
      if (selectedProposal) {
        await rejectProposal(selectedProposal.id, reason);
        showToast(t("project.managePage.offers.rejectSuccess"), "success");
        setShowRejectOfferModal(false);
        setRejectOfferId(null);
        setRejectReason("");
        await fetchProposalRequests();
        return;
      }
      await rejectOffer(id, rejectOfferId, { rejection_reason: reason });
      showToast(t("project.managePage.offers.rejectSuccess"), "success");
      setShowRejectOfferModal(false);
      setRejectOfferId(null);
      setRejectReason("");
      fetchOfferList();
    } catch {
      showToast(t("project.managePage.offers.rejectError"), "error");
    } finally {
      setRejectingOffer(false);
    }
  };

  const handleCounterOffer = async (
    budget: number,
    message: string,
    milestones: {
      title: string;
      amount: number;
      estimated_days: number;
      description?: string;
    }[],
  ) => {
    if (!id || !counterOfferId || offerLoading || !project) return;
    const baseOffer = offers.find((offer) => offer.id === counterOfferId);
    if (!baseOffer) return;
    const originalBudget = Number(baseOffer.proposed_budget ?? 0);
    const normalizedMessage = message.trim();
    const originalMessage = (baseOffer.message ?? "").trim();
    const normalizedMilestones = milestones.map((m) => ({
      title: m.title.trim(),
      amount: Number(m.amount),
      estimated_days: Number(m.estimated_days),
      description: (m.description ?? "").trim(),
    }));
    const originalMilestones = (baseOffer.proposed_milestones ?? []).map((m) => ({
      title: (m.title ?? "").trim(),
      amount: Number(m.amount ?? 0),
      estimated_days: Number(m.estimated_days ?? 0),
      description: (m.description ?? "").trim(),
    }));
    if (!Number.isFinite(budget) || budget <= 0) {
      showToast(t("project.offerToast.invalidBudget"), "error");
      return;
    }
    if (Math.abs(budget - originalBudget) > 0.0001) {
      showToast(
        t("project.offerToast.counterBudgetMustMatch", {
          budget: originalBudget.toLocaleString(),
          currency: displayCurrency,
        }),
        "error",
      );
      return;
    }
    const maxProjectBudget = Number(project.total_budget ?? project.budget ?? 0);
    if (budget > maxProjectBudget) {
      showToast(
        t("project.offerToast.exceedsProjectBudget", {
          budget: maxProjectBudget.toLocaleString(),
          currency: displayCurrency,
        }),
        "error",
      );
      return;
    }
    if (milestones.length === 0) {
      showToast(t("project.offerToast.invalidMilestones"), "error");
      return;
    }
    const unchanged =
      normalizedMessage === originalMessage &&
      normalizedMilestones.length === originalMilestones.length &&
      normalizedMilestones.every((m, idx) => {
        const o = originalMilestones[idx];
        if (!o) return false;
        return (
          m.title === o.title &&
          Math.abs(m.amount - o.amount) <= 0.0001 &&
          m.estimated_days === o.estimated_days &&
          m.description === o.description
        );
      });
    if (unchanged) {
      showToast(t("project.offerToast.counterNoChanges"), "error");
      return;
    }
    try {
      setOfferLoading(true);
      const res = await counterOffer(id, counterOfferId, {
        proposed_budget: originalBudget,
        message: normalizedMessage || undefined,
        proposed_milestones: milestones,
      });
      setOffers((prev) =>
        prev.map((offer) => (offer.id === res.data.id ? res.data : offer)),
      );
      showToast(t("project.managePage.offers.counterSuccess"), "success");
      setCounterOfferOpen(false);
      setCounterOfferId(null);
    } catch {
      showToast(t("project.managePage.offers.counterError"), "error");
    } finally {
      setOfferLoading(false);
    }
  };

  const handleChatWithFreelancer = async (freelancerId: string) => {
    try {
      const room = await chatService.createDM(freelancerId);
      navigate(`/app/messages?roomId=${room.id}`);
    } catch (err) {
      console.error(err);
      showToast(t("project.managePage.offers.chatError"), "error");
    }
  };

  const handleSubmitOffer = async (
    budget: number,
    message: string,
    milestones: {
      title: string;
      amount: number;
      estimated_days: number;
      description?: string;
    }[],
  ) => {
    if (!id || offerLoading || !project) return;
    if (!Number.isFinite(budget) || budget <= 0) {
      showToast(t("project.offerToast.invalidBudget"), "error");
      return;
    }
    if (milestones.length === 0) {
      showToast(t("project.offerToast.invalidMilestones"), "error");
      return;
    }
    try {
      setOfferLoading(true);
      const res = await submitOffer(id, {
        proposed_budget: budget,
        currency: displayCurrency,
        message: message.trim() || undefined,
        proposed_milestones: milestones,
      });
      setOffers((prev) => [
        res.data,
        ...prev.filter((offer) => offer.id !== res.data.id),
      ]);
      showToast(t("project.offerToast.success"), "success");
      setOfferOpen(false);
    } catch {
      showToast(t("project.offerToast.error"), "error");
    } finally {
      setOfferLoading(false);
    }
  };

  const handleReplaceOfferMilestones = async (
    budget: number,
    milestones: {
      title: string;
      amount: number;
      estimated_days: number;
      description?: string;
    }[],
  ) => {
    if (!myActiveOffer || myActiveOffer.status !== "pending" || offerLoading) return;
    if (milestones.length === 0) {
      showToast(t("project.offerToast.invalidMilestones"), "error");
      return;
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      showToast(t("project.offerToast.invalidBudget"), "error");
      return;
    }
    try {
      setOfferLoading(true);
      const res = await replaceOfferMilestones(myActiveOffer.id, {
        proposed_milestones: milestones,
      });
      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === res.data.id
            ? {
                ...res.data,
                proposed_budget: budget,
              }
            : offer,
        ),
      );
      showToast(t("project.managePage.offers.editMilestonesSuccess"), "success");
      setOfferOpen(false);
      setEditingOfferMilestones(false);
    } catch {
      showToast(t("project.managePage.offers.editMilestonesError"), "error");
    } finally {
      setOfferLoading(false);
    }
  };

  const handleWithdrawMyOffer = async () => {
    if (!myActiveOffer || myActiveOffer.status !== "pending" || offerLoading) return;
    if (!confirm(t("project.managePage.offers.withdrawConfirm"))) return;
    try {
      setOfferLoading(true);
      const res = await withdrawOffer(myActiveOffer.id);
      setOffers((prev) =>
        prev.map((offer) => (offer.id === res.data.id ? res.data : offer)),
      );
      showToast(t("project.managePage.offers.withdrawSuccess"), "success");
      setOfferOpen(false);
      setEditingOfferMilestones(false);
    } catch {
      showToast(t("project.managePage.offers.withdrawError"), "error");
    } finally {
      setOfferLoading(false);
    }
  };

  const handleAcceptCounterMyOffer = async () => {
    if (
      !id ||
      !myActiveOffer ||
      myActiveOffer.status !== "pending" ||
      myActiveOffer.offer_type !== "counter_offer" ||
      offerLoading
    ) {
      return;
    }
    try {
      setOfferLoading(true);
      const res = await acceptCounterOffer(id, myActiveOffer.id);
      setOffers((prev) =>
        prev.map((offer) => (offer.id === res.data.id ? res.data : offer)),
      );
      const projectRes = await fetchProject(id);
      setProject(projectRes.data);
      setOfferOpen(false);
      setEditingOfferMilestones(false);
      showToast(t("project.managePage.offers.counterAcceptSuccess"), "success");
      if (projectRes.data.status === "active") {
        fetchWorkspace();
        fetchMilestones();
        fetchPayout();
      }
    } catch {
      showToast(t("project.managePage.offers.counterAcceptError"), "error");
    } finally {
      setOfferLoading(false);
    }
  };

  const isAssignee =
    !!assignment &&
    !!currentUser &&
    assignment.freelancer_id === currentUser.id;
  const projectOwnerId =
    project?.owner_id ??
    project?.client_id ??
    project?.client?.id ??
    assignment?.client_id ??
    null;
  const isOwner =
    !!currentUser && !!projectOwnerId && projectOwnerId === currentUser.id;
  const acceptedProposal = proposalRequests.find((p) => p.status === "accepted");
  const isAcceptedProposalFreelancer =
    !!acceptedProposal && !!currentUser && acceptedProposal.freelancer_id === currentUser.id;
  const canAccessProjectChat = isOwner || isAssignee || isAcceptedProposalFreelancer;
  const isWorkView = !isOwner && (isAssignee || isAcceptedProposalFreelancer);
  const breadcrumbTarget = isWorkView ? "/app/work" : "/app/projects";
  const breadcrumbLabel = isWorkView
    ? t("dashboard.work", { defaultValue: "My Work" })
    : t("project.managePage.breadcrumb.projects");
  const chatPeerId = assignment
    ? isOwner
      ? assignment.freelancer_id
      : isAssignee
        ? projectOwnerId
        : null
    : isOwner && acceptedProposal
      ? acceptedProposal.freelancer_id
      : isAcceptedProposalFreelancer
        ? projectOwnerId
        : null;

  const isChatRelatedTab =
    activeTab === "chat" || activeTab === "files" || activeTab === "activity";

  const fetchAllRoomMessages = async (
    service: {
      getMessages: (
        roomId: string,
        params?: { limit?: number; before?: string }
      ) => Promise<Message[]>;
    },
    roomId: string,
  ) => {
    const pageSize = 200;
    let before: string | undefined = undefined;
    let all: Message[] = [];

    for (let i = 0; i < 50; i += 1) {
      const batch = await service.getMessages(roomId, {
        limit: pageSize,
        before,
      });
      if (!batch.length) break;
      all = [...batch, ...all];

      if (batch.length < pageSize) break;
      const oldest = batch[0]?.created_at;
      if (!oldest || oldest === before) break;
      before = oldest;
    }

    return all;
  };

  useEffect(() => {
    let cancelled = false;

    if (!isChatRelatedTab) return;
    if (!canAccessProjectChat) return;
    if (!chatPeerId) {
      setChatRoomId(null);
      setChatMessages([]);
      setMilestoneFiles([]);
      setMilestoneSubmissionLogs([]);
      return;
    }

    const initChat = async () => {
      try {
        setChatLoading(true);
        setChatError(null);
        const room = await chatService.createDM(chatPeerId);
        if (cancelled) return;

        setChatRoomId(room.id);
        setChatParticipants(room.participants ?? []);
        const messages = await fetchAllRoomMessages(chatService, room.id);
        if (cancelled) return;
        setChatMessages(messages);

        if (activeTab === "chat") {
          await chatService.markRoomAsRead(room.id).catch(() => {});
          chatService.connect(room.id, (ev) => {
            if (ev.action !== undefined) return;
            const newMsg = ev;
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          });
        }
      } catch {
        if (cancelled) return;
        setChatError(t("project.managePage.chatPanel.loadError"));
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    };

    initChat();

    return () => {
      cancelled = true;
      chatService.disconnect();
    };
  }, [activeTab, id, milestones, isChatRelatedTab, canAccessProjectChat, chatPeerId, t]);

  useEffect(() => {
    if (activeTab !== "files" && activeTab !== "activity") return;
    if (!id) return;
    let cancelled = false;

    const loadMilestoneData = async () => {
      try {
        const board = milestones.length > 0 ? milestones : (await fetchMilestoneBoard(id)).data;
        const { items, logs } = await buildMilestoneArtifacts({
          projectId: id,
          milestones: board,
          currentUserId: currentUser?.id,
          participants: chatParticipants,
          meLabel: t("common.me") || "Me",
          fileLabel: t("project.managePage.filesPanel.file"),
          imageLabel: t("project.managePage.filesPanel.image"),
          fromMilestoneLabel: (title) =>
            t("project.managePage.filesPanel.fromMilestone", { title }),
        });

        if (!cancelled) {
          setMilestoneFiles(items);
          setMilestoneSubmissionLogs(logs);
        }
      } catch {
        // ignore
      }
    };

    loadMilestoneData();
    return () => { cancelled = true; };
  }, [activeTab, id, milestones, currentUser]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab, chatMessages]);

  useEffect(() => {
    if (activeTab !== "activity") return;
    if (!id || !isOwner) return;
    fetchOfferList();
  }, [activeTab, id, isOwner]);

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">{t("loading")}</div>;
  }

  if (!project) {
    return <div className="p-6 text-sm text-danger">{t("common.error")}</div>;
  }

  const isCompleted =
    project.status === "complete" ||
    project.status === "completed" ||
    project.status === "closed";
  const canEdit = project.status === "draft";
  const canPublish = project.status === "draft";
  const canDelete = project.status === "draft" || project.status === "open";
  const canClose = project.status === "active";
  const canReport = true;

  const categoryLabel = project.categories?.[0]?.label ?? "-";
  const createdAt = formatDbDate(project.created_at, i18n.language);
  const dateTimeLocale = i18n.language === "th" ? "th-TH" : "en-GB";
  const formatOfferSubmittedAt = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(dateTimeLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const formatFreelancerDisplayName = (offer?: JobOffer) => {
    if (!offer) return t("project.managePage.participants.notAssigned");
    const fullName = [
      offer.freelancer_firstname ?? "",
      offer.freelancer_lastname ?? "",
    ]
      .join(" ")
      .trim();
    if (fullName) return fullName;
    if (offer.freelancer_username) return `@${offer.freelancer_username}`;
    return t("project.managePage.participants.freelancerAssigned", {
      id: offer.freelancer_id.slice(0, 6),
    });
  };
  const formatProposalSenderName = (proposal?: Proposal) => {
    if (!proposal) return t("project.managePage.participants.notAssigned");
    return (
      proposal.freelancer?.display_name ||
      proposal.freelancer?.username ||
      t("project.managePage.participants.freelancerAssigned", {
        id: proposal.freelancer_id.slice(0, 6),
      })
    );
  };
  const clientDisplayName =
    (project.client?.display_name ?? project.client?.username ?? "").trim() ||
    t("common.notSpecified");
  const freelancerName = acceptedOffer
    ? formatFreelancerDisplayName(acceptedOffer)
    : acceptedProposal
      ? formatProposalSenderName(acceptedProposal)
      : (project.freelancer?.display_name ?? project.freelancer?.username ?? "").trim() ||
        t("project.managePage.participants.notAssigned");
  const canOffer = project.status === "open";
  const readyForCompletion =
    milestones.length > 0 &&
    milestones.every(
      (milestone) =>
        milestone.workflow_status === "done" ||
        milestone.submission_status === "approved",
    );
  const myActiveOffer = currentUser
    ? offers.find(
        (offer) =>
          offer.freelancer_id === currentUser.id &&
          (offer.status === "pending" || offer.status === "accepted"),
      )
    : undefined;
  const isOwnOfferPending = myActiveOffer?.status === "pending";
  const isOwnOfferAccepted = myActiveOffer?.status === "accepted";
  const isOwnCounterPending =
    isOwnOfferPending && myActiveOffer?.offer_type === "counter_offer";
  const counterTargetOffer = counterOfferId
    ? offers.find((offer) => offer.id === counterOfferId)
    : undefined;

  const handleOpenCreateOffer = () => {
    setEditingOfferMilestones(false);
    setOfferOpen(true);
  };

  const handleOpenEditOfferMilestones = () => {
    if (!isOwnOfferPending) return;
    setEditingOfferMilestones(true);
    setOfferOpen(true);
  };

  const statusLabel = t(`project.status.${project.status}`, {
    defaultValue: project.status,
  });
  const capitalizeFirst = (value?: string | null) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };
  const displayCurrency = "THB";
  const projectBudget = Number(project.total_budget ?? project.budget ?? 0);
  const formatAmount = (value?: number | null) => Number(value ?? 0).toLocaleString();

  const totalBudget = payout?.total_milestone_amount ?? projectBudget;
  const funded = payout?.total_funded_amount ?? 0;
  const released = payout?.total_released_amount ?? 0;
  const remaining =
    payout?.total_available_amount ??
    Math.max(0, Number(totalBudget) - Number(funded));
  const safeProjectDescription = sanitizeHtml(project.description ?? "");
  const hasProjectDescription = htmlToText(safeProjectDescription).length > 0;

  const workflowBadge = (status?: string | null) => {
    if (!status) return null;
    if (status === "review") {
      return {
        label: t("project.managePage.badges.inReview"),
        className: "bg-indigo-100 text-indigo-700 border-indigo-200",
      };
    }
    if (status === "done") {
      return {
        label: t("project.managePage.badges.done"),
        className: "bg-blue-100 text-blue-700 border-blue-200",
      };
    }
    return {
      label: t("project.managePage.badges.inProgress"),
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  };

  const fundingBadge = (status?: string | null) => {
    if (!status) return null;
    if (status === "released") {
      return {
        label: t("project.managePage.badges.released"),
        className: "bg-lime-100 text-lime-700 border-lime-200",
      };
    }
    if (status === "funded") {
      return {
        label: t("project.managePage.badges.reservedGateway"),
        className: "bg-purple-100 text-purple-700 border-purple-200",
      };
    }
    if (status === "unfunded") {
      return {
        label: t("project.managePage.badges.unfunded"),
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    }
    return {
      label: status,
      className: "bg-amber-100 text-amber-800 border-amber-200",
    };
  };

  const submissionBadge = (status?: string | null) => {
    if (!status) return null;
    if (status === "none") {
      return {
        label: t("project.managePage.badges.uncomplete"),
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    }
    if (status === "pending") {
      return {
        label: t("project.managePage.badges.inReview"),
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    }
    if (status === "submitted") {
      return {
        label: t("project.managePage.badges.submitted"),
        className: "bg-purple-100 text-purple-700 border-purple-200",
      };
    }
    if (status === "approved") {
      return {
        label: t("project.managePage.badges.approved"),
        className: "bg-violet-100 text-violet-700 border-violet-200",
      };
    }
    if (status === "rejected" || status === "revision_requested") {
      return {
        label: t("project.managePage.badges.revisionRequested"),
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      label: status,
      className: "bg-slate-50 text-slate-700 border-slate-200",
    };
  };

  const handleDelete = async () => {
    if (!id || deleting) return;
    try {
      setDeleting(true);
      if (project.job_id && (project.status === "draft" || project.status === "open")) {
        await deleteJob(project.job_id);
      } else {
        await deleteProject(id);
      }
      showToast(t("project.deleteSuccess"), "success");
      navigate("/app/projects", { replace: true });
    } catch {
      showToast(t("project.deleteError"), "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handlePublish = async () => {
    if (!id || publishing) return;
    try {
      setPublishing(true);
      await publishProject(id);
      showToast(t("project.publishSuccess"), "success");
      navigate(`/app/projects/${id}`, { replace: true });
    } catch {
      showToast(t("project.publishError"), "error");
    } finally {
      setPublishing(false);
      setShowPublishModal(false);
    }
  };

  const handleClose = async () => {
    if (!id || closing) return;
    try {
      setClosing(true);
      await closeProject(id);
      showToast(
        t("project.closeSuccess", { defaultValue: "ปิดโปรเจกต์สำเร็จ" }),
        "success",
      );
      const res = await fetchProject(id);
      setProject(res.data);
    } catch {
      showToast(
        t("project.closeError", { defaultValue: "ไม่สามารถปิดโปรเจกต์ได้" }),
        "error",
      );
    } finally {
      setClosing(false);
      setShowCloseModal(false);
    }
  };

  const handleRequestExtension = async (
    milestoneId: string,
    newDate: string,
    reason: string,
  ) => {
    if (!id || extending) return;
    try {
      setExtending(true);
      await requestProjectExtension(id, {
        milestone_id: milestoneId,
        new_due_date: newDate,
        reason: reason,
      });
      showToast("ส่งคำขอขยายเวลาสำเร็จ", "success");
      setShowExtendModal(false);
    } catch {
      showToast("ไม่สามารถส่งคำขอขยายเวลาได้", "error");
    } finally {
      setExtending(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || !chatRoomId || !currentUser?.id) return;

    try {
      chatService.sendMessage(currentUser.id, text);
      setChatInput("");
    } catch {
      showToast(t("project.managePage.chatPanel.sendError"), "error");
    }
  };

  const unknownUserLabel = t("project.managePage.chatPanel.unknownUser");
  const projectFileLabel = t("project.managePage.chatPanel.file");
  const projectImageLabel = t("project.managePage.filesPanel.image");
  const displayUserName = (user?: ProjectPageUserLike | null) =>
    resolveDisplayUserName(user, unknownUserLabel);

  const senderLabel = (senderId: string) => {
    if (senderId === currentUser?.id) return t("project.managePage.chatPanel.you");
    const participant = chatParticipants.find((candidate) => candidate.id === senderId);
    return displayUserName(participant);
  };

  const chatPeer = resolveChatPeer(chatParticipants, currentUser?.id);

  const formatChatTime = (value?: string) =>
    formatProjectChatTime(value, i18n.language);

  const isSameDay = (a?: string, b?: string) => isSameProjectDay(a, b);

  const formatDaySeparator = (value?: string) =>
    formatProjectDaySeparator(value, i18n.language, {
      today: t("project.managePage.chatPanel.today"),
      yesterday: t("project.managePage.chatPanel.yesterday"),
    });

  const renderChatMessageBody = (msg: Message) => {
    if (msg.message_type === "image") {
      return (
        <img
          src={msg.content}
          alt="image"
          className="max-w-[260px] rounded-lg"
        />
      );
    }

    if (msg.message_type === "file") {
      const fileMeta = resolveMessageFileMeta(msg.content, projectFileLabel);
      return (
        <a
          href={fileMeta.url}
          target="_blank"
          rel="noreferrer"
          className="underline font-medium"
        >
          {fileMeta.filename}
        </a>
      );
    }

    return msg.content;
  };

  const chatAttachmentItems = buildChatAttachmentItems({
    messages: chatMessages,
    imageLabel: projectImageLabel,
    fileLabel: projectFileLabel,
    resolveSenderLabel: senderLabel,
  });

  const attachmentItems = sortByOccurredAtDesc(
    [
      ...(project.images ?? []).map((url, index) => ({
        id: `project-img-${index}`,
        type: isImageFileUrl(url) ? "image" : "file",
        url,
        filename: projectImageLabel,
        sender: clientDisplayName,
        created_at: project.created_at,
        source: "milestone" as const,
        sourceLabel: t("project.managePage.filesPanel.fromProject"),
      })),
      ...chatAttachmentItems,
      ...milestoneFiles,
    ],
    (item) => item.created_at
  );

  const activityItems = sortByOccurredAtDesc<ActivityItem>([
    {
      id: `project-created-${project.id}`,
      at: project.created_at,
      title: t("project.managePage.activityPanel.projectCreated"),
      detail: project.title,
      tone: "info",
      actorId: project.owner_id ?? undefined,
    },
    ...(project.published_at
      ? [
          {
            id: `project-published-${project.id}`,
            at: project.published_at,
            title: t("project.managePage.activityPanel.projectPublished"),
            tone: "success",
            actorId: project.owner_id ?? undefined,
          } as ActivityItem,
        ]
      : []),
    ...(assignment?.created_at
      ? [
          {
            id: `assignment-start-${assignment.id}`,
            at: assignment.created_at,
            title: t("project.managePage.activityPanel.assignmentStarted"),
            detail: displayUserName(chatPeer),
            tone: "info",
            actorId: project.owner_id ?? undefined,
          } as ActivityItem,
        ]
      : []),
    ...offers.map((offer): ActivityItem => ({
      id: `offer-${offer.id}`,
      at: offer.created_at,
      title: t("project.managePage.activityPanel.offerSubmitted"),
      detail: `${offer.proposed_budget?.toLocaleString?.() ?? offer.proposed_budget} ${displayCurrency}`,
      tone: "neutral" as const,
      actorId: offer.freelancer_id,
    })),
    ...milestones.map((m): ActivityItem => ({
      id: `milestone-created-${m.id}`,
      at: m.created_at || undefined,
      title: t("project.managePage.activityPanel.milestoneCreated"),
      detail: m.title || `#${m.sequence ?? "-"}`,
      tone: "neutral" as const,
      actorId: project.owner_id ?? undefined,
    })),
    ...milestoneSubmissionLogs.flatMap((log): ActivityItem[] => {
      const items: ActivityItem[] = [];
      if (log.submitted_at) {
        items.push({
          id: `submission-${log.id}-submitted`,
          at: log.submitted_at,
          title: t("project.managePage.activityPanel.workSubmitted"),
          detail: log.milestone_title,
          tone: "warning",
          actorId: log.submitted_by,
        });
      }
      if (log.reviewed_at && log.status) {
        const isRevisionRequest =
          log.status === "rejected" || log.status === "revision_requested";
        items.push({
          id: `submission-${log.id}-reviewed`,
          at: log.reviewed_at,
          title:
            log.status === "approved"
              ? t("project.managePage.activityPanel.workApproved")
              : isRevisionRequest
                ? t("project.managePage.activityPanel.workRejected")
                : t("project.managePage.activityPanel.workReviewed"),
          detail: log.milestone_title,
          tone: (
            log.status === "approved"
              ? "success"
              : isRevisionRequest
                ? "danger"
                : "info"
          ) as ActivityItem["tone"],
          actorId: project.owner_id ?? undefined,
        });
      }
      if (log.attachments_count > 0 && log.submitted_at) {
        items.push({
          id: `submission-${log.id}-files`,
          at: log.submitted_at,
          title: t("project.managePage.activityPanel.filesAttached", {
            count: log.attachments_count,
          }),
          detail: log.milestone_title,
          tone: "info",
          actorId: log.submitted_by,
        });
      }
      return items;
    }),
    ], (item) => item.at);

  const activityActorDisplay = (actorId?: string) => {
    if (actorId && actorId === currentUser?.id) {
      return {
        name: displayUserName(currentUser),
        avatarUrl: currentUser?.avatar_url,
      };
    }

    const participant = actorId
      ? chatParticipants.find((p) => p.id === actorId)
      : undefined;
    if (participant) {
      return {
        name: displayUserName(participant),
        avatarUrl: participant.avatar_url,
      };
    }

    if (actorId && project.assignee?.id === actorId) {
      const assigneeName = `${project.assignee.firstname ?? ""} ${project.assignee.lastname ?? ""}`.trim();
      return {
        name:
          assigneeName ||
          project.assignee.username ||
          project.assignee.email ||
          t("project.managePage.chatPanel.unknownUser"),
      };
    }

    return {
      name: t("project.managePage.chatPanel.unknownUser"),
    };
  };

  return (
    <div className="p-6 w-full space-y-6 [&_button]:rounded-md">
      <div className="relative z-[60] flex items-center gap-2 text-sm text-text-muted">
        <button
          onClick={() => navigate(breadcrumbTarget)}
          className="transition-colors hover:text-primary"
        >
          {breadcrumbLabel}
        </button>
        <span>›</span>
        <span className="text-text-primary font-medium">{project.title}</span>
      </div>

      <CompletionPanel
        project={project}
        assignment={assignment}
        currentUser={currentUser}
        readyForCompletion={readyForCompletion}
        onUpdate={() => {
          fetchProject(id!).then((res) => {
            setProject(res.data);
            if (
              res.data.status === "active" ||
              res.data.status === "complete" ||
              res.data.status === "completed" ||
              res.data.status === "closed"
            ) {
              fetchWorkspace();
            }
          });
        }}
        onBothCompleted={() => {
          if (id) navigate(`/app/projects/${id}`);
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            {project.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={[
                "inline-flex rounded-full border px-2.5 py-1 text-[13px] font-semibold",
                project.status === "active"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : project.status === "open"
                    ? "border-lime-200 bg-lime-50 text-lime-700"
                    : project.status === "completed" ||
                        project.status === "complete"
                      ? "border-lime-200 bg-lime-50 text-lime-700"
                      : project.status === "closed"
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-yellow-200 bg-yellow-50 text-yellow-700",
              ].join(" ")}
            >
              {capitalizeFirst(statusLabel)}
            </span>
            <span className="text-xs text-text-muted">• {categoryLabel}</span>
          </div>
        </div>
        {isAssignee && project.status === "active" && (
          <button
            onClick={() => setShowExtendModal(true)}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            {t("project.managePage.extendRequest")}
          </button>
        )}
      </div>

      {showExtendModal && (
        <RequestExtensionModal
          milestones={milestones
            .filter((m) => m.workflow_status !== "done")
            .map((m) => ({
              id: m.id,
              title: m.title || `Milestone ${m.sequence}`,
            }))}
          onClose={() => setShowExtendModal(false)}
          onSubmit={handleRequestExtension}
        />
      )}

      {milestoneModalOpen && (
        <MilestoneFormModal
          projectId={id!}
          defaultCurrency={displayCurrency}
          editItem={editingMilestone ?? undefined}
          onClose={() => { setMilestoneModalOpen(false); setEditingMilestone(null); }}
          onSaved={() => fetchMilestoneBoard(id!).then((r) => setMilestones(r.data))}
        />
      )}

      <MilestonePlanEditModal
        open={planEditOpen}
        projectId={id!}
        milestones={milestones}
        projectCurrency={displayCurrency}
        onClose={() => setPlanEditOpen(false)}
        onSaved={() => {
          setPlanEditOpen(false);
          fetchMilestoneBoard(id!).then((r) => setMilestones(r.data));
          fetchProject(id!).then((r) => setProject(r.data)).catch(() => {});
        }}
      />

      <div className="mb-1 overflow-x-auto">
        <div className="inline-flex min-w-full items-center gap-2 rounded-2xl border border-border bg-white/90 p-2 shadow-sm">
        {[
          {
            key: "overview",
            label: t("project.managePage.tabs.overview", {
              defaultValue: "Overview",
            }),
          },
          {
            key: "board",
            label: t("project.managePage.tabs.board", {
              defaultValue: "Board",
            }),
            requiresAssignment: true,
          },
          {
            key: "milestones",
            label: t("project.managePage.tabs.milestones", {
              defaultValue: "Milestones",
            }),
            requiresAssignment: true,
          },
          {
            key: "chat",
            label: t("project.managePage.tabs.chat", {
              defaultValue: "Chat",
            }),
            requiresAssignment: true,
          },
          {
            key: "files",
            label: t("project.managePage.tabs.files", {
              defaultValue: "Files",
            }),
          },
          {
            key: "activity",
            label: t("project.managePage.tabs.activity", {
              defaultValue: "Activity",
            }),
          },
        ].filter((tab) => !tab.requiresAssignment || !!assignment || FREELANCER_STATUSES.includes(project.status)).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={
              activeTab === tab.key
                ? "rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm"
                : "rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
            }
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-white p-6">
              <h2 className="text-lg font-bold text-text-primary mb-4">
                {t("project.managePage.sections.details")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-text-muted">
                      {t("project.managePage.fields.category")}
                    </div>
                    <div className="font-semibold text-base">
                      {categoryLabel}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-text-muted">
                      {t("project.managePage.fields.paymentModel")}
                    </div>
                    <div className="font-semibold text-base">
                      {t("project.managePage.fields.paymentModelValue")}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-text-muted">
                      {t("project.managePage.fields.budget")}
                    </div>
                    <div className="font-semibold text-base">
                      {formatAmount(projectBudget)} {displayCurrency}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-text-muted">
                      {t("project.managePage.fields.createdAt")}
                    </div>
                    <div className="font-semibold text-base">{createdAt}</div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="text-sm text-text-muted mb-1">
                  {t("project.managePage.fields.scope")}
                </div>
                {hasProjectDescription ? (
                  <div
                    className="text-base text-text-secondary leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6"
                    dangerouslySetInnerHTML={{ __html: safeProjectDescription }}
                  />
                ) : (
                  <div className="text-base text-text-secondary">
                    {t("common.notSpecified")}
                  </div>
                )}
              </div>

              {(project.skill_tags ?? []).length > 0 && (
                <div className="mt-6">
                  <div className="text-sm text-text-muted mb-2">
                    {t("project.managePage.fields.skills", { defaultValue: "Skills" })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(project.skill_tags ?? []).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(project.images ?? []).length > 0 && (
                <div className="mt-6">
                  <div className="text-sm text-text-muted mb-2">
                    {t("project.managePage.fields.images", { defaultValue: "Images" })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(project.images ?? []).map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={url}
                          alt={`${project.title} image ${idx + 1}`}
                          className="w-full h-40 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                {t("project.managePage.paymentSummary.title")}
              </h3>
              {payoutLoading ? (
                <div className="text-sm text-text-muted">{t("loading")}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-text-muted">
                      {t("project.managePage.paymentSummary.total")}
                    </div>
                    <div className="text-lg font-semibold">
                      {formatAmount(totalBudget)} {displayCurrency}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">
                      {t("project.managePage.paymentSummary.funded")}
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatAmount(funded)} {displayCurrency}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">
                      {t("project.managePage.paymentSummary.released")}
                    </div>
                    <div className="text-lg font-semibold text-lime-600">
                      {formatAmount(released)} {displayCurrency}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">
                      {t("project.managePage.paymentSummary.remaining")}
                    </div>
                    <div className="text-lg font-semibold text-orange-600">
                      {formatAmount(remaining)} {displayCurrency}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                {t("project.managePage.participants.title")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-xs text-text-muted">
                    {t("project.managePage.participants.client")}
                  </div>
                  <div className="font-semibold">{clientDisplayName}</div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="text-xs text-text-muted">
                    {t("project.managePage.participants.freelancer")}
                  </div>
                  <div className="font-semibold">{freelancerName}</div>
                </div>
              </div>
            </div>

            {!isAssignee && isOwner && (
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 text-primary">
                  <HiOutlineRocketLaunch className="w-5 h-5" />{" "}
                  {t("project.detail.proposalRequestsTitle", {
                    defaultValue: "Proposal Requests",
                  })}
                </h2>

                {proposalRequestsLoading ? (
                  <div className="py-10 text-center text-sm text-text-muted">
                    {t("project.managePage.offers.loading")}
                  </div>
                ) : proposalRequests.length === 0 ? (
                  <div className="py-10 text-center text-sm text-text-muted italic border-2 border-dashed border-gray-100 rounded-xl">
                    {t("project.managePage.offers.empty")}
                  </div>
                ) : acceptedProposal ? (
                  <div className="rounded-xl border border-lime-200 bg-lime-50 p-4">
                    <div className="text-sm font-semibold text-lime-800">
                      {t("project.managePage.offers.accepted")}
                    </div>
                    <div className="mt-1 text-sm text-lime-700">
                      {formatProposalSenderName(acceptedProposal)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/app/users/${acceptedProposal.freelancer_id}`)}
                        className="px-3 py-2 rounded-lg border border-lime-300 bg-white text-xs font-semibold text-lime-700 hover:bg-lime-100"
                      >
                        {t("project.detail.viewProfile", { defaultValue: "View Profile" })}
                      </button>
                      <button
                        onClick={() => handleChatWithFreelancer(acceptedProposal.freelancer_id)}
                        className="px-3 py-2 rounded-lg bg-lime-600 text-white text-xs font-semibold hover:bg-lime-700"
                      >
                        {t("project.managePage.offers.chat")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposalRequests.filter((proposal) => proposal.status === "pending").length === 0 ? (
                      <div className="py-10 text-center text-sm text-text-muted italic border-2 border-dashed border-gray-100 rounded-xl">
                        {t("project.managePage.offers.empty")}
                      </div>
                    ) : (
                      proposalRequests
                        .filter((proposal) => proposal.status === "pending")
                        .map((proposal) => {
                      const offerStatus = String(
                        proposal.status ?? "",
                      ).toLowerCase();
                      return (
                        <div
                          key={proposal.id}
                          className="p-4 rounded-xl border border-border hover:border-accent/40 transition-colors bg-white/50 group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base">
                                {formatProposalSenderName(proposal).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-base font-bold text-gray-900">
                                  {formatProposalSenderName(proposal)}
                                </div>
                                <div className="text-[12px] text-gray-400 font-medium tracking-tight">
                                  {t("project.managePage.offers.submittedAt", {
                                    date: formatOfferSubmittedAt(
                                      proposal.created_at,
                                    ),
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                ฿{formatAmount(proposal.proposed_budget)}
                              </div>
                              <div className="text-[14px] text-gray-400 font-bold uppercase">
                                THB
                              </div>
                            </div>
                          </div>

                          {proposal.message && (
                            <p className="text-xs text-text-secondary bg-gray-50 p-2 rounded-lg mb-4 italic">
                              "{proposal.message}"
                            </p>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            {offerStatus === "pending" &&
                              (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => navigate(`/app/users/${proposal.freelancer_id}`)}
                                  className="px-4 py-2 border border-border bg-white rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"
                                >
                                  {t("project.detail.viewProfile", {
                                    defaultValue: "View Profile",
                                  })}
                                </button>
                                <button
                                  onClick={() => handleOpenAcceptOffer(proposal.id)}
                                  className="px-4 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 hover:shadow-lg transition-all"
                                >
                                  {t("project.managePage.offers.accept")}
                                </button>
                                <button
                                  onClick={() => handleOpenRejectOffer(proposal.id)}
                                  className="px-4 bg-rose-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-rose-700 transition-all"
                                >
                                  {t("project.managePage.offers.reject")}
                                </button>
                              </div>
                            )}
                            {offerStatus === "accepted" && (
                              <div className="w-full text-center py-2 bg-lime-50 text-lime-700 rounded-lg text-xs font-bold border border-lime-200">
                                {t("project.managePage.offers.accepted")}
                              </div>
                            )}
                            {offerStatus === "rejected" && (
                              <div className="w-full text-center py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">
                                {t("project.managePage.offers.rejected")}
                              </div>
                            )}
                            {offerStatus !== "pending" &&
                              offerStatus !== "accepted" &&
                              offerStatus !== "rejected" && (
                                <div className="w-full text-center py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                                  {proposal.status}
                                </div>
                              )}
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isAssignee && isOwner && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {t("project.settings")}
                </h2>

                <div className="space-y-3">
                  {canPublish && (
                    <button
                      onClick={() => setShowPublishModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition"
                    >
                      <HiOutlineRocketLaunch className="w-5 h-5" />
                      {t("project.createPage.action.publish")}
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => navigate(`/app/projects/${id}/edit`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary hover:bg-surface transition"
                    >
                      <HiOutlinePencilSquare className="w-5 h-5 text-text-muted" />
                      {t("project.edit")}
                    </button>
                  )}

                  {canReport && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          projectId: id ?? "",
                          ...(assignment ? { assignmentId: assignment.id } : {}),
                        });
                        navigate(`/app/disputes/open?${params.toString()}`);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800"
                    >
                      <HiOutlineArchiveBox className="w-5 h-5" />
                      {t("project.report", { defaultValue: "Report / Dispute" })}
                    </button>
                  )}

                  {canClose && !isCompleted && (
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700"
                    >
                      <HiOutlineLockClosed className="w-5 h-5" />
                      {t("project.close")}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentUser && !isAssignee && !isOwner && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {t("project.offerTitle")}
                </h2>
                {isOwnOfferPending || isOwnOfferAccepted ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="text-sm font-semibold text-blue-900">
                      {isOwnOfferPending
                        ? t("project.managePage.offers.pendingSelfTitle")
                        : t("project.managePage.offers.accepted")}
                    </div>
                    <div className="mt-1 text-xs text-blue-700">
                      {isOwnOfferPending
                        ? t("project.managePage.offers.pendingSelfSubtitle")
                        : t("project.managePage.offers.submittedAt", {
                            date: formatOfferSubmittedAt(
                              myActiveOffer?.created_at,
                            ),
                          })}
                    </div>
                    {myActiveOffer?.created_at && isOwnOfferPending && (
                      <div className="mt-1 text-xs text-blue-600">
                        {t("project.managePage.offers.submittedAt", {
                          date: formatOfferSubmittedAt(
                            myActiveOffer.created_at,
                          ),
                        })}
                      </div>
                    )}
                    {isOwnOfferPending && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {isOwnCounterPending && (
                          <button
                            onClick={handleAcceptCounterMyOffer}
                            disabled={offerLoading}
                            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                          >
                            {t("project.managePage.offers.accept")}
                          </button>
                        )}
                        <button
                          onClick={handleOpenEditOfferMilestones}
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {isOwnCounterPending
                            ? t("project.managePage.offers.viewCounter")
                            : t("project.managePage.offers.editMilestones")}
                        </button>
                        <button
                          onClick={handleWithdrawMyOffer}
                          disabled={offerLoading}
                          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          {t("project.managePage.offers.withdraw")}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleOpenCreateOffer}
                    disabled={!canOffer}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-accent/30 bg-accent/10 text-accent-foreground hover:bg-accent/15 transition disabled:opacity-60"
                  >
                    <HiOutlineRocketLaunch className="w-5 h-5" />
                    {t("project.offer")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "milestones" && (
        <div className="space-y-4">
          {/* Milestone plan approval banner */}
          {project.milestone_plan_pending && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              project.milestone_plan_proposed_by === currentUser?.id
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
            }`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  project.milestone_plan_proposed_by === currentUser?.id
                    ? "text-amber-800"
                    : "text-blue-800"
                }`}>
                  {project.milestone_plan_proposed_by === currentUser?.id
                    ? t("project.managePage.milestones.planPendingOwn", {
                        defaultValue: "Waiting for the other party to review your milestone plan",
                      })
                    : t("project.managePage.milestones.planPendingOther", {
                        defaultValue: "The other party has updated the milestone plan — please review and respond",
                      })}
                </p>
              </div>
              {project.milestone_plan_proposed_by !== currentUser?.id && (
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={reviewingPlan}
                    onClick={async () => {
                      setReviewingPlan(true);
                      try {
                        await reviewMilestonePlan(id!, "approve");
                        setProject((p) => p ? { ...p, milestone_plan_pending: false, milestone_plan_proposed_by: null } : p);
                        showToast(t("project.managePage.milestones.planApproved", { defaultValue: "Milestone plan approved" }), "success");
                      } catch { /* ignore */ } finally { setReviewingPlan(false); }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {t("common.approve", { defaultValue: "Approve" })}
                  </button>
                  <button
                    disabled={reviewingPlan}
                    onClick={async () => {
                      setReviewingPlan(true);
                      try {
                        await reviewMilestonePlan(id!, "reject");
                        setProject((p) => p ? { ...p, milestone_plan_pending: false, milestone_plan_proposed_by: null } : p);
                        showToast(t("project.managePage.milestones.planRejected", { defaultValue: "Milestone plan rejected" }), "info");
                      } catch { /* ignore */ } finally { setReviewingPlan(false); }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
                  >
                    {t("common.reject", { defaultValue: "Reject" })}
                  </button>
                </div>
              )}
            </div>
          )}

          {isOwner && (
            <div className="flex justify-end">
              <button
                onClick={() => setPlanEditOpen(true)}
                className="px-4 py-2 rounded-lg border border-primary/20 bg-primary/10 text-primary text-sm font-semibold shadow-sm transition-colors hover:bg-primary/15"
              >
                {t("project.managePage.milestones.editPlan", { defaultValue: "Edit Milestone Plan" })}
              </button>
            </div>
          )}

          {(() => {
            const fallbackOfferMilestones = acceptedOffer?.proposed_milestones ?? [];
            const hasFallbackOfferMilestones =
              milestones.length === 0 && fallbackOfferMilestones.length > 0;
            return (
              <>
          {milestonesLoading ? (
            <div className="py-10 text-center text-sm text-text-muted">
              {t("loading")}
            </div>
          ) : hasFallbackOfferMilestones ? (
            fallbackOfferMilestones.map((m, idx) => (
              <div
                key={`offer-ms-${idx}`}
                className="rounded-xl border border-border bg-white p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-text-primary">
                      {m.title ||
                        t("project.managePage.milestones.numbered", {
                          number: idx + 1,
                        })}
                    </div>
                    {m.description && (
                      <div className="text-xs text-text-secondary mt-1">
                        {m.description}
                      </div>
                    )}
                  </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-semibold">
                      {formatAmount(m.amount)} {displayCurrency} 
                      </div>
                    <div className="text-sm text-text-muted mt-1">
                      {m.estimated_days
                        ? t("project.managePage.milestones.due", {
                            date: t("project.managePage.milestones.days", {
                              defaultValue: "{{count}} days",
                              count: m.estimated_days,
                            }),
                          })
                        : t("project.managePage.board.noDueDate")}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full border text-[12px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                    {t("project.managePage.offers.pending", {
                      defaultValue: "Proposed milestone",
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : milestones.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">
              {t("project.milestonesEmpty")}
            </div>
          ) : (
            milestones.map((m, idx) => {
              const w =
                workflowBadge(m.workflow_status) ?? {
                  label: t("project.managePage.badges.uncomplete"),
                  className: "bg-amber-100 text-amber-800 border-amber-200",
                };
              const f =
                fundingBadge(m.funding_status) ?? {
                  label: t("project.managePage.badges.unfunded"),
                  className: "bg-amber-100 text-amber-800 border-amber-200",
                };
              const s =
                submissionBadge(m.submission_status ?? "none") ?? {
                  label: t("project.managePage.badges.uncomplete"),
                  className: "bg-amber-100 text-amber-800 border-amber-200",
                };
              const due = m.due_date
                ? formatDbDate(m.due_date, i18n.language)
                : "-";
              const blockedBySequence =
                (m.sequence ?? 0) > 1 &&
                milestones.some(
                  (prev) =>
                    (prev.sequence ?? 0) < (m.sequence ?? 0) &&
                    prev.workflow_status !== "done",
                );
              const canSubmit =
                (() => {
                  const reviewStatus = String(m.submission_status ?? "none").toLowerCase();
                  return !["pending", "submitted", "approved"].includes(reviewStatus);
                })() &&
                isAssignee &&
                m.workflow_status !== "done" &&
                !blockedBySequence;
              const reviewStatus = String(m.submission_status ?? "none").toLowerCase();
              const hasSubmissionForDetail = [
                "pending",
                "submitted",
                "approved",
                "rejected",
                "revision_requested",
              ].includes(
                reviewStatus,
              );
              const canReview = isOwner && (reviewStatus === "submitted" || reviewStatus === "pending");
              const canFund = isOwner && String(m.funding_status ?? "").toLowerCase() === "unfunded";
              const canViewSubmitDetail =
                hasSubmissionForDetail &&
                ((isAssignee && !canSubmit) ||
                  (isOwner && !canReview));
              const isSequenceBlockedForAssignee =
                isAssignee && blockedBySequence;
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-5 flex flex-col gap-3 transition-opacity ${
                    isSequenceBlockedForAssignee
                      ? "border-slate-200 bg-slate-50 opacity-60"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-text-primary">
                        {m.title ||
                          t("project.managePage.milestones.numbered", {
                            number: m.sequence ?? idx + 1,
                          })}
                      </div>
                      {m.description && (
                        <div className="text-xs text-text-secondary mt-1">
                          {m.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      {/* {isOwner && (
                        <button
                          onClick={() => { setEditingMilestone(m); setMilestoneModalOpen(true); }}
                          className="text-xs text-text-muted hover:text-accent underline"
                        >
                          แก้ไข
                        </button>
                      )} */}
                      <div className="text-base font-semibold">
                        {m.amount?.toLocaleString?.() ?? m.amount ?? "-"}{" "}
                        {displayCurrency}
                      </div>
                      <div className="text-sm text-text-muted mt-1">
                        {t("project.managePage.milestones.due", { date: due })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row gap-2">
                    <div className="rounded-lg">
                      {/* <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">
                        {t("project.managePage.milestones.status", { defaultValue: "Status" })}
                      </div> */}
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[12px] font-semibold ${w.className}`}
                      >
                        {capitalizeFirst(w.label)}
                      </span>
                    </div>
                    <div className="rounded-lg">
                      {/* <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">
                        {t("project.managePage.milestones.paidStatus", { defaultValue: "Paid Status" })}
                      </div> */}
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[12px] font-semibold ${f.className}`}
                      >
                        {capitalizeFirst(f.label)}
                      </span>
                    </div>
                    <div className="rounded-lg ">
                      {/* <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">
                        {t("project.managePage.milestones.reviewStatus", { defaultValue: "Review Status" })}
                      </div> */}
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[12px] font-semibold ${s.className}`}
                      >
                        {capitalizeFirst(s.label)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canSubmit && (
                      <button
                        onClick={() => setSubmitWorkMilestone(m)}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                      >
                        {t("project.managePage.milestones.submitWork")}
                      </button>
                    )}
                    {canViewSubmitDetail && (
                      <button
                        onClick={() => setReviewMilestoneId(m.id)}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface-hover"
                      >
                        {t("project.managePage.milestones.viewDetail", {
                          defaultValue: "View Detail",
                        })}
                      </button>
                    )}
                    {canReview && (
                      <button
                        onClick={() => setReviewMilestoneId(m.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                      >
                        {t("project.managePage.milestones.reviewSubmission")}
                      </button>
                    )}
                    {canFund && (
                      <button
                        onClick={() => setFundMilestone(m)}
                        className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10"
                      >
                        {t("project.managePage.milestones.fundEscrow", { defaultValue: "Fund Milestone" })}
                      </button>
                    )}
                  </div>
                  {isAssignee && blockedBySequence && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-block">
                      {t("project.submitWork.errors.previousMilestoneRequired")}
                    </div>
                  )}
                </div>
              );
            })
          )}
              </>
            );
          })()}
        </div>
      )}

      {activeTab === "board" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">
              {t("project.managePage.board.title")}
            </h3>
            <div className="text-sm text-text-muted">
              {t("project.managePage.board.subtitle")}
            </div>
          </div>

          {milestonesLoading ? (
            <div className="py-10 text-center text-base text-text-muted">
              {t("loading")}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {(() => {
                const todoItems = milestones.filter(
                  (m) =>
                    m.workflow_status === "todo" &&
                    m.funding_status !== "funded" &&
                    m.funding_status !== "released",
                );
                const progressItems = milestones.filter(
                  (m) =>
                    m.workflow_status === "todo" &&
                    (m.funding_status === "funded" ||
                      m.funding_status === "released"),
                );
                const reviewItems = milestones.filter(
                  (m) => m.workflow_status === "review",
                );
                const doneItems = milestones.filter(
                  (m) => m.workflow_status === "done",
                );

                const columns = [
                  {
                    title: t("project.managePage.board.columns.todo"),
                    tone: "bg-white border-border",
                    dot: "bg-slate-400",
                    items: todoItems,
                  },
                  {
                    title: t("project.managePage.board.columns.inProgress"),
                    tone: "bg-blue-50 border-blue-100",
                    dot: "bg-blue-500",
                    items: progressItems,
                  },
                  {
                    title: t("project.managePage.board.columns.review"),
                    tone: "bg-amber-50 border-amber-100",
                    dot: "bg-amber-400",
                    items: reviewItems,
                  },
                  {
                    title: t("project.managePage.board.columns.done"),
                    tone: "bg-lime-50 border-lime-100",
                    dot: "bg-lime-500",
                    items: doneItems,
                  },
                ];

                return columns.map((col) => (
                  <div
                    key={col.title}
                    className={`rounded-2xl border ${col.tone} p-4 min-h-[420px]`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-base font-semibold text-text-primary">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${col.dot}`}
                        />
                        {col.title}
                      </div>
                      <span className="text-sm text-text-muted bg-white/80 rounded-full px-2 py-0.5 border border-border/60">
                        {col.items.length}
                      </span>
                    </div>

                    {col.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 text-sm text-text-muted p-4 text-center">
                        {t("project.managePage.board.noTasks")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {col.items.map((m, idx) => {
                          const w = workflowBadge(m.workflow_status);
                          const f = fundingBadge(m.funding_status);
                          const s = submissionBadge(m.submission_status);

                          return (
                            <div
                              key={m.id}
                              className="rounded-xl border border-border bg-white shadow-sm hover:shadow transition-shadow group overflow-hidden"
                            >
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="text-base font-semibold text-text-primary leading-snug break-words">
                                    {m.title ||
                                      t(
                                        "project.managePage.milestones.numbered",
                                        {
                                          number: m.sequence ?? idx + 1,
                                        },
                                      )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {w && (
                                    <span
                                      className={`px-2 py-0.5 rounded-md border text-[12px] font-bold tracking-wide ${w.className}`}
                                    >
                                      {capitalizeFirst(w.label)}
                                    </span>
                                  )}
                                  {f && (
                                    <span
                                      className={`px-2 py-0.5 rounded-md border text-[12px] font-bold tracking-wide ${f.className}`}
                                    >
                                      {capitalizeFirst(f.label)}
                                    </span>
                                  )}
                                  {s && (
                                    <span
                                      className={`px-2 py-0.5 rounded-md border text-[12px] font-bold tracking-wide ${s.className}`}
                                    >
                                      {capitalizeFirst(s.label)}
                                    </span>
                                  )}
                                </div>

                                {m.description && (
                                  <div className="text-sm text-text-muted mt-1 line-clamp-2">
                                    {m.description}
                                  </div>
                                )}
                              </div>
                              <div className="px-4 py-2 bg-surface/30 border-t border-border mt-auto flex items-center justify-between text-sm">
                                <span className="font-semibold text-text-primary">
                                  {m.amount?.toLocaleString?.() ??
                                    m.amount ??
                                    "-"}{" "}
                                  {displayCurrency}
                                </span>
                                <span className="text-text-muted flex items-center gap-1 font-medium">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {m.due_date
                                    ? formatDbDate(m.due_date, i18n.language)
                                    : t("project.managePage.board.noDueDate")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === "chat" && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-text-primary">
              {t("project.managePage.chatPanel.title")}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                {displayUserName(chatPeer).charAt(0).toUpperCase()}
              </span>
              <span>{displayUserName(chatPeer)}</span>
            </div>
          </div>

          {!canAccessProjectChat ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.chatPanel.accessDenied")}
            </div>
          ) : !assignment ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.chatPanel.noAssignment")}
            </div>
          ) : chatError ? (
            <div className="p-6 text-sm text-danger">{chatError}</div>
          ) : (
            <>
              <div className="h-[420px] overflow-y-auto bg-slate-50/70 px-4 py-4 space-y-2">
                {chatLoading ? (
                  <div className="text-sm text-text-muted">
                    {t("project.managePage.chatPanel.loading")}
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-sm text-text-muted">
                    {t("project.managePage.chatPanel.empty")}
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMine = msg.sender_id === currentUser?.id;
                    const prev = chatMessages[idx - 1];
                    const showDaySeparator =
                      idx === 0 || !isSameDay(prev?.created_at, msg.created_at);
                    return (
                      <div key={msg.id}>
                        {showDaySeparator && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full border border-border bg-white px-3 py-1 text-[11px] text-text-muted">
                              {formatDaySeparator(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                            <div className="mb-1 px-1 text-[11px] text-text-muted">
                              {senderLabel(msg.sender_id)}
                            </div>
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm break-words ${
                                isMine
                                  ? "bg-blue-600 text-white rounded-br-sm"
                                  : "bg-white text-text-primary border border-border rounded-bl-sm"
                              }`}
                            >
                              {renderChatMessageBody(msg)}
                              <div
                                className={`mt-1 text-[10px] ${
                                  isMine ? "text-blue-100" : "text-text-muted"
                                }`}
                              >
                                {formatChatTime(msg.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-border px-4 py-3 flex items-center gap-3 bg-white">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder={t("project.managePage.chatPanel.placeholder")}
                  className="flex-1 h-10 rounded-lg border border-border px-3 text-sm"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || !chatRoomId}
                  className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {t("project.managePage.chatPanel.send")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "files" && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-text-primary">
              {t("project.managePage.filesPanel.title")}
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              {t("project.managePage.filesPanel.subtitle")}
            </p>
          </div>

          {!canAccessProjectChat ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.chatPanel.accessDenied")}
            </div>
          ) : chatError ? (
            <div className="p-6 text-sm text-danger">{chatError}</div>
          ) : chatLoading ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.filesPanel.loading")}
            </div>
          ) : attachmentItems.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.filesPanel.empty")}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {attachmentItems.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors overflow-hidden"
                >
                  {item.type === "image" ? (
                    <div className="h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-44 bg-slate-100 flex items-center justify-center text-sm text-text-muted">
                      {t("project.managePage.filesPanel.file")}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {item.filename}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {item.sender}
                    </div>
                    {item.sourceLabel && (
                      <div className="mt-0.5 text-xs text-text-muted">
                        {item.sourceLabel}
                      </div>
                    )}
                    <div className="mt-0.5 text-xs text-text-muted">
                      {formatDaySeparator(item.created_at)} • {formatChatTime(item.created_at)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-text-primary">
              {t("project.managePage.activityPanel.title")}
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              {t("project.managePage.activityPanel.subtitle")}
            </p>
          </div>

          {chatLoading ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.activityPanel.loading")}
            </div>
          ) : activityItems.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">
              {t("project.managePage.activityPanel.empty")}
            </div>
          ) : (
            <div className="p-5">
              <div className="space-y-4">
                {activityItems.map((item) => {
                  const actor = activityActorDisplay(item.actorId);
                  return (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <span
                        className={`h-3.5 w-3.5 rounded-full ${getActivityToneClass(item.tone)}`}
                      />
                      <span className="w-px flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-2">
                      <div className="text-base font-medium text-text-primary">
                        {item.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Avatar
                          size="sm"
                          src={actor.avatarUrl}
                          fallback={actor.name.charAt(0).toUpperCase()}
                        />
                        <span className="text-sm text-text-muted">
                          {actor.name}
                        </span>
                      </div>
                      {/* {item.detail && (
                        <div className="text-sm text-text-muted mt-0.5">
                          {item.detail}
                        </div>
                      )} */}
                      <div className="text-xs text-text-muted mt-2">
                        {item.at
                          ? `${formatDaySeparator(item.at)} • ${formatChatTime(item.at)}`
                          : "-"}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab !== "overview" &&
        activeTab !== "milestones" &&
        activeTab !== "board" &&
        activeTab !== "chat" &&
        activeTab !== "files" &&
        activeTab !== "activity" && (
        <div className="rounded-xl border border-border bg-white p-6 text-sm text-text-muted">
          {t("project.managePage.emptyTab")}
        </div>
      )}

      <ConfirmDeleteModal
        open={showDeleteModal}
        loading={deleting}
        title={t("project.deleteTitle")}
        description={t("project.deleteDescription")}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showPublishModal}
        loading={publishing}
        title={t("project.createPage.action.publish")}
        description={t("project.noProposalsHint")}
        confirmText={t("project.createPage.action.publish")}
        onCancel={() => setShowPublishModal(false)}
        onConfirm={handlePublish}
      />

      <ConfirmDialog
        open={showCloseModal}
        loading={closing}
        title={t("project.close", { defaultValue: "ปิดโปรเจกต์" })}
        description={t("project.closeConfirmDescription", {
          defaultValue:
            "คุณต้องการปิดโปรเจกต์นี้ใช่หรือไม่? เมื่องานเสร็จสิ้นและปิดแล้ว จะไม่สามารถแก้ไขได้อีก",
        })}
        confirmText={t("project.close", { defaultValue: "ปิดโปรเจกต์" })}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={handleClose}
      />

      <ConfirmDialog
        open={showAcceptOfferModal}
        loading={acceptingOffer}
        title={t("project.managePage.offers.accept")}
        description={t("project.managePage.offers.confirmHire")}
        confirmText={t("project.managePage.offers.accept")}
        onCancel={() => {
          if (acceptingOffer) return;
          setShowAcceptOfferModal(false);
        }}
        onConfirm={handleAcceptOffer}
      />

      <OfferModal
        open={offerOpen}
        currency={displayCurrency}
        title={
          editingOfferMilestones
            ? t("project.managePage.offers.editMilestones")
            : undefined
        }
        subtitle={
          editingOfferMilestones
            ? t("project.managePage.offers.editMilestonesSubtitle")
            : undefined
        }
        submitLabel={
          editingOfferMilestones
            ? t("project.managePage.offers.saveMilestones")
            : undefined
        }
        readOnly={editingOfferMilestones && isOwnCounterPending}
        showMessage={!editingOfferMilestones}
        initialMessage={editingOfferMilestones ? myActiveOffer?.message ?? "" : ""}
        initialMilestones={
          editingOfferMilestones
            ? (myActiveOffer?.proposed_milestones ?? []).map((m) => ({
                title: m.title || "",
                amount: Number(m.amount ?? 0),
                estimated_days: m.estimated_days ?? undefined,
                description: m.description ?? undefined,
              }))
            : undefined
        }
        loading={offerLoading}
        onCancel={() => {
          setOfferOpen(false);
          setEditingOfferMilestones(false);
        }}
        onSubmit={(budget, message, milestones) => {
          if (editingOfferMilestones) {
            return handleReplaceOfferMilestones(budget, milestones);
          }
          return handleSubmitOffer(budget, message, milestones);
        }}
      />

      <OfferModal
        open={counterOfferOpen}
        currency={displayCurrency}
        title={t("project.managePage.offers.counterTitle")}
        subtitle={t("project.managePage.offers.counterSubtitle")}
        submitLabel={t("project.managePage.offers.counterSubmit")}
        showMessage
        initialMessage={counterTargetOffer?.message ?? ""}
        initialMilestones={(counterTargetOffer?.proposed_milestones ?? []).map((m) => ({
          title: m.title || "",
          amount: Number(m.amount ?? 0),
          estimated_days: m.estimated_days ?? undefined,
          description: m.description ?? undefined,
        }))}
        loading={offerLoading}
        onCancel={() => {
          if (offerLoading) return;
          setCounterOfferOpen(false);
          setCounterOfferId(null);
        }}
        onSubmit={handleCounterOffer}
      />

      {showRejectOfferModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (rejectingOffer) return;
            setShowRejectOfferModal(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary">
              {t("project.managePage.offers.rejectConfirmTitle")}
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              {t("project.managePage.offers.rejectConfirmDescription")}
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-text-secondary">
                {t("project.managePage.offers.rejectReasonLabel")}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("project.managePage.offers.rejectReasonPlaceholder")}
                className="mt-2 w-full min-h-[120px] rounded-lg border border-border p-3 text-sm text-text-primary"
                disabled={rejectingOffer}
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRejectOfferModal(false)}
                disabled={rejectingOffer}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleRejectOffer}
                disabled={rejectingOffer}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {rejectingOffer ? t("loading") : t("project.managePage.offers.reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitWorkMilestone && (
        <MilestoneSubmitModal
          open={!!submitWorkMilestone}
          projectId={id!}
          milestone={submitWorkMilestone}
          allMilestones={milestones}
          projectCurrency={displayCurrency}
          onClose={() => setSubmitWorkMilestone(null)}
          onSuccess={() => {
            setSubmitWorkMilestone(null);
            fetchMilestones();
          }}
        />
      )}

      {fundMilestone && id && (
        <MilestoneFundModal
          projectId={id}
          milestone={fundMilestone}
          onSuccess={() => {
            setFundMilestone(null);
            fetchMilestones();
            fetchPayout();
          }}
          onClose={() => setFundMilestone(null)}
        />
      )}

      {reviewMilestoneId && (
        <MilestoneReviewModal
          open={!!reviewMilestoneId}
          projectId={id!}
          milestoneId={reviewMilestoneId}
          onClose={() => setReviewMilestoneId(null)}
          onSuccess={() => {
            setReviewMilestoneId(null);
            fetchMilestones();
          }}
        />
      )}
    </div>
  );
}
