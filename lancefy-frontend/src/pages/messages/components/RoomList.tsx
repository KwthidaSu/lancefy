import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

import type { CurrentUser } from "@/auth/auth.types";
import Avatar from "@/components/ui/Avatar";
import type { ChatRoom } from "@/types/chat.types";
import { getTextInitials, getUserInitials } from "@/utils/user";

type RoomListProps = {
  rooms: ChatRoom[];
  loading: boolean;
  selectedRoomId?: string;
  getRoomPeer: (room: ChatRoom) => CurrentUser | undefined;
  getRoomDisplayName: (room: ChatRoom) => string;
  onSelectRoom: (room: ChatRoom) => void;
};

export function RoomList({
  rooms,
  loading,
  selectedRoomId,
  getRoomPeer,
  getRoomDisplayName,
  onSelectRoom,
}: RoomListProps) {
  const { t } = useTranslation("common");
  const roomTypeLabels: Partial<Record<ChatRoom["room_type"], string>> = {
    deal: t("messagesPage.tabs.deal"),
    project: t("messagesPage.tabs.project"),
    group: t("messagesPage.fallbacks.group"),
    main: t("messagesPage.fallbacks.group"),
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {loading ? (
        <div className="p-4 text-center text-gray-500">
          {t("messagesPage.roomList.loading")}
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          {t("messagesPage.roomList.empty")}
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {rooms.map((room) => {
            const peer = getRoomPeer(room);
            const displayName = getRoomDisplayName(room);
            const lastMsgPreview = room.last_message
              ? room.last_message.message_type !== "text"
                ? t("messagesPage.roomList.attachment")
                : room.last_message.content
              : null;

            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-[16px] border border-transparent px-4 py-3 transition-all hover:border-slate-200 hover:bg-slate-50/80",
                  selectedRoomId === room.id &&
                    "border-slate-200 bg-blue-50/70 shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={peer?.avatar_url}
                    fallback={
                      peer
                        ? getUserInitials(peer)
                        : getTextInitials(room.name)
                    }
                    className="h-11 w-11 flex-shrink-0"
                  />
                  {room.room_type === "dm" && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-lime-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={clsx(
                            "text-sm font-semibold truncate",
                            selectedRoomId === room.id
                              ? "text-primary"
                              : "text-text-primary",
                          )}
                        >
                          {displayName}
                        </span>
                        {room.room_type !== "dm" && (
                          <span
                            className={clsx(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0",
                              room.room_type === "deal"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700",
                            )}
                          >
                            {roomTypeLabels[room.room_type] ?? room.room_type}
                          </span>
                        )}
                        {room.status === "archived" && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 bg-gray-200 text-gray-500">
                            {t("messagesPage.status.archived")}
                          </span>
                        )}
                      </div>
                      {lastMsgPreview && (
                        <div className="mt-1 truncate text-sm text-text-secondary">
                          {lastMsgPreview}
                        </div>
                      )}
                    </div>
                    {(room.unread_count ?? 0) > 0 &&
                      selectedRoomId !== room.id && (
                        <span className="flex h-6 min-w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                          {room.unread_count! > 99 ? "99+" : room.unread_count}
                        </span>
                      )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
