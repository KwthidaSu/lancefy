import { authHttp } from "@/lib/authHttp";
import keycloak from "@/lib/keycloak";
import { ChatRoom, Message, WsEvent } from "@/types/chat.types";

export type ChatRoomContext = {
    room_id: string;
    room_type: string;
    proposal?: {
        id: string;
        status?: string;
        proposed_budget?: number | null;
        message?: string | null;
        job_title?: string | null;
    } | null;
    project?: {
        id: string;
        title?: string | null;
        status?: string | null;
        total_budget?: number | null;
    } | null;
};

class ChatService {
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private shouldReconnect = false;
    private currentRoomId: string | null = null;
    private currentOnEvent: ((ev: WsEvent) => void) | null = null;

    async getRooms(): Promise<ChatRoom[]> {
        const res = await authHttp.get<ChatRoom[]>("/chat/rooms");
        return res.data;
    }

    async getMessages(
        roomId: string,
        params?: { limit?: number; before?: string }
    ): Promise<Message[]> {
        const res = await authHttp.get<Message[]>(`/chat/rooms/${roomId}/messages`, {
            params: {
                limit: params?.limit,
                before: params?.before,
            },
        });
        return res.data;
    }

    async getRoomContext(roomId: string): Promise<ChatRoomContext> {
        const res = await authHttp.get<ChatRoomContext>(`/chat/rooms/${roomId}/context`);
        return res.data;
    }

    async uploadFile(file: File): Promise<{ url: string, filename: string, content_type: string, size: number }> {
        const formData = new FormData();
        formData.append("file", file);
        const res = await authHttp.post("/chat/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
        return res.data;
    }

    async searchUsers(query: string): Promise<any[]> {
        const res = await authHttp.get(`/chat/users/search?query=${encodeURIComponent(query)}`);
        return res.data;
    }

    async createDM(userId: string): Promise<ChatRoom> {
        const res = await authHttp.post<ChatRoom>(`/chat/dm/${userId}`);
        return res.data;
    }

    async createGroup(name: string, participantIds: string[]): Promise<ChatRoom> {
        const res = await authHttp.post<ChatRoom>("/chat/rooms", {
            name,
            participant_ids: participantIds
        });
        return res.data;
    }

    async updateRoom(roomId: string, data: { name?: string }): Promise<ChatRoom> {
        const res = await authHttp.patch<ChatRoom>(`/chat/rooms/${roomId}`, data);
        return res.data;
    }

    async markRoomAsRead(roomId: string): Promise<void> {
        await authHttp.post(`/chat/rooms/${roomId}/read`);
    }

    async promoteDealToProject(roomId: string): Promise<ChatRoom> {
        const res = await authHttp.post<ChatRoom>(`/chat/rooms/${roomId}/promote-project`);
        return res.data;
    }

    async acceptDealOffer(
        roomId: string,
        offerId: string,
        payload: {
            freelancer_id?: string;
            proposed_budget: number;
            currency: string;
            message?: string;
            proposed_milestones: {
                title: string;
                amount: number;
                estimated_days?: number;
                description?: string;
            }[];
        }
    ): Promise<{ project_id: string; deal_room_id: string; }> {
        const res = await authHttp.post<{ project_id: string; deal_room_id: string; }>(
            `/chat/rooms/${roomId}/offers/${offerId}/accept`,
            payload
        );
        return res.data;
    }

    async freelancerAcceptDealOffer(
        roomId: string,
        offerId: string,
        payload: {
            proposed_budget: number;
            currency: string;
            message?: string;
            proposed_milestones: {
                title: string;
                amount: number;
                estimated_days?: number;
                description?: string;
            }[];
        }
    ): Promise<{ project_id: string; deal_room_id: string; }> {
        const res = await authHttp.post<{ project_id: string; deal_room_id: string; }>(
            `/chat/rooms/${roomId}/offers/${offerId}/freelancer-accept`,
            payload
        );
        return res.data;
    }

    async addParticipant(roomId: string, userId: string): Promise<void> {
        await authHttp.post(`/chat/rooms/${roomId}/participants?user_id=${userId}`);
    }

    async removeParticipant(roomId: string, userId: string): Promise<void> {
        await authHttp.delete(`/chat/rooms/${roomId}/participants/${userId}`);
    }

    connect(roomId: string, onEvent: (ev: WsEvent) => void) {
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.currentRoomId = roomId;
        this.currentOnEvent = onEvent;
        this._createSocket(roomId, onEvent);
    }

    private async _createSocket(roomId: string, onEvent: (ev: WsEvent) => void) {
        if (this.socket) {
            this.socket.close();
        }

        // Refresh token before connecting (WS can't use Authorization header)
        try {
            await keycloak.updateToken(60);
        } catch {
            console.warn("Chat WS: could not refresh token, retrying login");
            keycloak.login({ redirectUri: window.location.href });
            return;
        }

        const token = keycloak.token;
        if (!token) {
            console.error("Chat WS: no token available");
            return;
        }

        const explicitApiUrl = import.meta.env.VITE_API_URL;
        const wsBase = explicitApiUrl
            ? explicitApiUrl.replace(/^http/, "ws")
            : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
        const url = `${wsBase}/api/chat/ws/${roomId}?token=${encodeURIComponent(token)}`;

        this.socket = new WebSocket(url);

        this.socket.onmessage = (event) => {
            // ignore keepalive frames
            if (event.data === "ping" || event.data === "pong" || event.data === "__ping__") return;
            const ev: WsEvent = JSON.parse(event.data);
            onEvent(ev);
        };

        this.socket.onclose = (event) => {
            if (!this.shouldReconnect) return;
            // auth errors — don't reconnect
            if (event.code === 4001 || event.code === 4003) {
                console.warn(`Chat WS: auth error (${event.code}), not reconnecting`);
                return;
            }
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.warn("Chat WS: max reconnect attempts reached");
                return;
            }
            const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
            this.reconnectAttempts++;
            console.log(`Chat WS: reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            this.reconnectTimer = setTimeout(async () => {
                if (this.currentRoomId && this.currentOnEvent) {
                    await this._createSocket(this.currentRoomId, this.currentOnEvent);
                }
            }, delay);
        };

        this.socket.onopen = () => {
            this.reconnectAttempts = 0;
            // send ping every 25s to keep connection alive
            if (this.pingTimer) clearInterval(this.pingTimer);
            this.pingTimer = setInterval(() => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                    this.socket.send("ping");
                }
            }, 25000);
        };

        this.socket.onerror = (err) => {
            console.error("Chat WS error", err);
        };
    }

    sendMessage(senderId: string, content: string, messageType: string = "text", replyToId?: string) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                sender_id: senderId,
                content: content,
                message_type: messageType,
                ...(replyToId ? { reply_to_message_id: replyToId } : {}),
            }));
        }
    }

    sendTyping() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: "typing" }));
        }
    }

    sendStopTyping() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: "stop_typing" }));
        }
    }

    editMessage(messageId: string, content: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: "edit", message_id: messageId, content }));
        }
    }

    deleteMessage(messageId: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: "delete", message_id: messageId }));
        }
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.currentRoomId = null;
        this.currentOnEvent = null;
    }
}

export const chatService = new ChatService();
