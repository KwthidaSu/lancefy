import { authHttp } from "@/lib/authHttp";

// ---------------------------------------------------------------------------
// Notification type enum (mirrors backend app/notifications/enums.py)
// Stored as string in DB — add/remove here to extend without migration.
// ---------------------------------------------------------------------------
export const NotificationType = {
  // Job board / Proposal flow
  proposal_received:  "proposal_received",
  proposal_accepted:  "proposal_accepted",
  proposal_rejected:  "proposal_rejected",
  proposal_withdrawn: "proposal_withdrawn",
  job_expired:        "job_expired",
  // Deal / Project
  deal_opened:        "deal_opened",
  project_created:    "project_created",
  // Work
  work_submitted:     "work_submitted",
  work_approved:      "work_approved",
  work_rejected:      "work_rejected",
  // Payment
  payment_funded:     "payment_funded",
  payment_released:   "payment_released",
  payout_processed:   "payout_processed",
  // Chat
  message_received:   "message_received",
  // Admin / KYC / Dispute
  kyc_approved:       "kyc_approved",
  kyc_rejected:       "kyc_rejected",
  dispute_opened:     "dispute_opened",
  dispute_resolved:   "dispute_resolved",
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const TYPE_LABELS: Record<string, string> = {
  proposal_received:  "ได้รับ Proposal ใหม่",
  proposal_accepted:  "Proposal ถูกยอมรับ",
  proposal_rejected:  "Proposal ถูกปฏิเสธ",
  proposal_withdrawn: "Proposal ถูกถอน",
  job_expired:        "Job หมดเวลา",
  deal_opened:        "เปิด Deal แล้ว",
  project_created:    "สร้างโปรเจกต์แล้ว",
  work_submitted:     "ส่งงานแล้ว",
  work_approved:      "งานผ่านการอนุมัติ",
  work_rejected:      "งานถูกปฏิเสธ",
  payment_funded:     "วาง Escrow แล้ว",
  payment_released:   "ปล่อยการชำระเงิน",
  payout_processed:   "โอนเงินให้ฟรีแลนซ์แล้ว",
  message_received:   "ข้อความใหม่",
  kyc_approved:       "KYC ผ่านแล้ว",
  kyc_rejected:       "KYC ถูกปฏิเสธ",
  dispute_opened:     "มีการเปิด Dispute",
  dispute_resolved:   "Dispute ได้รับการตัดสินแล้ว",
};

export const TYPE_COLORS: Record<string, string> = {
  proposal_received:  "bg-blue-500",
  proposal_accepted:  "bg-lime-500",
  proposal_rejected:  "bg-red-400",
  proposal_withdrawn: "bg-gray-400",
  job_expired:        "bg-orange-400",
  deal_opened:        "bg-purple-500",
  project_created:    "bg-purple-600",
  work_submitted:     "bg-yellow-500",
  work_approved:      "bg-lime-500",
  work_rejected:      "bg-red-500",
  payment_funded:     "bg-cyan-500",
  payment_released:   "bg-lime-600",
  payout_processed:   "bg-lime-700",
  message_received:   "bg-sky-500",
  kyc_approved:       "bg-lime-600",
  kyc_rejected:       "bg-red-600",
  dispute_opened:     "bg-rose-500",
  dispute_resolved:   "bg-slate-500",
};

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface NotificationListFilters {
  readFilter?: "read" | "unread";
  typeFilter?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export interface NotificationSettingItem {
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
}

export type NotificationSettings = Record<string, NotificationSettingItem>;

class NotificationService {
  private ws: WebSocket | null = null;
  private listeners: Array<(notification: AppNotification) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private openStableTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private getToken: (() => string | undefined) | null = null;

  // -----------------------------------------------------------------------
  // REST helpers
  // -----------------------------------------------------------------------

  async list(
    page = 1,
    pageSize = 30,
    filters: NotificationListFilters = {},
  ): Promise<PaginatedNotifications> {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filters.readFilter) params.read_filter = filters.readFilter;
    if (filters.typeFilter) params.type_filter  = filters.typeFilter;
    if (filters.dateFrom)   params.date_from    = filters.dateFrom;
    if (filters.dateTo)     params.date_to      = filters.dateTo;
    const res = await authHttp.get<PaginatedNotifications>("/notifications", { params });
    return res.data;
  }

  async markAsRead(id: string): Promise<AppNotification> {
    const res = await authHttp.post<AppNotification>(`/notifications/${id}/read`);
    return res.data;
  }

  async markAllAsRead(): Promise<void> {
    await authHttp.post("/notifications/read-all");
  }

  async deleteOne(id: string): Promise<void> {
    await authHttp.delete(`/notifications/${id}`);
  }

  async deleteAll(readOnly = false): Promise<void> {
    await authHttp.delete(`/notifications${readOnly ? "?read_only=true" : ""}`);
  }

  // -----------------------------------------------------------------------
  // Notification Settings
  // -----------------------------------------------------------------------

  async getSettings(): Promise<NotificationSettings> {
    const res = await authHttp.get<{ settings: NotificationSettings }>("/notifications/settings");
    return res.data.settings;
  }

  async updateSettings(updates: NotificationSettingItem[]): Promise<NotificationSettings> {
    const res = await authHttp.patch<{ settings: NotificationSettings }>("/notifications/settings", { updates });
    return res.data.settings;
  }

  // -----------------------------------------------------------------------
  // WebSocket — real-time push (Section 12)
  // -----------------------------------------------------------------------

  /**
   * Connect to the notification WebSocket.
   * @param token  Keycloak access token (passed as query param because WS
   *               cannot carry an Authorization header).
   * @param onNotification  Callback invoked for every pushed notification.
   */
  connect(getToken: () => string | undefined, onNotification: (n: AppNotification) => void) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    // Prevent double-connect while a socket is still connecting
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return;

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.getToken = getToken;
    if (!this.listeners.includes(onNotification)) {
      this.listeners.push(onNotification);
    }
    this._createSocket();
  }

  private _createSocket() {
    if (!this.getToken) return;
    const token = this.getToken();
    if (!token) {
      // No token yet — retry after a short delay without burning an attempt
      this.reconnectTimer = setTimeout(() => this._createSocket(), 2000);
      return;
    }

    const apiUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:8000";
    const wsBase = apiUrl.replace(/^http/, "ws");
    const url = `${wsBase}/api/notifications/ws?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const data: AppNotification = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(data));
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onopen = () => {
      // Only reset backoff counter after the connection has been stable for 2s.
      // This prevents onopen→onclose rapid cycles from resetting the backoff.
      this.openStableTimer = setTimeout(() => {
        this.reconnectAttempts = 0;
      }, 2000);
    };

    this.ws.onerror = () => {
      // will trigger onclose
    };

    this.ws.onclose = () => {
      if (this.openStableTimer) {
        clearTimeout(this.openStableTimer);
        this.openStableTimer = null;
      }
      this.ws = null;
      if (!this.shouldReconnect) return;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
      this.reconnectAttempts++;
      this.reconnectTimer = setTimeout(() => this._createSocket(), delay);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.openStableTimer) {
      clearTimeout(this.openStableTimer);
      this.openStableTimer = null;
    }
    this.listeners = [];
    this.getToken = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const notificationService = new NotificationService();
