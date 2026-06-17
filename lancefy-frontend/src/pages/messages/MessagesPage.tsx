import { useState, useEffect, useMemo, useRef } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { Hash, Search, Plus, MessageSquare, Handshake, FolderOpen, Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { chatService } from "@/services/chat.service";
import { ChatRoom, Message, WsEvent } from "@/types/chat.types";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { getProposal } from "@/services/jobs.service";
import { acceptMilestoneOffer, submitOffer } from "@/services/projects/project";
import type { Proposal } from "@/types";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import OfferModal from "@/components/modals/OfferModal";
import { useToast } from "@/components/ui/Toast";
import { formatFileSize } from "@/utils/formatters";
import { getUserDisplayName, getUserInitials } from "@/utils/user";

import {
  ChatHeader,
  MessageComposer,
  MessageList,
  MessagesSidebar,
} from "./components";
import type {
  FileAttachmentMeta,
  MilestoneOfferDecisionMessage,
  MilestoneOfferMessage,
  RoomTabItem,
  RoomTabKey,
  SystemPayload,
} from "./messages-page.types";

const parseSystemPayload = (content: string): SystemPayload | null => {
  try {
    const payload = JSON.parse(content);
    if (!payload || typeof payload !== "object") return null;
    if (payload.kind === "milestone_offer" && payload.offer_id) return payload as MilestoneOfferMessage;
    if (payload.kind === "milestone_offer_decision" && payload.offer_id) return payload as MilestoneOfferDecisionMessage;
    return null;
  } catch {
    return null;
  }
};

function parseFileAttachmentMeta(
  content: string,
  fallbackFilename = "Attachment",
): FileAttachmentMeta {
  const defaultMeta: FileAttachmentMeta = {
    url: content,
    filename: fallbackFilename,
    size: 0,
  };

  try {
    const parsed = JSON.parse(content) as Partial<FileAttachmentMeta> | null;

    if (!parsed || typeof parsed !== "object") {
      return defaultMeta;
    }

    return {
      url: typeof parsed.url === "string" && parsed.url ? parsed.url : content,
      filename:
        typeof parsed.filename === "string" && parsed.filename
          ? parsed.filename
          : defaultMeta.filename,
      size: typeof parsed.size === "number" ? parsed.size : 0,
    };
  } catch {
    return defaultMeta;
  }
}

// ...

export default function MessagesPage() {
  useKeycloak();
  const { t } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId");
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // reply / edit state
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // typing indicator
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId → firstname
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingSentAt = useRef<number>(0);

  const [roomTab, setRoomTab] = useState<RoomTabKey>("all");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CurrentUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false);
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState("");
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [dealProjectBudget, setDealProjectBudget] = useState<number | null>(null);
  const [isOfferPendingForMe, setIsOfferPendingForMe] = useState(false);
  const [counterTargetOffer, setCounterTargetOffer] = useState<MilestoneOfferMessage | null>(null);
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [offerActionHiddenMap, setOfferActionHiddenMap] = useState<Record<string, true>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = currentUser?.id;
  const selectedPeer = selectedRoom?.participants?.find((p) => p.id !== currentUserId);
  const isDealFreelancer =
    !!selectedRoom &&
    selectedRoom.room_type === "deal" &&
    !!selectedProposal &&
    !!currentUserId &&
    selectedProposal.freelancer_id === currentUserId;
  const canSendMilestoneOffer =
    !!selectedRoom &&
    selectedRoom.room_type === "deal" &&
    (selectedProposal ? isDealFreelancer : true) &&
    !isOfferPendingForMe;
  const isProjectOwner =
    !!selectedProposal && !!currentUserId && selectedProposal.client_id === currentUserId;
  const offerDecisionMap = useMemo(() => {
    const map: Record<string, "accepted" | "rejected"> = {};
    for (const msg of messages) {
      if (msg.message_type !== "system") continue;
      const payload = parseSystemPayload(msg.content);
      if (!payload || payload.kind !== "milestone_offer_decision") continue;
      map[payload.offer_id] = payload.decision;
    }
    return map;
  }, [messages]);
  const isDealClosedByAcceptedOffer =
    !!selectedRoom && selectedRoom.room_type === "deal" && Object.values(offerDecisionMap).includes("accepted");

  const relatedProjectRoom = useMemo(() => {
    if (!selectedRoom || selectedRoom.room_type !== "deal" || !selectedRoom.project_id) return null;
    return rooms.find(r => r.room_type === "project" && r.project_id === selectedRoom.project_id) ?? null;
  }, [selectedRoom, rooms]);
  const roomTabCounts = useMemo(() => {
    const activeRooms = rooms.filter((room) => room.status !== "archived");

    return {
      all: activeRooms.length,
      dm: activeRooms.filter((room) => room.room_type === "dm").length,
      deal: activeRooms.filter((room) => room.room_type === "deal").length,
      project: activeRooms.filter((room) => room.room_type === "project").length,
      archive: rooms.filter((room) => room.status === "archived").length,
    };
  }, [rooms]);
  const roomTabs = useMemo<readonly RoomTabItem[]>(
    () =>
      ([
        { key: "all", label: t("messagesPage.tabs.all"), icon: <MessageSquare className="h-[15px] w-[15px]" /> },
        { key: "dm", label: t("messagesPage.tabs.dm"), icon: <MessageSquare className="h-[15px] w-[15px]" /> },
        { key: "deal", label: t("messagesPage.tabs.deal"), icon: <Handshake className="h-[15px] w-[15px]" /> },
        { key: "project", label: t("messagesPage.tabs.project"), icon: <FolderOpen className="h-[15px] w-[15px]" /> },
        { key: "archive", label: t("messagesPage.tabs.archive"), icon: <Archive className="h-[15px] w-[15px]" /> },
      ] as const),
    [t]
  );

  const roomPeer = (room: ChatRoom) => room.participants?.find((p) => p.id !== currentUserId);
  const roomTypeLabel = (roomType: ChatRoom["room_type"]) => {
    switch (roomType) {
      case "dm":
        return t("messagesPage.roomTypes.dm");
      case "deal":
        return t("messagesPage.roomTypes.deal");
      case "project":
        return t("messagesPage.roomTypes.project");
      case "group":
        return t("messagesPage.roomTypes.group");
      case "main":
        return t("messagesPage.roomTypes.main");
      default:
        return roomType;
    }
  };
  const roomDisplayName = (room: ChatRoom) => {
    const peer = roomPeer(room);
    const fallbackUser = t("messagesPage.fallbacks.user");
    if (room.room_type === "dm") return getUserDisplayName(peer, fallbackUser);
    if (room.room_type === "deal") {
      return room.name || `${t("messagesPage.fallbacks.dealPrefix")} — ${getUserDisplayName(peer, fallbackUser)}`;
    }
    if (room.room_type === "project") {
      return room.name || `${t("messagesPage.fallbacks.projectPrefix")} — ${getUserDisplayName(peer, fallbackUser)}`;
    }
    return room.name || t("messagesPage.fallbacks.group");
  };

  const visibleRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const isArchived = room.status === "archived";
        if (roomTab === "archive") {
          return (
            isArchived &&
            roomDisplayName(room).toLowerCase().includes(roomFilter.toLowerCase())
          );
        }
        if (isArchived) return false;
        if (roomTab !== "all" && room.room_type !== roomTab) return false;
        return roomDisplayName(room).toLowerCase().includes(roomFilter.toLowerCase());
      }),
    [roomFilter, roomTab, rooms],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ...

  useEffect(() => {
    authService.getCurrentUser().then(user => {
      setCurrentUser(user);
    });

    chatService.getRooms()
      .then(fetchedRooms => {
        setRooms(fetchedRooms);
        if (roomIdFromUrl) {
          const targetRoom = fetchedRooms.find(r => r.id === roomIdFromUrl);
          if (targetRoom) {
            setSelectedRoom(targetRoom);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [roomIdFromUrl]);

  useEffect(() => {
    const search = async () => {
      if (userSearchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const users = await chatService.searchUsers(userSearchQuery);
        setSearchResults(users);
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  useEffect(() => {
    if (selectedRoom) {
      // 1. Get history
      chatService.getMessages(selectedRoom.id).then(setMessages);

      // 2. Mark as read
      chatService.markRoomAsRead(selectedRoom.id);
      setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, unread_count: 0 } : r));

      // 3. Connect WebSocket — route incoming events
      chatService.connect(selectedRoom.id, (ev: WsEvent) => {
        if (!ev.action) {
          // new message
          const msg = ev as Message;
          setMessages((prev) => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          chatService.markRoomAsRead(selectedRoom.id);
        } else if (ev.action === "read") {
          // peer read the room — update peer_last_read_at on selectedRoom
          if (ev.user_id !== currentUserId) {
            setSelectedRoom(prev => prev ? { ...prev, peer_last_read_at: ev.last_read_at } : prev);
            setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, peer_last_read_at: ev.last_read_at } : r));
          }
        } else if (ev.action === "typing") {
          setTypingUsers(prev => ({ ...prev, [ev.user_id]: ev.firstname }));
          clearTimeout(typingTimers.current[ev.user_id]);
          typingTimers.current[ev.user_id] = setTimeout(() => {
            setTypingUsers(prev => { const n = { ...prev }; delete n[ev.user_id]; return n; });
          }, 3000);
        } else if (ev.action === "stop_typing") {
          setTypingUsers(prev => { const n = { ...prev }; delete n[ev.user_id]; return n; });
        } else if (ev.action === "edited") {
          setMessages(prev => prev.map(m => m.id === ev.id ? { ...m, content: ev.content, edited_at: ev.edited_at } : m));
        } else if (ev.action === "deleted") {
          setMessages(prev => prev.filter(m => m.id !== ev.id));
        }
      });
    }

    return () => {
      chatService.disconnect();
      setTypingUsers({});
    };
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!selectedRoom?.proposal_id) {
      setSelectedProposal(null);
      return;
    }
    getProposal(selectedRoom.proposal_id)
      .then((res) => setSelectedProposal(res.data))
      .catch(() => setSelectedProposal(null));
  }, [selectedRoom?.proposal_id]);

  useEffect(() => {
    if (!selectedRoom || selectedRoom.room_type !== "deal") {
      setDealProjectBudget(null);
      return;
    }
    let alive = true;
    chatService
      .getRoomContext(selectedRoom.id)
      .then((ctx) => {
        if (!alive) return;
        // Deal phase may not have project yet; fallback to accepted proposal budget.
        const totalBudget = Number(
          ctx.project?.total_budget ?? ctx.proposal?.proposed_budget ?? NaN
        );
        setDealProjectBudget(Number.isFinite(totalBudget) ? totalBudget : null);
      })
      .catch(() => {
        if (!alive) return;
        setDealProjectBudget(null);
      });
    return () => {
      alive = false;
    };
  }, [selectedRoom?.id, selectedRoom?.room_type]);

  useEffect(() => {
    if (!selectedRoom || selectedRoom.room_type !== "deal" || !currentUserId) {
      setIsOfferPendingForMe(false);
      return;
    }
    const key = `deal_offer_pending:${selectedRoom.id}:${currentUserId}`;
    setIsOfferPendingForMe(localStorage.getItem(key) === "1");
  }, [selectedRoom?.id, selectedRoom?.room_type, currentUserId]);

  // Clear "offer pending" flag when the other side sends a counter or a decision arrives
  useEffect(() => {
    if (!selectedRoom || selectedRoom.room_type !== "deal" || !currentUserId) return;
    const key = `deal_offer_pending:${selectedRoom.id}:${currentUserId}`;
    const hasIncomingSystemMsg = messages.some((m) => {
      if (m.message_type !== "system" || m.sender_id === currentUserId) return false;
      try {
        const payload = parseSystemPayload(m.content);
        // Counter offer from the other side or a decision → my pending offer is resolved
        return payload?.kind === "milestone_offer" || payload?.kind === "milestone_offer_decision";
      } catch { return false; }
    });
    if (hasIncomingSystemMsg) {
      localStorage.removeItem(key);
      setIsOfferPendingForMe(false);
    }
  }, [messages, selectedRoom?.id, selectedRoom?.room_type, currentUserId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isDealClosedByAcceptedOffer) return;
    if (editingId) {
      if (editContent.trim()) chatService.editMessage(editingId, editContent.trim());
      setEditingId(null);
      setEditContent("");
      return;
    }
    if (!inputMessage.trim() || !selectedRoom || !currentUserId) return;
    chatService.sendMessage(currentUserId, inputMessage, "text", replyTo?.id);
    setInputMessage("");
    setReplyTo(null);
    chatService.sendStopTyping();
  };

  const handleInputChange = (val: string) => {
    setInputMessage(val);
    const now = Date.now();
    if (now - typingSentAt.current > 2000) {
      chatService.sendTyping();
      typingSentAt.current = now;
    }
    if (!val) chatService.sendStopTyping();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (isDealClosedByAcceptedOffer) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!file || !selectedRoom || !currentUserId) return;

    try {
      setUploading(true);
      const res = await chatService.uploadFile(file);

      // Determine message type
      const isImage = file.type.startsWith("image/");
      const msgType = isImage ? "image" : "file";

      // Encode metadata as JSON so filename/size are preserved
      const content = isImage
        ? res.url
        : JSON.stringify({ url: res.url, filename: res.filename, size: res.size, content_type: res.content_type });

      chatService.sendMessage(currentUserId, content, msgType);
    } catch (err) {
      console.error("Upload failed", err);
      alert(t("messagesPage.toast.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStartDM = async (userId: string) => {
    try {
      const room = await chatService.createDM(userId);
      // Reload all rooms to get complete participant data
      const freshRooms = await chatService.getRooms();
      setRooms(freshRooms);
      const freshRoom = freshRooms.find(r => r.id === room.id) || room;
      setSelectedRoom(freshRoom);
      setIsNewChatOpen(false);
      setUserSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to start DM", err);
      alert(t("messagesPage.toast.startDmFailed"));
    }
  };

  const handleOpenOfferModal = () => {
    if (isDealClosedByAcceptedOffer) {
      showToast(t("messagesPage.toast.dealClosedContinueInProject"), "error");
      return;
    }
    if (!selectedRoom || !canSendMilestoneOffer) {
      showToast(t("messagesPage.toast.offerFreelancerOnly"), "error");
      return;
    }
    setOfferModalOpen(true);
  };

  const handleSubmitDirectOffer = async (
    budget: number,
    message: string,
    milestones: {
      title: string;
      amount: number;
      estimated_days: number;
      description?: string;
    }[],
  ) => {
    if (!selectedRoom || offerLoading) return;
    if (!Number.isFinite(budget) || budget <= 0 || milestones.length === 0) {
      showToast(t("messagesPage.toast.offerIncomplete"), "error");
      return;
    }
    if (
      dealProjectBudget != null &&
      Number.isFinite(Number(dealProjectBudget)) &&
      budget > Number(dealProjectBudget)
    ) {
      showToast(t("messagesPage.toast.offerExceedsBudget"), "error");
      return;
    }
    try {
      setOfferLoading(true);
      if (selectedRoom.room_type !== "deal") {
        showToast(t("messagesPage.toast.offerDealOnly"), "error");
        return;
      }
      if (selectedProposal && !isDealFreelancer) {
        showToast(t("messagesPage.toast.offerFreelancerOnly"), "error");
        return;
      }
      // New flow: deal can negotiate milestones before a project is created.
      // If project_id exists, keep syncing with backend project-offer endpoint.
      if (selectedRoom.project_id) {
        await submitOffer(selectedRoom.project_id, {
          proposed_budget: budget,
          currency: "THB",
          message: message.trim() || undefined,
          proposed_milestones: milestones,
        });
      }
      if (currentUserId) {
        const key = `deal_offer_pending:${selectedRoom.id}:${currentUserId}`;
        localStorage.setItem(key, "1");
      }
      setIsOfferPendingForMe(true);
      if (currentUserId) {
        const offerPayload: MilestoneOfferMessage = {
          kind: "milestone_offer",
          offer_id: crypto.randomUUID(),
          project_id: selectedRoom.project_id,
          proposed_budget: budget,
          currency: "THB",
          message: message.trim() || undefined,
          milestones,
          sent_by: currentUserId,
          created_at: new Date().toISOString(),
        };
        chatService.sendMessage(currentUserId, JSON.stringify(offerPayload), "system");
      }
      showToast(t("messagesPage.toast.offerSuccess"), "success");
      setOfferModalOpen(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail ?? t("messagesPage.toast.offerFailed"), "error");
    } finally {
      setOfferLoading(false);
    }
  };

  const handleOfferDecision = (offerId: string, decision: "accepted" | "rejected") => {
    if (!currentUserId) return;
    const payload: MilestoneOfferDecisionMessage = {
      kind: "milestone_offer_decision",
      offer_id: offerId,
      decision,
      by: currentUserId,
      created_at: new Date().toISOString(),
    };
    chatService.sendMessage(currentUserId, JSON.stringify(payload), "system");
  };

  const hideOfferActions = (offerId: string) => {
    setOfferActionHiddenMap((prev) => ({ ...prev, [offerId]: true }));
  };

  const handleAcceptAndPromoteProjectChat = async (offer: MilestoneOfferMessage) => {
    const offerId = offer.offer_id;
    hideOfferActions(offerId);
    if (!selectedRoom || selectedRoom.room_type !== "deal") {
      handleOfferDecision(offerId, "accepted");
      return;
    }
    const milestonePayload = {
      proposed_budget: Number(offer.proposed_budget),
      currency: offer.currency || "THB",
      message: offer.message,
      proposed_milestones: (offer.milestones || []).map((m) => ({
        title: m.title,
        amount: Number(m.amount),
        estimated_days: m.estimated_days,
        description: m.description,
      })),
    };
    try {
      if (isProjectOwner) {
        // Client accepts -> use existing client-accept endpoints
        if (selectedRoom.project_id) {
          await acceptMilestoneOffer(selectedRoom.project_id, offerId, milestonePayload);
        } else {
          await chatService.acceptDealOffer(selectedRoom.id, offerId, milestonePayload);
        }
      } else {
        // Freelancer accepts client's counter offer -> new endpoint
        await chatService.freelancerAcceptDealOffer(selectedRoom.id, offerId, milestonePayload);
      }
      handleOfferDecision(offerId, "accepted");
      const promotedRoom = await chatService.promoteDealToProject(selectedRoom.id);
      const freshRooms = await chatService.getRooms();
      setRooms(freshRooms);
      const targetRoom = freshRooms.find((room) => room.id === promotedRoom.id) ?? promotedRoom;
      setSelectedRoom(targetRoom);
      navigate(`/app/messages?roomId=${targetRoom.id}`);
      showToast(t("messagesPage.toast.acceptPromoteSuccess"), "success");
    } catch (err) {
      console.error("Failed to promote deal room", err);
      showToast(t("messagesPage.toast.acceptPromoteFailed"), "error");
    }
  };

  const handleOpenCounterModal = (offer: MilestoneOfferMessage) => {
    hideOfferActions(offer.offer_id);
    setCounterTargetOffer(offer);
    setCounterModalOpen(true);
  };

  const handleSubmitCounterOffer = (
    budget: number,
    message: string,
    milestones: { title: string; amount: number; estimated_days: number; description?: string }[],
  ) => {
    if (!currentUserId || !selectedRoom) return;
    const counterPayload: MilestoneOfferMessage = {
      kind: "milestone_offer",
      offer_id: crypto.randomUUID(),
      counter_to: counterTargetOffer?.offer_id,
      project_id: selectedRoom.project_id,
      proposed_budget: budget,
      currency: counterTargetOffer?.currency || "THB",
      message: message.trim() || undefined,
      milestones,
      sent_by: currentUserId,
      created_at: new Date().toISOString(),
    };
    chatService.sendMessage(currentUserId, JSON.stringify(counterPayload), "system");
    setCounterModalOpen(false);
    setCounterTargetOffer(null);
  };

  const handleNewChat = () => {
    setInviteRoomId(null);
    setIsNewChatOpen(true);
  };

  const handleSelectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    if ((room.unread_count ?? 0) > 0) {
      chatService.markRoomAsRead(room.id);
      setRooms((prev) =>
        prev.map((currentRoom) =>
          currentRoom.id === room.id
            ? { ...currentRoom, unread_count: 0 }
            : currentRoom,
        ),
      );
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    chatService.deleteMessage(messageId);
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
  };

  const handleRejectOffer = (offerId: string) => {
    hideOfferActions(offerId);
    handleOfferDecision(offerId, "rejected");
  };

  const handleGoToProjectChat = () => {
    if (!relatedProjectRoom) return;
    setSelectedRoom(relatedProjectRoom);
    navigate(`/app/messages?roomId=${relatedProjectRoom.id}`);
  };

  const handleGoToProject = () => {
    if (!relatedProjectRoom?.project_id) return;
    navigate(`/app/projects/${relatedProjectRoom.project_id}`);
  };


  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-6 overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)] p-4 sm:p-6 xl:h-[calc(100dvh-140px)] xl:flex-row xl:p-8">
      <MessagesSidebar
        title={t("messagesPage.title")}
        subtitle={t("messagesPage.subtitle")}
        searchPlaceholder={t("messagesPage.searchPlaceholder")}
        roomTab={roomTab}
        roomTabs={roomTabs}
        roomTabCounts={roomTabCounts}
        roomFilter={roomFilter}
        rooms={visibleRooms}
        loading={loading}
        selectedRoomId={selectedRoom?.id}
        getRoomPeer={roomPeer}
        getRoomDisplayName={roomDisplayName}
        onNewChat={handleNewChat}
        onRoomTabChange={setRoomTab}
        onRoomFilterChange={setRoomFilter}
        onSelectRoom={handleSelectRoom}
      />

      {/* Chat Area */}
      <div className="flex min-h-[560px] min-w-0 flex-1 self-stretch flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] xl:min-h-0">
        {selectedRoom ? (
          <>
            <ChatHeader
              selectedRoom={selectedRoom}
              selectedPeer={selectedPeer}
              canSendMilestoneOffer={canSendMilestoneOffer}
              isOfferPendingForMe={isOfferPendingForMe}
              isDealClosedByAcceptedOffer={isDealClosedByAcceptedOffer}
              isRoomInfoOpen={isRoomInfoOpen}
              onOpenOfferModal={handleOpenOfferModal}
              onToggleRoomInfo={() => setIsRoomInfoOpen(!isRoomInfoOpen)}
              onOpenPeerProfile={() => selectedPeer && navigate(`/app/users/${selectedPeer.id}`)}
              onOpenProject={() => selectedRoom.project_id && navigate(`/app/projects/${selectedRoom.project_id}`)}
            />

            <MessageList
              selectedRoom={selectedRoom}
              messages={messages}
              currentUserId={currentUserId}
              offerDecisionMap={offerDecisionMap}
              offerActionHiddenMap={offerActionHiddenMap}
              messagesEndRef={messagesEndRef}
              parseFileAttachmentMeta={parseFileAttachmentMeta}
              parseSystemPayload={parseSystemPayload}
              formatFileSize={formatFileSize}
              onReply={setReplyTo}
              onDelete={handleDeleteMessage}
              onAcceptOffer={handleAcceptAndPromoteProjectChat}
              onOpenCounter={handleOpenCounterModal}
              onRejectOffer={handleRejectOffer}
            />

            <MessageComposer
              selectedRoom={selectedRoom}
              relatedProjectRoom={relatedProjectRoom}
              replyTo={replyTo}
              inputMessage={inputMessage}
              uploading={uploading}
              isDealClosedByAcceptedOffer={isDealClosedByAcceptedOffer}
              typingUsers={typingUsers}
              fileInputRef={fileInputRef}
              onSubmit={handleSendMessage}
              onFileUpload={handleFileUpload}
              onInputChange={handleInputChange}
              onClearReply={() => setReplyTo(null)}
              onGoToProjectChat={handleGoToProjectChat}
              onGoToProject={handleGoToProject}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05),transparent_42%)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex w-full max-w-2xl flex-col items-center rounded-[24px] border border-border bg-card px-12 py-14 text-center shadow-[0_18px_46px_rgba(15,23,42,0.06)]">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-text-muted">
                <Hash className="w-10 h-10" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">{t("messagesPage.emptyState.title")}</h3>
              <p className="mb-6 max-w-xs text-sm">{t("messagesPage.emptyState.subtitle")}</p>
              <Button
                variant="primary"
                className="rounded-[12px] px-5 py-3 shadow-sm"
                onClick={handleNewChat}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("messagesPage.emptyState.newChat")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Room Info Sidebar */}
      {selectedRoom && isRoomInfoOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-80 overflow-y-auto border-l border-slate-200/80 bg-white p-6 shadow-2xl transition-transform">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <h4 className="font-bold">{t("messagesPage.roomInfo.title")}</h4>
            <button onClick={() => setIsRoomInfoOpen(false)} className="rounded-[10px] p-1 text-text-secondary hover:bg-accent hover:text-text-primary">
              <Plus className="rotate-45" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <div className="text-center">
              <Avatar fallback={selectedRoom.name || t("messagesPage.roomInfo.room")} className="mx-auto mb-3 h-20 w-20" />
              <h4 className="font-bold text-text-primary">{selectedRoom.name || t("messagesPage.roomInfo.conversation")}</h4>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">{roomTypeLabel(selectedRoom.room_type)}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {t("messagesPage.roomInfo.members", {
                    count: selectedRoom.participants?.length || 0,
                  })}
                </h5>
                {selectedRoom.room_type === "group" && (
                  <button
                    onClick={() => {
                      setInviteRoomId(selectedRoom.id);
                      setIsNewChatOpen(true);
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                  >
                    {t("messagesPage.roomInfo.addPeople")}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {selectedRoom.participants?.map((user: CurrentUser) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Avatar src={user.avatar_url} fallback={getUserInitials(user)} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {getUserDisplayName(user, t("messagesPage.fallbacks.user"))}
                      </div>
                      <div className="truncate text-[10px] text-text-muted">
                        {user.id === currentUserId ? t("messagesPage.roomInfo.you") : user.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Chat / Invite Modal */}
      <Modal
        isOpen={isNewChatOpen}
        onClose={() => {
          setIsNewChatOpen(false);
          setInviteRoomId(null);
        }}
        title={
          inviteRoomId
            ? t("messagesPage.newChatModal.inviteTitle")
            : t("messagesPage.newChatModal.newChatTitle")
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder={t("messagesPage.newChatModal.searchPlaceholder")}
              className="h-11 rounded-[14px] border border-border bg-input pl-9 text-sm"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
            {isSearching ? (
              <div className="py-8 text-center text-sm text-gray-400">{t("messagesPage.newChatModal.searching")}</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={async () => {
                    if (inviteRoomId) {
                      try {
                        await chatService.addParticipant(inviteRoomId, user.id);
                        // Update current room participants locally
                        setSelectedRoom(prev => prev ? {
                          ...prev,
                          participants: [...(prev.participants || []), user]
                        } : null);
                        setIsNewChatOpen(false);
                        setInviteRoomId(null);
                        setUserSearchQuery("");
                      } catch (err) {
                        console.error("Failed to add participant", err);
                      }
                    } else {
                      handleStartDM(user.id);
                    }
                  }}
                  className="group flex w-full items-center gap-3 rounded-[14px] p-3 transition-colors hover:bg-accent/40"
                >
                  <Avatar src={user.avatar_url} fallback={getUserInitials(user)} className="h-10 w-10" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-text-primary transition-colors group-hover:text-primary">
                      {getUserDisplayName(user, t("messagesPage.fallbacks.user"))}
                    </div>
                    <div className="text-[10px] text-gray-500">{user.email}</div>
                  </div>
                </button>
              ))
            ) : userSearchQuery.length >= 2 ? (
              <div className="py-8 text-center text-sm text-gray-400">{t("messagesPage.newChatModal.notFound")}</div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">{t("messagesPage.newChatModal.typeMore")}</div>
            )}
          </div>
        </div>
      </Modal>

      <OfferModal
        open={offerModalOpen}
        currency="THB"
        projectBudget={dealProjectBudget}
        title={t("messagesPage.offerModal.title")}
        subtitle={t("messagesPage.offerModal.subtitle")}
        submitLabel={t("messagesPage.offerModal.submit")}
        showMessage
        loading={offerLoading}
        onCancel={() => {
          if (offerLoading) return;
          setOfferModalOpen(false);
        }}
        onSubmit={handleSubmitDirectOffer}
      />

      <OfferModal
        open={counterModalOpen}
        currency={counterTargetOffer?.currency ?? "THB"}
        projectBudget={dealProjectBudget}
        title={t("messagesPage.counterOfferModal.title")}
        subtitle={t("messagesPage.counterOfferModal.subtitle")}
        submitLabel={t("messagesPage.counterOfferModal.submit")}
        showMessage
        initialMessage={counterTargetOffer?.message ?? ""}
        initialMilestones={(counterTargetOffer?.milestones ?? []).map((m) => ({
          title: m.title,
          amount: Number(m.amount ?? 0),
          estimated_days: m.estimated_days ?? undefined,
          description: m.description ?? "",
        }))}
        onCancel={() => {
          if (offerLoading) return;
          setCounterModalOpen(false);
          setCounterTargetOffer(null);
        }}
        onSubmit={handleSubmitCounterOffer}
      />

    </div>
  );
}




