import { authHttp } from "@/lib/authHttp";
import type { KycStatusResponse } from "./kyc.types";
import { mapKycStatus } from "./kyc.types";

type StoredKycFallback = {
  status: string;
  reason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
};

export function getStoredKycStatusFallback(): KycStatusResponse | null {
  try {
    const raw = sessionStorage.getItem("kyc_status_fallback");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredKycFallback;
    return {
      status: mapKycStatus(parsed.status),
      reason: parsed.reason ?? null,
      submitted_at: parsed.submittedAt ?? null,
      reviewed_at: parsed.reviewedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function submitKyc(payload: {
  full_name: string;
  citizen_id: string;
  date_of_birth: string;
  country: string;
  address: string;
}) {
  return authHttp.post<{
    id: string;
    user_id: string;
    full_name: string;
    citizen_id: string;
    date_of_birth: string;
    country: string;
    address: string;
    created_at?: string | null;
  }>("/kyc/submit", payload);
}

export async function uploadIdCard(profileId: string, file: File) {
  if (!profileId || typeof profileId !== "string") {
    throw new Error("Invalid profileId");
  }

  if (!file) {
    throw new Error("Missing file");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("profile_id", String(profileId));

  return authHttp.post("/kyc/upload-id-card", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function uploadSelfie(profileId: string, file: File) {
  if (!profileId || typeof profileId !== "string") {
    throw new Error("Invalid profileId");
  }

  if (!file) {
    throw new Error("Missing file");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("profile_id", String(profileId));

  return authHttp.post("/kyc/upload-selfie", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function fetchKycStatus() {
  const res = await authHttp.get<{
    status: string;
    reason?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
  }>("/kyc/status");

  const data: KycStatusResponse = {
    status: mapKycStatus(res.data.status),
    reason: res.data.reason ?? null,
    submitted_at: res.data.submitted_at ?? null,
    reviewed_at: res.data.reviewed_at ?? null,
  };

  return {
    ...res,
    data,
  };
}
