import { authHttp } from "@/lib/authHttp";
import { publicApi } from "@/services/api";

export interface GalleryUser {
  id: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  avatar_url?: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  author?: GalleryUser;
  title: string;
  description?: string;
  images?: string[];
  skill_tags?: string[];
  category?: string;
  is_public: boolean;
  like_count: number;
  comment_count: number;
  liked_by_me?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioComment {
  id: string;
  portfolio_item_id: string;
  user_id: string;
  author?: GalleryUser;
  content: string;
  created_at: string;
}

export interface GalleryFeedResponse {
  items: PortfolioItem[];
  total: number;
  has_more: boolean;
}

export interface PortfolioItemCreate {
  title: string;
  description?: string;
  images?: string[];
  skill_tags?: string[];
  category?: string;
  is_public?: boolean;
}

// ── Public feed ────────────────────────────────────────────────────────────

export function getPublicFeed(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  userId?: string;
}) {
  return publicApi.get<GalleryFeedResponse>("/portfolio/gallery", { params });
}

export function getComments(itemId: string) {
  return publicApi.get<PortfolioComment[]>(`/portfolio/gallery/${itemId}/comments`);
}

// ── Authenticated ──────────────────────────────────────────────────────────

export function getMyGalleryItems(params?: { page?: number; limit?: number }) {
  return authHttp.get<PortfolioItem[]>("/portfolio/gallery/mine", { params });
}

export function createPortfolioItem(data: PortfolioItemCreate) {
  return authHttp.post<PortfolioItem>("/portfolio/gallery", data);
}

export function updatePortfolioItem(id: string, data: Partial<PortfolioItemCreate>) {
  return authHttp.put<PortfolioItem>(`/portfolio/gallery/${id}`, data);
}

export function deletePortfolioItem(id: string) {
  return authHttp.delete(`/portfolio/gallery/${id}`);
}

/** Upload a single image and return its public URL */
export async function uploadPortfolioImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await authHttp.post<{ url: string }>("/portfolio/gallery/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
}

export function toggleLike(itemId: string) {
  return authHttp.post<{ liked: boolean; like_count: number }>(
    `/portfolio/gallery/${itemId}/like`
  );
}

export function postComment(itemId: string, content: string) {
  return authHttp.post<PortfolioComment>(`/portfolio/gallery/${itemId}/comments`, { content });
}

export function deleteComment(commentId: string) {
  return authHttp.delete(`/portfolio/gallery/comments/${commentId}`);
}
