import { Briefcase, ExternalLink, MoreVertical, Users } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

import type { CurrentUser } from "@/auth/auth.types";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import type { ChatRoom } from "@/types/chat.types";
import { getTextInitials, getUserDisplayName, getUserInitials } from "@/utils/user";

type ChatHeaderProps = {
  selectedRoom: ChatRoom;
  selectedPeer?: CurrentUser;
  canSendMilestoneOffer: boolean;
  isOfferPendingForMe: boolean;
  isDealClosedByAcceptedOffer: boolean;
  isRoomInfoOpen: boolean;
  onOpenOfferModal: () => void;
  onToggleRoomInfo: () => void;
  onOpenPeerProfile: () => void;
  onOpenProject: () => void;
};

export function ChatHeader({
  selectedRoom,
  selectedPeer,
  canSendMilestoneOffer,
  isOfferPendingForMe,
  isDealClosedByAcceptedOffer,
  isRoomInfoOpen,
  onOpenOfferModal,
  onToggleRoomInfo,
  onOpenPeerProfile,
  onOpenProject,
}: ChatHeaderProps) {
  const { t } = useTranslation("common");

  return (
    <div className="z-10 flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        {selectedRoom.room_type === "dm" ? (
          <button
            type="button"
            onClick={onOpenPeerProfile}
            className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
          >
            <Avatar
              src={selectedPeer?.avatar_url}
              fallback={getUserInitials(selectedPeer)}
              className="w-10 h-10"
            />
            <div className="flex flex-col justify-center pt-2">
              <h2 className="font-bold text-text-primary transition-colors hover:text-primary">
                {getUserDisplayName(selectedPeer, t("messagesPage.fallbacks.user"))}
              </h2>
              <p className="text-xs text-text-muted">{t("messagesPage.header.dm")}</p>
            </div>
          </button>
        ) : selectedRoom.room_type === "main" ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10 font-bold text-primary">
              #
            </div>
            <div className="flex flex-col justify-center pt-2">
              <h2 className="font-bold text-text-primary">{selectedRoom.name}</h2>
              <p className="text-xs text-gray-400">
                {t("messagesPage.header.members", {
                  count: selectedRoom.participants?.length ?? 0,
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar
              fallback={
                selectedPeer
                  ? getUserInitials(selectedPeer)
                  : getTextInitials(selectedRoom.name)
              }
              className="w-10 h-10"
            />
            <div className="flex flex-col justify-center pt-2">
              <h2 className="font-bold text-text-primary">
                {(selectedRoom.room_type === "project" ||
                  selectedRoom.room_type === "deal") &&
                selectedPeer
                  ? getUserDisplayName(selectedPeer, t("messagesPage.fallbacks.user"))
                  : selectedRoom.name || t("messagesPage.fallbacks.workChannel")}
              </h2>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <span className="flex items-center gap-1 font-medium text-primary">
                  <Briefcase className="w-3 h-3" />{" "}
                  {selectedRoom.name || t("messagesPage.fallbacks.project")}
                </span>
                {selectedRoom.room_type === "deal" && (
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {t("messagesPage.status.dealRoom")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {canSendMilestoneOffer && !isDealClosedByAcceptedOffer && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenOfferModal}
            className="border border-primary/30 text-primary hover:bg-primary/20"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            {t("messagesPage.actions.offerMilestone")}
          </Button>
        )}
        {!canSendMilestoneOffer &&
          selectedRoom.room_type === "deal" &&
          isOfferPendingForMe && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {t("messagesPage.status.offerPending")}
            </span>
          )}
        {selectedRoom.room_type === "deal" && isDealClosedByAcceptedOffer && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
              {t("messagesPage.status.dealClosed")}
            </span>
            {selectedRoom.project_id && (
              <button
                onClick={onOpenProject}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <ExternalLink className="w-3 h-3" />
                {t("messagesPage.actions.viewProject")}
              </button>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRoomInfo}
          className={clsx(isRoomInfoOpen && "bg-blue-50 text-blue-600")}
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-5 h-5 text-text-muted" />
        </Button>
      </div>
    </div>
  );
}
