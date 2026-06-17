import { authHttp } from "@/lib/authHttp";
import { publicApi } from "@/services/api";

export type CommunityAuthor = {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  display_name?: string;
  avatar_url?: string;
};

export type CommunityImage = {
  id: string;
  url: string;
  sort_order: number;
};

export type CommunityPost = {
  id: string;
  author_id: string;
  author: CommunityAuthor | null;
  category: string;
  content: string | null;
  is_public: boolean;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  liked_by_me: boolean;
  images: CommunityImage[];
  created_at: string;
  edited_at: string | null;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  author: CommunityAuthor | null;
  created_at: string;
  edited_at: string | null;
  replies: CommunityComment[];
  reply_count: number;
};

export type FeedParams = {
  category?: string;
  sort?: "latest" | "reactions" | "views";
  search?: string;
  author_id?: string;
  page?: number;
  limit?: number;
};

export const COMMUNITY_CATEGORIES = ["general", "artwork", "coding", "design", "writing"] as const;
export type CommunityCategory = typeof COMMUNITY_CATEGORIES[number];

export const CATEGORY_LABELS: Record<string, string> = {
  general: "ทั่วไป",
  artwork: "Artwork",
  coding: "Coding",
  design: "Design",
  writing: "Writing",
};

export type FeedResponse = {
  data: CommunityPost[];
  total: number;
  page: number;
  page_size: number;
};

export type CommentsResponse = {
  data: CommunityComment[];
  total: number;
};

// ── API calls ─────────────────────────────────────────────────────────────────

export const communityService = {
  /** Public feed — no auth required */
  getFeed(params: FeedParams = {}): Promise<FeedResponse> {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.sort) qs.set("sort", params.sort);
    if (params.search) qs.set("search", params.search);
    if (params.author_id) qs.set("author_id", params.author_id);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return publicApi.get(`/community?${qs}`).then((r) => r.data);
  },

  /** Get a single post by ID (public) */
  getPost(postId: string): Promise<CommunityPost> {
    return publicApi.get(`/community/${postId}`).then((r) => r.data);
  },

  /** Create a post */
  createPost(payload: { content?: string; category?: string; is_public?: boolean }): Promise<CommunityPost> {
    return authHttp.post("/community", payload).then((r) => r.data);
  },

  /** Upload image to a post */
  uploadImage(postId: string, file: File): Promise<CommunityImage> {
    const fd = new FormData();
    fd.append("file", file);
    return authHttp.post(`/community/${postId}/images`, fd).then((r) => r.data);
  },

  /** Delete an image attachment from own post */
  deleteImage(postId: string, imageId: string): Promise<void> {
    return authHttp.delete(`/community/${postId}/images/${imageId}`).then(() => undefined);
  },

  /** Edit own post */
  updatePost(
    postId: string,
    payload: { content?: string; category?: string; is_public?: boolean }
  ): Promise<CommunityPost> {
    return authHttp.put(`/community/${postId}`, payload).then((r) => r.data);
  },

  /** Soft-delete own post */
  deletePost(postId: string): Promise<void> {
    return authHttp.delete(`/community/${postId}`).then(() => undefined);
  },

  /** Toggle like on a post */
  toggleReaction(postId: string): Promise<{ liked: boolean; reaction_count: number }> {
    return authHttp.post(`/community/${postId}/reactions`).then((r) => r.data);
  },

  /** Get comments for a post */
  getComments(postId: string, page = 1): Promise<CommentsResponse> {
    return publicApi.get(`/community/${postId}/comments?page=${page}&limit=30`).then((r) => r.data);
  },

  /** Add a comment */
  addComment(postId: string, content: string, parentCommentId?: string): Promise<CommunityComment> {
    return authHttp
      .post(`/community/${postId}/comments`, {
        content,
        parent_comment_id: parentCommentId ?? null,
      })
      .then((r) => r.data);
  },

  /** Soft-delete own comment */
  deleteComment(commentId: string): Promise<void> {
    return authHttp.delete(`/community/comments/${commentId}`).then(() => undefined);
  },
};
