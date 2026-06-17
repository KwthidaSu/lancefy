import { authHttp } from "@/lib/authHttp";

export type DisputeResolution =
  | "release"
  | "refund"
  | "extend_deadline"
  | "force_approve"
  | "terminate_project"
  | "rejected";

export interface DisputeOpen {
  project_id: string;
  milestone_id?: string;
  reason: string;
  reason_detail?: string;
}

export interface EvidenceResponse {
  id: string;
  dispute_id: string;
  submitted_by: string;
  submitter_name?: string | null;
  submitter_username?: string | null;
  type: string;
  content?: string | null;
  file_id?: string | null;
  created_at: string;
}

export interface DisputeResponse {
  id: string;
  project_id: string;
  project_title?: string | null;
  milestone_id?: string | null;
  milestone_title?: string | null;
  raised_by: string;
  raiser_name?: string | null;
  raiser_username?: string | null;
  reason: string;
  reason_detail?: string | null;
  status: string;
  resolution?: string | null;
  resolution_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  new_due_date?: string | null;
  created_at: string;
  evidences: EvidenceResponse[];
  messages: DisputeMessage[];
}

export type DisputeMessageType = "info_request" | "info_reply" | "admin_note";

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_name?: string | null;
  sender_username?: string | null;
  is_admin: boolean;
  message_type: DisputeMessageType;
  content: string;
  created_at: string;
}

export function openDispute(payload: DisputeOpen) {
  return authHttp.post<DisputeResponse>("/disputes", payload);
}

export function listMyDisputes() {
  return authHttp.get<DisputeResponse[]>("/disputes");
}

export function getDispute(id: string) {
  return authHttp.get<DisputeResponse>(`/disputes/${id}`);
}

export function adminListDisputes(status: "all" | "open" | "reviewing" | "resolved" = "open") {
  const params = status !== "all" ? { status } : {};
  return authHttp.get<DisputeResponse[]>("/disputes/admin", { params });
}

export function adminGetDispute(id: string) {
  return authHttp.get<DisputeResponse>(`/disputes/admin/${id}`);
}

export function adminMarkReviewing(id: string) {
  return authHttp.patch<DisputeResponse>(`/disputes/${id}/status`, { status: "reviewing" });
}

export function adminResolveDispute(
  id: string,
  payload: { resolution: DisputeResolution; resolution_note?: string; new_due_date?: string }
) {
  return authHttp.patch<DisputeResponse>(`/disputes/${id}/resolve`, payload);
}

// ── Messages ─────────────────────────────────────────────────────

export function listDisputeMessages(disputeId: string) {
  return authHttp.get<DisputeMessage[]>(`/disputes/${disputeId}/messages`);
}

export function sendDisputeMessage(disputeId: string, content: string) {
  return authHttp.post<DisputeMessage>(`/disputes/${disputeId}/messages`, {
    content,
    message_type: "info_reply",
  });
}

export function adminListDisputeMessages(disputeId: string) {
  return authHttp.get<DisputeMessage[]>(`/disputes/admin/${disputeId}/messages`);
}

export function adminSendDisputeMessage(
  disputeId: string,
  content: string,
  message_type: DisputeMessageType = "info_request"
) {
  return authHttp.post<DisputeMessage>(`/disputes/admin/${disputeId}/messages`, {
    content,
    message_type,
  });
}
