import { CurrentUser } from "@/auth/auth.types";

export interface Message {
    id: string;
    chat_room_id: string;
    sender_id: string;
    message_type: 'text' | 'file' | 'image' | 'system';
    content: string;
    created_at: string;
    edited_at?: string;
    reply_to_message_id?: string;
}

export type WsEvent =
  | ({ action?: undefined } & Message)           // new message (no action field)
  | { action: 'typing'; user_id: string; firstname: string }
  | { action: 'stop_typing'; user_id: string }
  | { action: 'edited'; id: string; content: string; edited_at: string }
  | { action: 'deleted'; id: string }
  | { action: 'read'; user_id: string; last_read_at: string };

export interface ChatRoom {
    id: string;
    room_type: 'dm' | 'project' | 'deal' | 'main' | 'group';
    status?: string;
    name?: string;
    proposal_id?: string;
    project_id?: string;
    parent_room_id?: string;
    created_at: string;
    last_message?: Message;
    participants?: CurrentUser[];
    unread_count?: number;
    peer_last_read_at?: string;
}

export interface MessageCreateRequest {
    content: string;
    message_type?: string;
}
