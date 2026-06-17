import { authHttp } from "@/lib/authHttp";
import type { Job, Proposal } from "@/types";

// ─────────────────────────────────────────────────────────────────
// Shared payload types
// ─────────────────────────────────────────────────────────────────

export interface CreateJobPayload {
  job_type?: "hire" | "service";
  title: string;
  description?: string;
  budget?: number;
  category_id?: string;
  subcategory_id?: string;
  skill_ids?: string[];
  tags?: string[];
  images?: string[];
  expires_at?: string;
  delivery_date?: string;
}

export interface UpdateJobPayload {
  title?: string;
  description?: string;
  budget?: number;
  category_id?: string;
  subcategory_id?: string;
  skill_ids?: string[];
  tags?: string[];
  images?: string[];
  expires_at?: string;
  delivery_date?: string;
}

export interface CreateProposalPayload {
  message?: string;
  proposed_budget?: number;
}

export interface CreateDirectProposalPayload {
  target_user_id: string;
  intent: "hire" | "offer";
  message?: string;
  proposed_budget?: number;
}

export interface AcceptProposalResponse {
  message: string;
  project_id?: string | null;
  project_chat_room_id?: string;
  deal_chat_room_id?: string;
  auto_rejected_count?: number;
}

export interface BrowseJobsParams {
  job_type?: "hire" | "service";
  category_id?: string;
  category_slug?: string;
  subcategory_slug?: string;
  search?: string;
  budget_min?: number;
  budget_max?: number;
  sort?: string;
  skip?: number;
  limit?: number;
  exclude_owner_id?: string;
}

export interface PaginatedJobsResponse {
  data: Job[];
  total: number;
  skip: number;
  limit: number;
}

// ─────────────────────────────────────────────────────────────────
// Jobs
// ─────────────────────────────────────────────────────────────────

export function browseJobs(params: BrowseJobsParams = {}) {
  return authHttp.get<PaginatedJobsResponse>("/jobs", { params });
}

export function getMyJobs() {
  return authHttp.get<Job[]>("/jobs/mine");
}

export function getJob(jobId: string) {
  return authHttp.get<Job>(`/jobs/${jobId}`);
}

export function createJob(payload: CreateJobPayload) {
  return authHttp.post<Job>("/jobs", payload);
}

export function updateJob(jobId: string, payload: UpdateJobPayload) {
  return authHttp.patch<Job>(`/jobs/${jobId}`, payload);
}

export function deleteJob(jobId: string) {
  return authHttp.delete(`/jobs/${jobId}`);
}

export function publishJob(jobId: string) {
  return authHttp.post<Job>(`/jobs/${jobId}/publish`);
}

// ─────────────────────────────────────────────────────────────────
// Proposals (on a job)
// ─────────────────────────────────────────────────────────────────

export function submitProposal(jobId: string, payload: CreateProposalPayload) {
  return authHttp.post<Proposal>(`/jobs/${jobId}/proposals`, payload);
}

export function listJobProposals(jobId: string) {
  return authHttp.get<Proposal[]>(`/jobs/${jobId}/proposals`);
}

// ─────────────────────────────────────────────────────────────────
// Proposals (general)
// ─────────────────────────────────────────────────────────────────

export function getMyProposals() {
  return authHttp.get<Proposal[]>("/proposals/mine");
}

export function getProposal(proposalId: string) {
  return authHttp.get<Proposal>(`/proposals/${proposalId}`);
}

export function acceptProposal(proposalId: string) {
  return authHttp.patch<AcceptProposalResponse>(`/proposals/${proposalId}/accept`);
}

export function rejectProposal(proposalId: string, reason?: string) {
  return authHttp.patch<Proposal>(`/proposals/${proposalId}/reject`, { reason });
}

export function withdrawProposal(proposalId: string) {
  return authHttp.patch<Proposal>(`/proposals/${proposalId}/withdraw`);
}

export function createDirectProposal(payload: CreateDirectProposalPayload) {
  return authHttp.post<Proposal>("/proposals/direct", payload);
}
