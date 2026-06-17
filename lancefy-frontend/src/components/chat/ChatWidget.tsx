import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, X, Send, ChevronLeft, Plus, Search } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

import { chatService } from "@/services/chat.service";
import { authService } from "@/services/auth.service";
import type { ChatRoom, Message, WsEvent } from "@/types/chat.types";
import type { CurrentUser } from "@/auth/auth.types";
import Avatar from "@/components/ui/Avatar";

type Panel = "list" | "room";

function roomDisplayName(
  room: ChatRoom,
  me: CurrentUser | null,
  fallbackChat: string,
): string {
  if (room.name) return room.name;
  if (room.room_type === "dm" && room.participants) {
    const other = room.participants.find((p) => p.id !== me?.id);
    if (other) {
      return (
        other.display_name ||
        [other.firstname, other.lastname].filter(Boolean).join(" ") ||
        `@${other.username}` ||
        other.id
      );
    }
  }
  return fallbackChat;
}

function roomInitials(
  room: ChatRoom,
  me: CurrentUser | null,
  fallbackChat: string,
): string {
  return roomDisplayName(room, me, fallbackChat).charAt(0).toUpperCase();
}

function roomTypeLabel(
  roomType: ChatRoom["room_type"],
  t: (key: string) => string,
) {
  if (roomType === "dm") return null;
  if (roomType === "project") return t("messagesWidget.roomTypes.project");
  if (roomType === "group") return t("messagesWidget.roomTypes.group");
  return null;
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("list");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMessagesPage = location.pathname.startsWith("/app/messages");
  const onProjectDetailPage = /^\/app\/projects\/[^/]+$/.test(location.pathname);
  const isHidden = onMessagesPage || onProjectDetailPage;
  const fallbackChat = t("messagesWidget.fallbacks.chat");

  useEffect(() => {
    authService.getCurrentUser().then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    if (isHidden || !open || !me) return;
    setLoadingRooms(true);
    chatService.getRooms()
      .then((r) => {
        setRooms(r);
        const dmUnread = r
          .filter((room) => room.room_type === "dm" && room.status !== "archived")
          .reduce((sum, room) => sum + (room.unread_count ?? 0), 0);
        setTotalUnread(dmUnread);
      })
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [open, me, isHidden]);

  useEffect(() => {
    if (isHidden || !me) return;
    const poll = () => {
      chatService.getRooms()
        .then((r) => {
          const dmUnread = r
            .filter((room) => room.room_type === "dm" && room.status !== "archived")
            .reduce((sum, room) => sum + (room.unread_count ?? 0), 0);
          setTotalUnread(dmUnread);
          setRooms((prev) =>
            prev.length > 0
              ? prev.map((p) => {
                  const updated = r.find((x) => x.id === p.id);
                  return updated ? { ...p, unread_count: updated.unread_count } : p;
                })
              : prev,
          );
        })
        .catch(() => {});
    };
    poll();
    const interval = open ? 5_000 : 30_000;
    const id = setInterval(poll, interval);
    return () => clearInterval(id);
  }, [me, isHidden, open]);

  const openRoom = useCallback(async (room: ChatRoom) => {
    setActiveRoom(room);
    setPanel("room");
    setMessages([]);
    setLoadingMsgs(true);
    try {
      const msgs = await chatService.getMessages(room.id);
      setMessages(msgs);
    } catch {}
    setLoadingMsgs(false);
    if ((room.unread_count ?? 0) > 0) {
      chatService.markRoomAsRead(room.id).catch(() => {});
      setTotalUnread((prev) => Math.max(0, prev - (room.unread_count ?? 0)));
      setRooms((prev) =>
        prev.map((r) => r.id === room.id ? { ...r, unread_count: 0 } : r),
      );
    }
    chatService.connect(room.id, (ev: WsEvent) => {
      if (!ev.action) {
        const msg = ev as Message;
        setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);
      } else if (ev.action === "edited") {
        setMessages((prev) => prev.map((m) => m.id === ev.id ? { ...m, content: ev.content, edited_at: ev.edited_at } : m));
      } else if (ev.action === "deleted") {
        setMessages((prev) => prev.filter((m) => m.id !== ev.id));
      }
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const closeRoom = () => {
    chatService.disconnect();
    setActiveRoom(null);
    setPanel("list");
    setMessages([]);
  };

  const handleClose = () => {
    closeRoom();
    setOpen(false);
    setFilter("");
  };

  const sendMessage = () => {
    if (!input.trim() || !me || !activeRoom) return;
    chatService.sendMessage(me.id, input.trim());
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      chat_room_id: activeRoom.id,
      sender_id: me.id,
      message_type: "text",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredRooms = rooms.filter((r) =>
    r.room_type === "dm" &&
    r.status !== "archived" &&
    roomDisplayName(r, me, fallbackChat).toLowerCase().includes(filter.toLowerCase()),
  );

  if (onMessagesPage || !me) return null;
  if (isHidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3" ref={containerRef}>
      {open && (
        <div
          className="flex h-[500px] w-[360px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.18)]"
        >
          <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#214f92_0%,#1f4a88_42%,#17345c_100%)] px-4 py-3.5 text-white">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_72%)]" />
            <div className="relative flex items-center gap-2">
              {panel === "room" && activeRoom ? (
                <>
                  <button
                    onClick={closeRoom}
                    className="rounded-full p-1 transition-colors hover:bg-white/10"
                    title={t("messagesWidget.actions.back")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <Avatar
                    size="sm"
                    fallback={roomInitials(activeRoom, me, fallbackChat)}
                    className="shrink-0 border border-white/20 bg-white/15 text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {roomDisplayName(activeRoom, me, fallbackChat)}
                    </p>
                    {roomTypeLabel(activeRoom.room_type, t) && (
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                        {roomTypeLabel(activeRoom.room_type, t)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/app/messages?roomId=${activeRoom.id}`)}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90 transition hover:bg-white/16 hover:text-white"
                  >
                    {t("messagesWidget.actions.openFull")}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15">
                    <MessageCircle className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="flex-1 text-sm font-semibold">
                    {t("messagesWidget.title")}
                  </span>
                  <button
                    onClick={() => { navigate("/app/messages"); handleClose(); }}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90 transition hover:bg-white/16 hover:text-white"
                  >
                    {t("messagesWidget.actions.openAll")}
                  </button>
                  <button
                    onClick={() => { navigate("/app/messages"); handleClose(); }}
                    className="rounded-full p-1 transition-colors hover:bg-white/10"
                    title={t("messagesWidget.actions.newChat")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={handleClose}
                className="ml-1 rounded-full p-1 transition-colors hover:bg-white/10"
                title={t("messagesWidget.actions.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {panel === "list" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3">
                <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={t("messagesWidget.searchPlaceholder")}
                    className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-2">
                {loadingRooms ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {t("messagesWidget.states.loading")}
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                      <MessageCircle className="h-7 w-7" />
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                      {t("messagesWidget.states.empty")}
                    </p>
                    <button
                      onClick={() => { navigate("/app/messages"); handleClose(); }}
                      className="mt-3 text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      {t("messagesWidget.actions.newChat")}
                    </button>
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => openRoom(room)}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <Avatar
                        size="sm"
                        fallback={roomInitials(room, me, fallbackChat)}
                        className="shrink-0 bg-slate-100 text-slate-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={clsx(
                              "truncate text-xs",
                              (room.unread_count ?? 0) > 0
                                ? "font-bold text-slate-900"
                                : "font-semibold text-slate-900",
                            )}
                          >
                            {roomDisplayName(room, me, fallbackChat)}
                          </p>
                          <div className="ml-1 flex shrink-0 items-center gap-1.5">
                            {room.last_message && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(room.last_message.created_at).toLocaleTimeString("th", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {(room.unread_count ?? 0) > 0 && (
                              <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                                {room.unread_count! > 99 ? "99+" : room.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <p
                          className={clsx(
                            "mt-0.5 truncate text-[11px]",
                            (room.unread_count ?? 0) > 0
                              ? "font-medium text-slate-600"
                              : "text-slate-400",
                          )}
                        >
                          {room.last_message?.content ?? t("messagesWidget.states.noMessages")}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {panel === "room" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-2 overflow-y-auto bg-[linear-gradient(180deg,rgba(244,247,252,0.75)_0%,rgba(255,255,255,0.94)_26%,rgba(255,255,255,1)_100%)] px-3 py-3">
                {loadingMsgs ? (
                  <div className="pt-8 text-center text-xs text-slate-400">
                    {t("messagesWidget.states.loading")}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="pt-8 text-center text-xs text-slate-400">
                    {t("messagesWidget.states.noMessages")}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === me?.id;
                    return (
                      <div key={msg.id} className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
                        <div
                          className={clsx(
                            "max-w-[72%] break-words rounded-2xl px-3 py-2 text-xs shadow-sm",
                            isMe
                              ? "rounded-br-sm bg-primary text-white"
                              : "rounded-bl-sm border border-slate-200 bg-white text-slate-800",
                          )}
                        >
                          {msg.message_type === "image" ? (
                            <img src={msg.content} alt="img" className="max-w-full rounded-xl" />
                          ) : msg.message_type === "file" ? (
                            <a href={msg.content} target="_blank" rel="noreferrer" className="font-medium underline">
                              [{t("messagesWidget.fileLabel")}]
                            </a>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur">
                <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("messagesWidget.inputPlaceholder")}
                    className="flex-1 bg-transparent px-1 text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    title={t("messagesWidget.actions.send")}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_22px_45px_rgba(15,23,42,0.26)] transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/20",
          open
            ? "bg-slate-700"
            : "bg-[linear-gradient(135deg,#214f92_0%,#1f4a88_42%,#17345c_100%)]",
        )}
      >
        {open ? (
          <X className="h-7 w-7" />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-1 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_65%)]" />
            <MessageCircle className="relative h-6 w-6" />
            {totalUnread > 0 && !open && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
