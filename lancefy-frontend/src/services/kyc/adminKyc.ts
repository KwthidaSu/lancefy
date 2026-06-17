import { authHttp } from "@/lib/authHttp";

export type AdminKycItem = {
  user_id: string;
  full_name: string;
  email?: string | null;
  citizen_id: string;
  status: string;
  created_at: string;
};

export type AdminKycDetail = {
  user_id: string;
  email?: string | null;
  profile: {
    id: string;
    user_id: string;
    full_name: string;
    citizen_id: string;
    date_of_birth: string;
    country: string;
    address: string;
    created_at?: string | null;
  };
  id_card?: {
    file_id: string;
    url?: string | null;
    created_at?: string | null;
  } | null;
  selfie?: {
    file_id: string;
    url?: string | null;
    created_at?: string | null;
  } | null;
  status: string;
  reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  timeline?: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    actor_name?: string | null;
    note?: string | null;
    extra_data?: Record<string, unknown> | null;
    created_at: string;
  }>;
};

export type ReviewKycPayload = {
  status: "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION";
  reason?: string;
};

export function fetchAdminKycList(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return authHttp.get<AdminKycItem[]>(`/kyc/admin${query}`);
}

export function fetchPendingKyc() {
  return authHttp.get<AdminKycItem[]>("/kyc/admin/pending");
}

export function fetchKycDetail(userId: string) {
  return authHttp.get<AdminKycDetail>(`/kyc/admin/${userId}`);
}

export async function reviewKyc(userId: string, payload: ReviewKycPayload) {
  try {
    const res = await authHttp.patch(`/kyc/admin/${userId}/review`, payload);
    return res;
  } catch (error: any) {
    console.error("reviewKyc failed");
    console.error("URL:", `/kyc/admin/${userId}/review`);
    console.error("Payload:", payload);
    console.error("Status:", error?.response?.status);
    console.error("Response data:", error?.response?.data);
    throw error;
  }
}
