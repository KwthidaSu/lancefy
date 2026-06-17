import type { MutableRefObject } from "react";

import {
  Check,
  CheckCheck,
  Download,
  File as FileIcon,
  Reply,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

import Avatar from "@/components/ui/Avatar";
import type { ChatRoom, Message } from "@/types/chat.types";

import type {
  FileAttachmentMeta,
  MilestoneOfferMessage,
  SystemPayload,
} from "../messages-page.types";

type MessageListProps = {
  selectedRoom: ChatRoom;
  messages: Message[];
  currentUserId?: string;
  offerDecisionMap: Record<string, "accepted" | "rejected">;
  offerActionHiddenMap: Record<string, true>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  parseFileAttachmentMeta: (
    content: string,
    fallbackFilename?: string,
  ) => FileAttachmentMeta;
  parseSystemPayload: (content: string) => SystemPayload | null;
  formatFileSize: (size: number) => string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onAcceptOffer: (offer: MilestoneOfferMessage) => void | Promise<void>;
  onOpenCounter: (offer: MilestoneOfferMessage) => void;
  onRejectOffer: (offerId: string) => void;
};

export function MessageList({
  selectedRoom,
  messages,
  currentUserId,
  offerDecisionMap,
  offerActionHiddenMap,
  messagesEndRef,
  parseFileAttachmentMeta,
  parseSystemPayload,
  formatFileSize,
  onReply,
  onDelete,
  onAcceptOffer,
  onOpenCounter,
  onRejectOffer,
}: MessageListProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex-1 overflow-y-auto space-y-4 bg-[linear-gradient(180deg,rgba(244,247,252,0.55)_0%,rgba(255,255,255,0.92)_24%,rgba(255,255,255,1)_100%)] p-4 sm:p-5">
      {messages.map((msg) => {
        const isMe = msg.sender_id === currentUserId;
        const senderUser = selectedRoom.participants?.find(
          (participant) => participant.id === msg.sender_id,
        );
        const repliedMsg = msg.reply_to_message_id
          ? messages.find((message) => message.id === msg.reply_to_message_id)
          : null;

        return (
          <div
            key={msg.id}
            className={clsx(
              "flex group items-end gap-1",
              isMe ? "justify-end" : "justify-start",
            )}
          >
            {!isMe && (
              <Avatar
                src={senderUser?.avatar_url}
                fallback={t("messagesPage.messageList.senderFallback")}
                size="sm"
                className="mb-1 flex-shrink-0"
              />
            )}

            <div
              className={clsx(
                "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1",
                isMe ? "order-first flex-row-reverse" : "order-last",
              )}
            >
              <button
                onClick={() => onReply(msg)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-500 transition-colors"
                title={t("messagesPage.messageList.reply")}
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              {isMe && (
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  title={t("messagesPage.messageList.delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div
              className={clsx(
                "max-w-[85%] sm:max-w-[70%] flex flex-col gap-1",
                isMe ? "items-end" : "items-start",
              )}
            >
              {repliedMsg && (
                <div
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs border-l-2 max-w-full opacity-80 truncate",
                    isMe
                      ? "bg-blue-100 border-blue-400 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-500",
                  )}
                >
                  <Reply className="w-3 h-3 inline mr-1 opacity-60" />
                  {repliedMsg.message_type === "text"
                    ? repliedMsg.content
                    : t("messagesPage.messageList.fileOrImage")}
                </div>
              )}

              <div
                className={clsx(
                  "px-4 py-2 rounded-2xl shadow-sm text-sm",
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border rounded-bl-none",
                )}
              >
                {msg.message_type === "image" ? (
                  <div className="space-y-2">
                    <img
                      src={msg.content}
                      alt={t("messagesPage.messageList.attachmentAlt")}
                      className="max-w-[300px] max-h-[300px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(msg.content, "_blank")}
                    />
                  </div>
                ) : msg.message_type === "file" ? (
                  (() => {
                    const fileMeta = parseFileAttachmentMeta(
                      msg.content,
                      t("messagesPage.roomList.attachment"),
                    );
                    const sizeLabel =
                      fileMeta.size > 0 ? formatFileSize(fileMeta.size) : "";

                    return (
                      <a
                        href={fileMeta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={clsx(
                          "flex items-center gap-2 p-2 rounded-lg border decoration-transparent",
                          isMe
                            ? "bg-blue-700 border-blue-500 text-white"
                            : "bg-gray-50 border-gray-200 text-gray-800",
                        )}
                      >
                        <FileIcon className="w-5 h-5 opacity-70" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-xs">
                            {fileMeta.filename}
                          </div>
                          {sizeLabel && (
                            <div className="text-[10px] opacity-60">
                              {sizeLabel}
                            </div>
                          )}
                        </div>
                        <Download className="w-4 h-4 opacity-50" />
                      </a>
                    );
                  })()
                ) : msg.message_type === "system" ? (
                  (() => {
                    const payload = parseSystemPayload(msg.content);

                    if (payload?.kind === "milestone_offer") {
                      const decision = offerDecisionMap[payload.offer_id];
                      const isIncomingOffer = msg.sender_id !== currentUserId;
                      const canCounterOrReject =
                        selectedRoom.room_type === "deal" &&
                        !decision &&
                        !offerActionHiddenMap[payload.offer_id] &&
                        isIncomingOffer;
                      const canAccept = canCounterOrReject;

                      return (
                        <div className="w-[520px] max-w-full rounded-2xl p-3">
                          <div className="space-y-3 rounded-xl bg-white p-5">
                            <div className="flex items-center gap-2">
                              <div className="text-base font-semibold text-black">
                                {t("messagesPage.messageList.offerMilestone")}
                              </div>
                              {payload.counter_to && (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  {t("messagesPage.messageList.counter")}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {t("messagesPage.messageList.totalMilestones")}{" "}
                              <span className="font-semibold text-gray-900">
                                {payload.milestones.length}
                              </span>
                            </div>
                            {payload.milestones.map((milestone, index) => (
                              <div
                                key={`${payload.offer_id}-${index}`}
                                className="rounded-lg border border-gray-300 bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold text-gray-900">
                                    {milestone.title ||
                                      t("messagesPage.messageList.milestone", {
                                        number: index + 1,
                                      })}
                                  </div>
                                  <div className="font-semibold text-gray-900">
                                    {Number(
                                      milestone.amount || 0,
                                    ).toLocaleString()}
                                    {payload.currency}
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {milestone.estimated_days
                                    ? t("messagesPage.messageList.dueDays", {
                                        days: milestone.estimated_days,
                                      })
                                    : t("messagesPage.messageList.etaFallback")}
                                </div>
                                {milestone.description && (
                                  <div className="mt-2 text-sm text-gray-700">
                                    {milestone.description}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{t("messagesPage.messageList.total")}</span>
                              <span className="font-semibold text-gray-900">
                                {Number(
                                  payload.proposed_budget || 0,
                                ).toLocaleString()}{" "}
                                {payload.currency}
                              </span>
                            </div>
                            {canCounterOrReject && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {canAccept && (
                                  <button
                                    type="button"
                                    onClick={() => void onAcceptOffer(payload)}
                                    className="rounded-md bg-lime-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-lime-700"
                                  >
                                    {t("messagesPage.actions.accept")}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenCounter(payload)}
                                  className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
                                >
                                  {t("messagesPage.actions.counter")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRejectOffer(payload.offer_id)}
                                  className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                                >
                                  {t("messagesPage.actions.reject")}
                                </button>
                              </div>
                            )}
                            {decision && (
                              <div
                                className={clsx(
                                  "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold",
                                  decision === "accepted"
                                    ? "bg-lime-100 text-lime-700"
                                    : "bg-rose-100 text-rose-700",
                                )}
                              >
                                {decision === "accepted"
                                  ? t("messagesPage.messageList.offerAccepted")
                                  : t("messagesPage.messageList.offerRejected")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (payload?.kind === "milestone_offer_decision") {
                      return (
                        <span className="text-sm font-medium">
                          {payload.decision === "accepted"
                            ? t("messagesPage.messageList.acceptedMilestoneOffer")
                            : t("messagesPage.messageList.rejectedMilestoneOffer")}
                        </span>
                      );
                    }

                    return msg.content;
                  })()
                ) : (
                  msg.content
                )}

                <div
                  className={clsx(
                    "text-[10px] mt-1 opacity-60 flex items-center gap-1",
                    isMe ? "justify-end" : "justify-start",
                  )}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMe &&
                    (selectedRoom.peer_last_read_at &&
                    new Date(selectedRoom.peer_last_read_at) >=
                      new Date(msg.created_at) ? (
                      <CheckCheck className="w-3 h-3 ml-0.5 text-blue-300" />
                    ) : (
                      <Check className="w-3 h-3 ml-0.5 opacity-60" />
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
