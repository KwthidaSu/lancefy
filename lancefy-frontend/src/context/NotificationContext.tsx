import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useKeycloak } from "@react-keycloak/web";
import {
  notificationService,
  type AppNotification,
} from "@/services/notification.service";
import { useToast } from "@/components/ui/Toast";

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { keycloak } = useKeycloak();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const wsConnected = useRef(false);
  const knownNotificationIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!keycloak.authenticated) return;
    try {
      const data = await notificationService.list(1, 50);
      setNotifications(data.data);
      setUnreadCount(data.unread_count);
      knownNotificationIds.current = new Set(data.data.map((n) => n.id));
    } catch {
      // Silently ignore — bell will just show no data
    } finally {
      setLoading(false);
    }
  }, [keycloak.authenticated]);

  // Initial fetch + WebSocket — connect WS only AFTER refresh() completes so
  // knownNotificationIds is fully populated before push events arrive.
  // The `cancelled` flag prevents StrictMode's double-invoke from opening two sockets.
  useEffect(() => {
    if (!keycloak.authenticated) return;
    let cancelled = false;

    refresh().then(() => {
      if (cancelled || wsConnected.current || !keycloak.token) return;
      wsConnected.current = true;

      notificationService.connect(() => keycloak.token, (incoming) => {
        // ถ้าอยู่หน้า messages อยู่แล้ว ไม่ต้องแจ้งเตือน message_received
        const onMessagesPage = window.location.pathname.startsWith("/app/messages");
        if (onMessagesPage && incoming.type === "message_received") return;

        // Update existing notification in-place or prepend as new
        const isExisting = knownNotificationIds.current.has(incoming.id);
        setNotifications((prev) => {
          if (isExisting) {
            return prev.map((n) => (n.id === incoming.id ? incoming : n));
          }
          knownNotificationIds.current.add(incoming.id);
          return [incoming, ...prev];
        });
        if (!isExisting && !incoming.is_read) {
          setUnreadCount((c) => c + 1);
        }

        // Show toast only for genuinely new notifications
        if (isExisting) return;

        if (incoming.type === "proposal_accepted") {
          showToast("Proposal ของคุณถูกยอมรับแล้ว! 🎉", "success");
        } else if (incoming.type === "proposal_rejected") {
          showToast("Proposal ของคุณถูกปฏิเสธ", "error");
        } else if (incoming.type === "proposal_received") {
          showToast("มี Proposal ใหม่ 📬", "info");
        } else if (incoming.type === "proposal_withdrawn") {
          showToast("Proposal ถูกยกเลิกแล้ว", "warning");
        } else if (incoming.type === "work_approved") {
          showToast("งานของคุณผ่านการอนุมัติ ✅", "success");
        } else if (incoming.type === "payment_released") {
          showToast("มีการปล่อยชำระเงินใหม่ 💰", "success");
        } else if (incoming.type === "kyc_approved") {
          showToast("KYC ผ่านการอนุมัติแล้ว ✅", "success");
        } else if (incoming.type === "kyc_rejected") {
          showToast("KYC ไม่ผ่าน กรุณาส่งใหม่อีกครั้ง", "error");
        } else if (incoming.type === "community_post_hidden") {
          showToast("โพสของคุณถูกซ่อนโดย Admin", "warning");
        } else if (incoming.type === "community_post_restored") {
          showToast("โพสของคุณได้รับการกู้คืนแล้ว ✅", "success");
        } else if (incoming.type === "community_post_removed") {
          showToast("โพสของคุณถูกลบโดย Admin", "error");
        } else if (incoming.type === "community_comment_removed") {
          showToast("Comment ของคุณถูกลบโดย Admin", "error");
        }
      });
    });

    return () => {
      cancelled = true;
      notificationService.disconnect();
      wsConnected.current = false;
    };
  }, [keycloak.authenticated, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // no-op
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // no-op
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
