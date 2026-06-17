import { authHttp } from "@/lib/authHttp";

export interface ReviewCreate {
  project_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  reviewer_username?: string | null;
  reviewer_display_name?: string | null;
  reviewer_avatar_url?: string | null;
  /** ISO timestamp — present on GET /projects/{id}/mine response */
  review_deadline?: string | null;
}

export function createReview(payload: ReviewCreate) {
  return authHttp.post<ReviewResponse>("/reviews", payload);
}

export function getUserReviews(userId: string) {
  return authHttp.get<ReviewResponse[]>(`/reviews/users/${userId}`);
}

/** คืน review ที่ current user เขียนไว้สำหรับ project นี้ — 404 = ยังไม่ได้รีวิว */
export function getMyReviewForProject(projectId: string) {
  return authHttp.get<ReviewResponse>(`/reviews/projects/${projectId}/mine`);
}
