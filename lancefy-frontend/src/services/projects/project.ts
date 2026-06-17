import { publicApi } from "@/services/api";
import { authHttp } from "@/lib/authHttp";
import type {
  Category,
  Project,
  PaginatedResponse,
  ProjectStatus,
  ProjectWorkspace,
  MilestoneBoardItem,
  MilestoneSubmission,
  MilestonePaymentResponse,
  ProjectPayoutSummary,
  PaginatedJobBoardResponse,
  MyWorkItem,
} from "./project.types";
import type { ProjectCalendarResponse } from "@/services/calendar/calendar.types";

export type { MyWorkItem };

export function fetchCategories(lang: string) {
  return publicApi.get<Category[]>("/projects/categories", {
    params: { lang },
  });
}

export async function uploadProjectImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authHttp.post<{ url: string }>("/chat/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
}

export async function uploadProjectSubmissionFile(file: File): Promise<{
  id: string;
  url: string;
  originalName: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authHttp.post<{
    id: string;
    file_url: string;
    original_name: string;
  }>("/files/upload", formData, {
    params: { context: "milestone_submission" },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return {
    id: res.data.id,
    url: res.data.file_url,
    originalName: res.data.original_name,
  };
}

export function createProject(payload: {
  title: string;
  description?: string;
  images?: string[];
  budget: number;
  currency: string;
  category_code: string;
  deadline_date?: string;
  publish?: boolean;
}) {
  return authHttp.post<Project>("/projects", payload);
}

export function updateProject(
  projectId: string,
  payload: Partial<{
    title: string;
    description: string;
    budget: number;
    currency: string;
    category_code: string;
    deadline_date: string;
  }>
) {
  return authHttp.patch<Project>(
    `/projects/${projectId}`,
    payload
  );
}

export type ProjectSort =
  | "created_desc"
  | "created_asc";

export type FetchMyProjectsParams = {
  page?: number;
  pageSize?: number;
  role?: "owner" | "freelancer" | "all";
  status?: ProjectStatus | ProjectStatus[];
  sort?: ProjectSort;
  search?: string;
};

export function fetchMyProjects(
  params: FetchMyProjectsParams = {}
) {
  const {
    page = 1,
    pageSize = 10,
    role = "all",
    status,
    sort = "created_desc",
    search,
  } = params;

  // Backend /projects expects a single `status` string, not an array.
  const statusParam = Array.isArray(status)
    ? (status.length > 0 ? status[0] : undefined)
    : status;

  return authHttp.get<
    PaginatedResponse<Project>
  >("/projects", {
    params: {
      page,
      page_size: pageSize,
      sort,

      search: search?.trim() || undefined,
      role: role === "all" ? undefined : role,

      status:
        statusParam || undefined,
    },
  });
}

export type FetchMyWorkParams = {
  page?: number;
  pageSize?: number;
  status?: string[];
  search?: string;
};

export function fetchMyWork(
  params: FetchMyWorkParams = {}
) {
  const {
    page = 1,
    pageSize = 10,
    status,
    search,
  } = params;

  const statusParam =
    status && status.length
      ? status.join(",")
      : undefined;

  return authHttp
    .get<PaginatedResponse<Project>>(
      "/projects",
      {
        params: {
          page,
          page_size: pageSize,
          role: "freelancer",
          status: statusParam,
          search: search?.trim() || undefined,
        },
      }
    )
    .then((res) => {
      const mappedItems: MyWorkItem[] = (res.data.data || []).map((p) => {
        const statusValue = p.status || "active";
        const assignmentStatus =
          statusValue === "active"
            ? "in_progress"
            : statusValue;
        const progressPercent =
          p.progress_percent != null
            ? Math.max(0, Math.min(100, Math.round(p.progress_percent)))
            : statusValue === "completed"
              ? 100
              : 0;
        return {
          assignment_id: p.id,
          project_id: p.id,
          title: p.title,
          status: statusValue,
          budget: Number(p.total_budget ?? p.budget ?? 0),
          currency: p.currency ?? "THB",
          assignment_status: assignmentStatus,
          progress_percent: progressPercent,
          assigned_at: p.started_at ?? p.created_at,
          client_id: p.client?.id ?? undefined,
          freelancer_id: p.freelancer?.id ?? undefined,
          client: p.client
            ? {
                id: p.client.id ?? undefined,
                firstname: p.client.display_name ?? undefined,
                lastname: undefined,
                username: p.client.username ?? undefined,
                email: undefined,
              }
            : null,
          owner: p.client
            ? {
                id: p.client.id ?? undefined,
                firstname: p.client.display_name ?? undefined,
                lastname: undefined,
                username: p.client.username ?? undefined,
                email: undefined,
              }
            : null,
        };
      });

      return {
        ...res,
        data: {
          ...res.data,
          data: mappedItems,
        },
      };
    });
}

export type FetchJobBoardParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category_code?: string;
  budget_min?: number;
  budget_max?: number;
  deadline_before?: string;
  deadline_after?: string;
  sort?: string;
  lang?: string;
};

export function fetchJobBoard(
  params: FetchJobBoardParams = {}
) {
  const {
    page = 1,
    pageSize = 12,
    search,
    category_code,
    budget_min,
    budget_max,
    deadline_before,
    deadline_after,
    sort = "published_desc",
    lang = "en",
  } = params;

  return authHttp.get<PaginatedJobBoardResponse>(
    "/projects/board",
    {
      params: {
        page,
        page_size: pageSize,
        search,
        category_code,
        budget_min,
        budget_max,
        deadline_before,
        deadline_after,
        sort,
        lang,
      },
    }
  );
}

export function fetchProject(projectId: string) {
  return authHttp.get<Project>(
    `/projects/${projectId}`
  );
}

export function fetchProjectWorkspace(
  projectId: string,
  lang = "en"
) {
  return authHttp.get<ProjectWorkspace & { milestones?: Array<MilestoneBoardItem & { status?: string | null }> }>(
    `/projects/${projectId}/workspace`,
    { params: { lang } }
  ).then((res) => ({
    ...res,
    data: {
      ...res.data,
      milestones: (res.data.milestones || []).map(normalizeMilestoneBoardItem),
    },
  }));
}

const normalizeMilestoneBoardItem = (raw: MilestoneBoardItem & { status?: string | null }) => {
  const baseStatus = String(raw.status ?? "").toLowerCase();
  const rawSubmissionStatus = String(raw.submission_status ?? "").toLowerCase();
  const workflow_status =
    raw.workflow_status ??
    (baseStatus === "approved" || baseStatus === "paid" || baseStatus === "completed"
      ? "done"
      : baseStatus === "submitted"
        ? "review"
        : baseStatus === "in_progress"
          ? "in_progress"
          : "todo");
  const submission_status =
    (rawSubmissionStatus
      ? rawSubmissionStatus === "rejected"
        ? "revision_requested"
        : rawSubmissionStatus
      : undefined) ??
    (baseStatus === "submitted"
      ? "submitted"
      : baseStatus === "approved" || baseStatus === "paid" || baseStatus === "completed"
        ? "approved"
        : baseStatus === "rejected" || baseStatus === "revision_requested"
          ? "revision_requested"
          : "none");
  const funding_status =
    raw.funding_status ??
    (baseStatus === "paid" || baseStatus === "completed" ? "released" : "unfunded");

  return {
    ...raw,
    workflow_status,
    submission_status,
    funding_status,
  };
};

export function fetchMilestoneBoard(projectId: string) {
  return authHttp
    .get<Array<MilestoneBoardItem & { status?: string | null }>>(
      `/projects/${projectId}/milestone-board`
    )
    .then((res) => ({
      ...res,
      data: (res.data || []).map(normalizeMilestoneBoardItem),
    }));
}

export interface MilestonePayload {
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  due_date?: string; // ISO date YYYY-MM-DD
  sequence?: number;
}

export function createMilestone(projectId: string, payload: MilestonePayload) {
  return authHttp.post<MilestoneBoardItem>(`/projects/${projectId}/milestones`, payload);
}

export function updateMilestone(projectId: string, milestoneId: string, payload: Partial<MilestonePayload>) {
  return authHttp.patch<MilestoneBoardItem>(`/projects/${projectId}/milestones/${milestoneId}`, payload);
}

export function deleteMilestone(projectId: string, milestoneId: string) {
  return authHttp.delete(`/projects/${projectId}/milestones/${milestoneId}`);
}

export function resequenceMilestones(
  projectId: string,
  items: { id: string; sequence: number }[]
) {
  return authHttp.post(`/projects/${projectId}/milestones/resequence`, items);
}

export function proposeMilestonePlan(projectId: string) {
  return authHttp.post<import('./project.types').Project>(`/projects/${projectId}/milestones/plan/propose`);
}

export function reviewMilestonePlan(
  projectId: string,
  action: 'approve' | 'reject',
  message?: string
) {
  return authHttp.post<{ ok: boolean; action: string }>(
    `/projects/${projectId}/milestones/plan/review`,
    { action, message }
  );
}

export function fetchProjectCalendar(month?: number, year?: number) {
  return authHttp.get<ProjectCalendarResponse>("/projects/calendar", {
    params: {
      month: month === undefined ? undefined : month,
      year: year === undefined ? undefined : year,
    },
  });
}

export function fundMilestone(projectId: string, milestoneId: string) {
  return authHttp.post<{ message: string }>(
    `/projects/${projectId}/milestones/${milestoneId}/fund`
  );
}

export function submitMilestoneWork(
  projectId: string,
  milestoneId: string,
  payload: { message?: string; file_ids?: string[]; attachments?: string[] }
) {
  return authHttp.post<MilestoneSubmission>(
    `/projects/${projectId}/milestones/${milestoneId}/submissions`,
    payload
  );
}

export function fetchMilestoneSubmissions(
  projectId: string,
  milestoneId: string
) {
  return authHttp.get<MilestoneSubmission[]>(
    `/projects/${projectId}/milestones/${milestoneId}/submissions`
  );
}

export function reviewMilestoneSubmission(
  projectId: string,
  milestoneId: string,
  submissionId: string,
  payload: { action?: "approve" | "reject"; feedback?: string; status?: string; message?: string }
) {
  return authHttp.patch<MilestoneSubmission>(
    `/projects/${projectId}/milestones/${milestoneId}/submissions/${submissionId}/review`,
    payload
  );
}

export function releaseMilestonePayment(
  projectId: string,
  milestoneId: string,
  payload: { note?: string } = {}
) {
  return authHttp.post<MilestonePaymentResponse>(
    `/projects/${projectId}/milestones/${milestoneId}/payment`,
    payload
  );
}

export function fetchProjectPayoutSummary(projectId: string) {
  return authHttp.get<ProjectPayoutSummary>(
    `/projects/${projectId}/payouts/summary`
  );
}

export function confirmProjectCompletion(projectId: string) {
  return authHttp.post<Project>(
    `/projects/${projectId}/completion/confirm`
  );
}

export function closeProject(projectId: string) {
  return authHttp.post<Project>(`/projects/${projectId}/close`);
}

export function requestProjectExtension(
  projectId: string,
  payload: import("./project.types").ExtensionRequestCreate
) {
  return authHttp.post<import("./project.types").ExtensionRequestResponse>(
    `/projects/${projectId}/extensions`,
    payload
  );
}

export function publishProject(projectId: string) {
  return authHttp.post<Project>(
    `/projects/${projectId}/publish`
  );
}

export function deleteProject(projectId: string) {
  return authHttp.delete<void>(
    `/projects/${projectId}`
  );
}

export function fetchPublicProjects(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryCode?: string;
} = {}) {
  const { page = 1, pageSize = 20, search, categoryCode } = params;
  return authHttp.get<PaginatedResponse<Project>>("/projects/public", {
    params: {
      page,
      page_size: pageSize,
      search: search?.trim() || undefined,
      category_code: categoryCode,
    }
  });
}

