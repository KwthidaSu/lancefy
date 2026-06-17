import type {
  ChangeEventHandler,
  FormEventHandler,
  MutableRefObject,
} from "react";

import {
  Briefcase,
  ExternalLink,
  MessageSquare,
  Paperclip,
  Reply,
  Send,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

import Input from "@/components/ui/Input";
import type { ChatRoom, Message } from "@/types/chat.types";

type MessageComposerProps = {
  selectedRoom: ChatRoom;
  relatedProjectRoom: ChatRoom | null;
  replyTo: Message | null;
  inputMessage: string;
  uploading: boolean;
  isDealClosedByAcceptedOffer: boolean;
  typingUsers: Record<string, string>;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onFileUpload: ChangeEventHandler<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onClearReply: () => void;
  onGoToProjectChat: () => void;
  onGoToProject: () => void;
};

export function MessageComposer({
  selectedRoom,
  relatedProjectRoom,
  replyTo,
  inputMessage,
  uploading,
  isDealClosedByAcceptedOffer,
  typingUsers,
  fileInputRef,
  onSubmit,
  onFileUpload,
  onInputChange,
  onClearReply,
  onGoToProjectChat,
  onGoToProject,
}: MessageComposerProps) {
  const { t } = useTranslation("common");
  const inputPlaceholder = isDealClosedByAcceptedOffer
    ? t("messagesPage.composer.dealClosedContinue")
    : uploading
      ? t("messagesPage.composer.uploadingFile")
      : replyTo
        ? t("messagesPage.composer.replyPrefix", {
            content: replyTo.content.slice(0, 20),
          })
        : t("messagesPage.composer.placeholder");

  return (
    <>
      {Object.keys(typingUsers).length > 0 && (
        <div className="border-t border-border bg-card px-5 py-2 text-xs italic text-text-muted">
          {t("messagesPage.composer.typing", {
            names: Object.values(typingUsers).join(", "),
          })}
        </div>
      )}

      <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur">
        {selectedRoom.room_type === "deal" &&
          (selectedRoom.status === "archived" ||
            isDealClosedByAcceptedOffer) &&
          relatedProjectRoom && (
            <div className="px-4 py-2.5 bg-lime-50 border-b border-lime-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-lime-700 font-medium">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>{t("messagesPage.composer.dealClosedBanner")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGoToProjectChat}
                  className="flex items-center gap-1 rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-700 transition hover:bg-lime-200 hover:text-lime-900"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t("messagesPage.actions.projectChat")}
                </button>
                {relatedProjectRoom.project_id && (
                  <button
                    onClick={onGoToProject}
                    className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-200 hover:text-blue-900"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t("messagesPage.actions.viewProject")}
                  </button>
                )}
              </div>
            </div>
          )}

        {replyTo && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Reply className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs text-blue-600 truncate flex-1">
              {replyTo.content}
            </span>
            <button
              type="button"
              onClick={onClearReply}
              className="text-blue-400 hover:text-blue-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="px-4 pb-1 pt-2">
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 rounded-[18px] border border-border bg-background px-3 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10"
          >
            <div className="flex gap-1 items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isDealClosedByAcceptedOffer}
                className="rounded-[12px] p-2 text-text-muted transition-colors hover:bg-accent hover:text-primary disabled:opacity-50"
              >
                <Paperclip
                  className={clsx("w-5 h-5", uploading && "animate-pulse")}
                />
              </button>
            </div>
            <div className="flex-1 px-2">
              <Input
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={inputPlaceholder}
                disabled={uploading || isDealClosedByAcceptedOffer}
                className="border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-text-muted"
              />
            </div>
            <button
              type="submit"
              disabled={
                (!inputMessage.trim() && !uploading) ||
                uploading ||
                isDealClosedByAcceptedOffer
              }
              className={clsx(
                "rounded-[12px] p-2 transition-all",
                inputMessage.trim() &&
                  !uploading &&
                  !isDealClosedByAcceptedOffer
                  ? "bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95"
                  : "cursor-not-allowed bg-accent text-text-muted",
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
