// User roles
export type UserRole = "client" | "freelancer";

// User interface
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  password?: string; // Optional for security, only used in mock data
  avatar: string;
  rating: number;
  skills: string[];
  portfolio_items: PortfolioItem[];
  bio?: string;
  hourly_rate?: number;
  completed_projects?: number;
  verification_status?: "pending" | "verified" | "rejected"; // NEW: Manual verification
  verification_documents?: {
    id_card?: string; // URL to ID card image
    selfie?: string; // URL to selfie image
    submitted_at?: string;
    reviewed_at?: string;
    rejection_reason?: string;
  };
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category: ProjectCategory;
}

// Project types
export type ProjectCategory =
  | "illustration"
  | "graphic"
  | "3d"
  | "web"
  | "video"
  | "mobile"
  | "writing";
export type ProjectStatus =
  | "draft"
  | "open"
  | "negotiating"
  | "active"
  | "complete"
  | "completed"
  | "cancelled";

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  scope: string;
  budget: number;
  client_id: string;
  freelancer_id: string | null;
  status: ProjectStatus;
  created_at: string;
  completed_at?: string; // NEW
  funding_mode: "full" | "per-milestone";
  milestones: Milestone[];
  // NEW: Job posting fields
  is_job_posting?: boolean; // true if posted to job board
  posted_at?: string;
  deadline?: string; // Project deadline
  requirements?: string[]; // List of requirements
  // NEW: Approval tracking
  start_approval?: {
    client: boolean;
    freelancer: boolean;
    approved_at?: string;
  };
  completion_approval?: {
    client: boolean;
    freelancer: boolean;
    approved_at?: string;
  };
}

// Milestone types
export type WorkflowStatus = "todo" | "in_progress" | "review" | "done";
export type FundingStatus = "unfunded" | "funded" | "released" | "refunded";
export type SubmissionStatus =
  | "none"
  | "submitted"
  | "revision_requested"
  | "resubmitted"
  | "approved";

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  amount: number;
  due_date: string;
  workflow_status: WorkflowStatus;
  funding_status: FundingStatus;
  submission_status: SubmissionStatus;
  submitted_files?: FileAttachment[];
  revision_notes?: string;
}

// Transaction types
export type TransactionType =
  | "topup"
  | "deposit"
  | "release"
  | "withdraw"
  | "refund"
  | "fee";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  date: string;
  related_project_id?: string;
  related_milestone_id?: string;
  description: string;
  fee?: number;
}

// ─── Job types (new model) ──────────────────────────────────────
export type JobType = "hire" | "service";
export type JobStatus = "draft" | "open" | "closed" | "expired";

export interface Job {
  id: string;
  job_type: JobType;
  title: string;
  description?: string;
  budget?: number;
  status: JobStatus;
  images: string[];
  tags: string[];
  expires_at?: string;
  delivery_date?: string;
  created_at: string;
  published_at?: string;
  owner: {
    id: string;
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
  skills: { id: string; name: string; slug: string }[];
  proposals_count: number;
}

// ─── Proposal types (new model) ─────────────────────────────────
export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Proposal {
  id: string;
  job_id?: string;
  job_title?: string;
  client_id: string;
  freelancer_id: string;
  proposer_id: string;
  message?: string;
  proposed_budget?: number;
  status: ProposalStatus;
  rejection_reason?: string;
  created_at: string;
  responded_at?: string;
  client: { id: string; display_name?: string; username?: string; avatar_url?: string };
  freelancer: { id: string; display_name?: string; username?: string; avatar_url?: string };
}

// ─── Escrow / Payment types (new model) ─────────────────────────
export interface EscrowHolding {
  id: string;
  milestone_id: string;
  client_id: string;
  freelancer_id: string;
  amount: number;
  status: "held" | "released" | "refunded";
  held_at: string;
  released_at?: string;
}

export interface PaymentTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  net_amount: number;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

export interface EscrowItemSummary {
  id: string;
  milestone_id: string;
  client_id: string;
  freelancer_id: string;
  amount: number;
  net_payout_amount: number;
  currency: string;
  status: "held" | "released" | "refunded";
  held_at: string;
  released_at?: string;
  project_id?: string;
}

export interface FinanceSummary {
  total_earned: number;
  pending_escrow: number;
  total_charged: number;
  total_refunded: number;
  escrow_items: EscrowItemSummary[];
  transactions: PaymentTransaction[];
}

// ─── Legacy Offer types (deprecated — use Proposal instead) ─────
/** @deprecated Use Proposal */
export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";
/** @deprecated Use Proposal */
export interface Offer {
  id: string;
  project_id: string;
  freelancer_id: string;
  client_id: string;
  status: OfferStatus;
  proposed_milestones: ProposedMilestone[];
  total_amount: number;
  cover_letter: string;
  created_at: string;
  responded_at?: string;
  rejection_reason?: string;
}
/** @deprecated Use Proposal */
export interface ProposedMilestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  estimated_days: number;
  deliverables: string[];
  status: "pending" | "accepted" | "rejected";
}