export interface OfferMilestone {
  id: string;
  offer_id: string;
  title: string;
  description?: string | null;
  amount: number;
  estimated_days?: number | null;
  deliverables: string[];
  status?: string | null;
  created_at: string;
}

export interface JobOffer {
  id: string;
  job_id: string;
  client_id: string;
  freelancer_id: string;
  freelancer_firstname?: string | null;
  freelancer_lastname?: string | null;
  freelancer_username?: string | null;
  proposed_budget: number;
  currency: string;
  message?: string;
  attachments?: string[];
  offer_type?: string | null;
  status: string;
  created_at: string;
  proposed_milestones: OfferMilestone[];
}

export interface OfferMilestoneInput {
  title: string;
  amount: number;
  estimated_days?: number;
  description?: string;
}

export function submitOffer(projectId: string, payload: {
  proposed_budget: number;
  currency: string;
  message?: string;
  attachments?: string[];
  proposed_milestones?: OfferMilestoneInput[];
}) {
  return authHttp.post<JobOffer>(`/projects/${projectId}/offers`, payload);
}

export function replaceOfferMilestones(
  offerId: string,
  payload: { proposed_milestones: OfferMilestoneInput[] }
) {
  return authHttp.put<JobOffer>(`/projects/offers/${offerId}/milestones`, payload);
}

