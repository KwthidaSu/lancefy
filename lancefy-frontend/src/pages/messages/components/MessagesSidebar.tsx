import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CurrentUser } from "@/auth/auth.types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { ChatRoom } from "@/types/chat.types";

import type {
  RoomTabItem,
  RoomTabKey,
} from "../messages-page.types";
import { RoomList } from "./RoomList";
import { RoomTabs } from "./RoomTabs";

type MessagesSidebarProps = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  roomTab: RoomTabKey;
  roomTabs: readonly RoomTabItem[];
  roomTabCounts: Record<RoomTabKey, number>;
  roomFilter: string;
  rooms: ChatRoom[];
  loading: boolean;
  selectedRoomId?: string;
  getRoomPeer: (room: ChatRoom) => CurrentUser | undefined;
  getRoomDisplayName: (room: ChatRoom) => string;
  onNewChat: () => void;
  onRoomTabChange: (tab: RoomTabKey) => void;
  onRoomFilterChange: (value: string) => void;
  onSelectRoom: (room: ChatRoom) => void;
};

export function MessagesSidebar({
  title,
  subtitle,
  searchPlaceholder,
  roomTab,
  roomTabs,
  roomTabCounts,
  roomFilter,
  rooms,
  loading,
  selectedRoomId,
  getRoomPeer,
  getRoomDisplayName,
  onNewChat,
  onRoomTabChange,
  onRoomFilterChange,
  onSelectRoom,
}: MessagesSidebarProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-[320px] w-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] xl:h-full xl:w-[560px] xl:shrink-0">
      <div className="hidden border-b border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(247,250,255,0.98)_55%,rgba(255,255,255,1))] px-6 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-7">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="pt-1">
            <h1 className="text-[2rem] font-bold tracking-tight text-[#1e3357] sm:text-[2.15rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-[420px] text-[15px] leading-7 text-slate-500 sm:text-[16px]">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-4 self-start">
            <Button
              variant="primary"
              className="h-16 rounded-[22px] px-7 text-[16px] font-semibold shadow-[0_20px_40px_rgba(37,99,235,0.26)]"
              onClick={onNewChat}
            >
              <Plus className="mr-3 h-6 w-6" />
              {t("messagesPage.actions.newChat")}
            </Button>
            <button
              type="button"
              aria-label={t("messagesPage.sidebar.conversationTools")}
              className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-slate-400 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:text-slate-600"
            >
              <SlidersHorizontal className="h-7 w-7" />
            </button>
          </div>
        </div>

        <div className="relative border-t border-slate-200/80 pt-7">
          <Search className="absolute left-7 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            className="h-[82px] rounded-[24px] border border-slate-200 bg-white pl-24 pr-24 text-[17px] text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/15"
            value={roomFilter}
            onChange={(e) => onRoomFilterChange(e.target.value)}
          />
          <div className="pointer-events-none absolute right-6 top-1/2 flex h-12 min-w-[56px] -translate-y-1/2 items-center justify-center rounded-[14px] bg-slate-50 px-4 text-[16px] font-semibold tracking-tight text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            ⌘K
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200/80 bg-white px-5 pb-5 pt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h1 className="translate-y-0.5 text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          <Button
            variant="primary"
            size="sm"
            className="h-10 w-10 rounded-[12px] p-0 shadow-sm"
            onClick={onNewChat}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <p className="mb-4 text-sm text-text-secondary">{subtitle}</p>

        <RoomTabs
          roomTab={roomTab}
          roomTabs={roomTabs}
          roomTabCounts={roomTabCounts}
          onTabChange={onRoomTabChange}
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder={searchPlaceholder}
            className="h-11 rounded-[14px] border border-slate-200 bg-white pl-9 shadow-[0_10px_24px_rgba(15,23,42,0.05)] focus-visible:ring-2 focus-visible:ring-primary/15"
            value={roomFilter}
            onChange={(e) => onRoomFilterChange(e.target.value)}
          />
        </div>
      </div>

      <RoomList
        rooms={rooms}
        loading={loading}
        selectedRoomId={selectedRoomId}
        getRoomPeer={getRoomPeer}
        getRoomDisplayName={getRoomDisplayName}
        onSelectRoom={onSelectRoom}
      />
    </div>
  );
}
