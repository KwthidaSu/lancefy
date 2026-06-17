export type Category = {
  code: string;
  name: string;
};

export type ProjectStatus =
  | "draft"
  | "open"
  | "expired"
  | "closed"
  | "active"
  | "complete"
  | "completed"
  | "cancelled"
  | "disputed";

export type ProjectSort =
  | "created_desc"
  | "created_asc";

export type ProjectCategory = {
  code: string;
  type: string;
  label: string;
};

export type Project = {
  id: string;
  job_id?: string | null;
  owner_id?: string | null;
  client_id?: string | null;
  freelancer_id?: string | null;
  owner_firstname?: string | null;
  owner_lastname?: string | null;
  owner_username?: string | null;
  title: string;
  description?: string;
  images?: string[];
  skill_tags?: string[];
  budget: number;
  total_budget?: number | null;
  currency: string;
  categories: ProjectCategory[];
  assignee?: {
    id: string;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  status: ProjectStatus;
  progress_percent?: number | null;
  deadline_date?: string | null;
  created_at: string;
  started_at?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  milestone_plan_pending?: boolean | null;
  milestone_plan_proposed_by?: string | null;
  client?: {
    id?: string | null;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  freelancer?: {
    id?: string | null;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
};

export type JobBoardItem = {
  id: string;
  title: string;
  description?: string | null;
  scope?: string | null;
  budget: number;
  currency: string;
  category_code?: string | null;
  category_label?: string | null;
  images?: string[];
  posted_at?: string | null;
  deadline_date?: string | null;
  requirements: string[];
  milestone_count: number;
};

export type PaginatedJobBoardResponse = {
  data: JobBoardItem[];
  total: number;
  page: number;
  page_size: number;
};

export type MyWorkItem = {
  assignment_id: string;
  project_id: string;
  title?: string | null;
  status?: string | null;
  budget?: number | null;
  currency?: string | null;
  assignment_status?: string | null;
  progress_percent?: number | null;
  assigned_at?: string | null;
  client_id?: string | null;
  freelancer_id?: string | null;
  client?: {
    id?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  owner?: {
    id?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

export type MilestoneBoardItem = {
  id: string;
  project_id: string;
  title?: string | null;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  sequence?: number | null;
  due_date?: string | null;
  workflow_status?: string | null;
  funding_status?: string | null;
  submission_status?: string | null;
  created_at?: string | null;
};

export type ProjectWorkspace = {
  project: Project;
  milestones: MilestoneBoardItem[];
  assignment?: AssignmentSummary | null;
};

/** @deprecated — assignment concept removed. Kept for backward compat until ProjectManagePage is updated */
export type AssignmentSummary = {
  id: string;
  job_id: string;
  client_id: string;
  freelancer_id: string;
  status?: string | null;
  completed_at?: string | null;
  client_completion_confirmed_at?: string | null;
  freelancer_completion_confirmed_at?: string | null;
  created_at?: string | null;
};

export type MilestoneSubmission = {
  id: string;
  milestone_id?: string | null;
  submitted_by?: string | null;
  revision_number?: number | null;
  message?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  files?: Array<{
    id?: string | null;
    file_id?: string | null;
    file_url?: string | null;
    original_name?: string | null;
    sort_order?: number | null;
  }> | null;
  attachments?: string[] | null;
  file_urls?: string[] | null;
  auto_release_eligible?: boolean | null;
};

export type MilestonePaymentResponse = {
  message?: string | null;
  milestone_id?: string | null;
  released_at?: string | null;
  amount?: number | null;
};

export type ExtensionRequestCreate = {
  milestone_id?: string | null;
  new_deadline?: string | null;
  new_due_date?: string | null;
  reason?: string | null;
};

export type ExtensionRequestResponse = {
  id: string;
  project_id: string;
  new_deadline: string;
  reason?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type PayoutMilestoneSummary = {
  milestone_id: string;
  title?: string | null;
  amount?: number | null;
  currency?: string | null;
  funding_status?: string | null;
  released_amount: number;
};

export type ProjectPayoutSummary = {
  project_id: string;
  currency?: string | null;
  total_milestone_amount: number;
  total_funded_amount: number;
  total_released_amount: number;
  total_available_amount: number;
  milestones: PayoutMilestoneSummary[];
};

export type FetchMyProjectsParams =
  | {
      mode: "table";
      page: number;
      pageSize: number;
      status?: "all" | "draft" | "open";
      sort?: ProjectSort;
    }
  | {
      mode: "card";
      status?: "all" | "draft" | "open";
      sort?: ProjectSort;
    };
