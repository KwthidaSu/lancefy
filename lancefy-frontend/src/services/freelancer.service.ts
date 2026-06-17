import { publicApi } from "@/services/api";

export interface FreelancerSkill {
  id: string;
  name: string;
  slug: string;
}

export interface FreelancerProfile {
  id: string;
  display_name?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  kyc_status?: string;
  tagline?: string;
  skills?: FreelancerSkill[];
  hourly_rate?: number;
  is_public?: boolean;
  avg_rating?: number | null;
  review_count?: number;
}

export interface FreelancerListResponse {
  data: FreelancerProfile[];
  total: number;
}

/** Browse public freelancers */
export function getPublicFreelancers(params?: {
  search?: string;
  skill?: string;
  skills?: string;          // comma-separated, OR logic
  sort?: string;
  kyc_verified?: boolean;
  rate_min?: number;
  rate_max?: number;
  page?: number;
  limit?: number;
}) {
  return publicApi.get<FreelancerListResponse>("/users/public", { params });
}

/** Get any user's public profile */
export function getFreelancerProfile(userId: string) {
  return publicApi.get<FreelancerProfile>(`/users/${userId}/public`);
}
