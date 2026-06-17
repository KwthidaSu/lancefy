import { authHttp } from "@/lib/authHttp";
import { publicApi } from "@/services/api";

export interface AdminUserRecord {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  display_name?: string | null;
  username?: string | null;
  role: string | null;
  roles: string[];
  user_group: "backoffice" | "platform_user";
  status: string;
  kyc_status?: string | null;
  invitation_status: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  last_activity_at?: string | null;
  has_kyc_profile: boolean;
}

export interface AdminUserInvitationSummary {
  status: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  invited_email: string | null;
  invited_role: string | null;
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  display_name?: string | null;
  username?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  role: string | null;
  roles: string[];
  user_group: "backoffice" | "platform_user";
  status: string;
  kyc_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_activity_at?: string | null;
  has_kyc_profile: boolean;
  invitation?: AdminUserInvitationSummary | null;
}

export interface InviteRoleOption {
  value: string;
  label: string;
}

export interface InviteUserPayload {
  email: string;
  role: string;
}

export interface InvitationPreview {
  email: string;
  role: string;
  status: string;
  invited_at: string;
  expires_at: string;
}

export interface AcceptInvitationPayload {
  firstname: string;
  lastname: string;
  username: string;
  password: string;
}

export async function fetchAdminUsers() {
  return authHttp.get<AdminUserRecord[]>("/users/admin");
}

export async function fetchAdminUserDetail(userId: string) {
  return authHttp.get<AdminUserDetail>(`/users/admin/user/${userId}`);
}

export async function updateAdminUserStatus(userId: string, status: "active" | "inactive") {
  return authHttp.patch<{ message: string; user: AdminUserRecord }>(
    `/users/admin/user/${userId}/status`,
    { status }
  );
}

export async function fetchInviteRoles() {
  return authHttp.get<InviteRoleOption[]>("/users/admin/roles");
}

export async function inviteTeamMember(payload: InviteUserPayload) {
  return authHttp.post("/users/invite", payload);
}

export async function fetchInvitationPreview(token: string) {
  return publicApi.get<InvitationPreview>(`/users/invitations/${token}`);
}

export async function acceptInvitation(
  token: string,
  payload: AcceptInvitationPayload
) {
  return publicApi.post(`/users/invitations/${token}/accept`, payload);
}