// Message types (UPDATED for chat system)
export interface ChatConversation {
  id: string;
  participants: string[]; // User IDs
  project_id?: string; // Optional: related to a project
  offer_id?: string; // Optional: related to an offer
  last_message?: ChatMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  attachments: FileAttachment[];
  is_read: boolean;
}

// Keep old Message type for project messages
export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  attachments: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

// Dispute types
export type DisputeStatus = "open" | "evidence" | "reviewing" | "resolved";
export type DisputeResolution = "release" | "refund" | "split" | null;

export interface Dispute {
  id: string;
  project_id: string;
  milestone_id: string;
  opened_by: string;
  status: DisputeStatus;
  resolution: DisputeResolution;
  evidence: Evidence[];
  created_at: string;
  resolved_at?: string;
  reason: string;
}

export interface Evidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  type: "text" | "file" | "chat";
  content: string;
  files?: FileAttachment[];
  created_at: string;
}

// Review types
export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Activity log types
export type ActivityType =
  | "project_created"
  | "project_accepted"
  | "milestone_funded"
  | "work_submitted"
  | "revision_requested"
  | "work_approved"
  | "payment_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "review_submitted";

export interface Activity {
  id: string;
  type: ActivityType;
  project_id?: string;
  milestone_id?: string;
  user_id: string;
  description: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// Wallet types
export interface WalletBalance {
  available: number;
  in_escrow: number;
  pending: number;
  total?: number; // Added total
}

// Service (Gig) types
export interface Service {
  id: string;
  freelancer_id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  price: number;
  delivery_time: number; // Days
  is_rush_available: boolean; // Can do urgent work?
  image_url: string;
  rating: number;
  review_count: number;
  created_at: string;
}

// App state
export interface AppState {
  current_user: User | null;
  current_role: UserRole;
  users: User[];
  projects: Project[];
  offers: Offer[];
  services: Service[]; // NEW: Freelancer Gigs
  transactions: Transaction[];
  messages: Message[];
  chat_conversations: ChatConversation[];
  chat_messages: ChatMessage[];
  disputes: Dispute[];
  reviews: Review[];
  activities: Activity[];
  wallet_balance: WalletBalance;
}

// Action types for state management
export type AppAction =
  | { type: "SET_CURRENT_USER"; payload: User }
  | { type: "SWITCH_ROLE"; payload: UserRole }
  | { type: "CREATE_PROJECT"; payload: Project }
  | {
      type: "UPDATE_PROJECT";
      payload: { id: string; updates: Partial<Project> };
    }
  | {
      type: "UPDATE_MILESTONE";
      payload: {
        project_id: string; // Changed from projectId
        milestone_id: string; // Changed from milestoneId
        updates: Partial<Milestone>;
      };
    }
  | { type: "CREATE_OFFER"; payload: Offer } // NEW
  | { type: "UPDATE_OFFER"; payload: { id: string; updates: Partial<Offer> } } // NEW
  | { type: "ADD_TRANSACTION"; payload: Transaction }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage } // NEW
  | {
      type: "UPDATE_CONVERSATION";
      payload: { id: string; updates: Partial<ChatConversation> };
    } // NEW
  | { type: "CREATE_DISPUTE"; payload: Dispute }
  | {
      type: "UPDATE_DISPUTE";
      payload: { id: string; updates: Partial<Dispute> };
    }
  | { type: "ADD_REVIEW"; payload: Review }
  | { type: "ADD_ACTIVITY"; payload: Activity }
  | { type: "UPDATE_WALLET"; payload: Partial<WalletBalance> }
  | { type: "UPDATE_USER"; payload: { id: string; updates: Partial<User> } } // NEW
  | { type: "CREATE_SERVICE"; payload: Service } // NEW
  | { type: "LOAD_STATE"; payload: AppState };