export async function uploadOfferImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authHttp.post<{ url: string }>("/chat/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
}

export function fetchOffers(projectId: string) {
  return authHttp.get<JobOffer[]>(`/projects/${projectId}/offers`);
}

export function fetchMyOffers() {
  return authHttp.get<JobOffer[]>("/projects/my-offers");
}

export function withdrawOffer(offerId: string) {
  return authHttp.post<JobOffer>(`/projects/offers/${offerId}/withdraw`);
}

export function acceptOffer(projectId: string, offerId: string) {
  return authHttp.post<Project>(`/projects/${projectId}/offers/${offerId}/accept`);
}

export function acceptMilestoneOffer(
  projectId: string,
  offerId: string,
  payload: {
    freelancer_id?: string;
    proposed_budget: number;
    currency: string;
    message?: string;
    proposed_milestones: OfferMilestoneInput[];
  }
) {
  return authHttp.post<Project>(`/projects/${projectId}/offers/${offerId}/accept`, payload);
}

export function acceptCounterOffer(projectId: string, offerId: string) {
  return authHttp.post<JobOffer>(`/projects/${projectId}/offers/${offerId}/accept-counter`);
}

export function rejectOffer(
  projectId: string,
  offerId: string,
  payload: { rejection_reason?: string } = {}
) {
  return authHttp.post<JobOffer>(
    `/projects/${projectId}/offers/${offerId}/reject`,
    payload
  );
}

export function counterOffer(
  projectId: string,
  offerId: string,
  payload: {
    proposed_budget: number;
    message?: string;
    proposed_milestones: OfferMilestoneInput[];
  }
) {
  return authHttp.post<JobOffer>(
    `/projects/${projectId}/offers/${offerId}/counter`,
    payload
  );
}
