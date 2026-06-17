import { Transaction, WalletBalance, Dispute, Activity } from "@/types";

// Mock transactions
export const mockTransactions: Transaction[] = [
  {
    id: "txn-1",
    type: "topup",
    amount: 5000,
    status: "completed",
    date: "2024-01-14T10:00:00Z",
    description: "Wallet top-up",
  },
  {
    id: "txn-2",
    type: "deposit",
    amount: 2500,
    status: "completed",
    date: "2024-01-15T11:00:00Z",
    related_project_id: "proj-1",
    description: "Escrow deposit for Character Design project",
  },
  {
    id: "txn-3",
    type: "release",
    amount: 475,
    status: "completed",
    date: "2024-02-02T14:00:00Z",
    related_project_id: "proj-1",
    related_milestone_id: "mile-1",
    description: "Payment released for Character Concepts",
    fee: 25,
  },
  {
    id: "txn-4",
    type: "deposit",
    amount: 3000,
    status: "completed",
    date: "2024-01-20T15:00:00Z",
    related_project_id: "proj-2",
    description: "Full escrow deposit for Brand Identity",
  },
  {
    id: "txn-5",
    type: "release",
    amount: 760,
    status: "completed",
    date: "2024-02-06T10:00:00Z",
    related_project_id: "proj-2",
    related_milestone_id: "mile-4",
    description: "Payment released for Logo Concepts",
    fee: 40,
  },
];

// Mock wallet balance
export const mockWalletBalance: WalletBalance = {
  available: 2340,
  in_escrow: 4250,
  pending: 0,
  total: 6590,
};

// Mock disputes
export const mockDisputes: Dispute[] = [
  {
    id: "disp-1",
    project_id: "proj-3",
    milestone_id: "mile-7",
    opened_by: "client-1",
    status: "evidence",
    resolution: null,
    created_at: "2024-02-12T10:00:00Z",
    reason: "Quality concerns with initial 3D models",
    evidence: [
      {
        id: "ev-1",
        dispute_id: "disp-1",
        submitted_by: "client-1",
        type: "text",
        content:
          "The models do not match the specifications provided in the brief.",
        created_at: "2024-02-12T10:00:00Z",
      },
      {
        id: "ev-2",
        dispute_id: "disp-1",
        submitted_by: "freelancer-3",
        type: "text",
        content:
          "I followed the brief exactly. I can provide the original reference files.",
        created_at: "2024-02-12T14:00:00Z",
      },
    ],
  },
];

// Mock activities
export const mockActivities: Activity[] = [
  {
    id: "act-1",
    type: "project_created",
    project_id: "proj-1",
    user_id: "client-1",
    description:
      'Sarah Johnson created project "Character Design for Mobile Game"',
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "act-2",
    type: "project_accepted",
    project_id: "proj-1",
    user_id: "freelancer-1",
    description: "Emma Rodriguez accepted the project",
    created_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "act-3",
    type: "milestone_funded",
    project_id: "proj-1",
    milestone_id: "mile-1",
    user_id: "client-1",
    description: 'Milestone "Character Concepts" funded',
    created_at: "2024-01-15T11:30:00Z",
  },
  {
    id: "act-4",
    type: "work_submitted",
    project_id: "proj-1",
    milestone_id: "mile-1",
    user_id: "freelancer-1",
    description: 'Work submitted for "Character Concepts"',
    created_at: "2024-02-01T16:00:00Z",
  },
  {
    id: "act-5",
    type: "work_approved",
    project_id: "proj-1",
    milestone_id: "mile-1",
    user_id: "client-1",
    description: 'Work approved for "Character Concepts"',
    created_at: "2024-02-02T10:00:00Z",
  },
  {
    id: "act-6",
    type: "payment_released",
    project_id: "proj-1",
    milestone_id: "mile-1",
    user_id: "client-1",
    description: "Payment of $475 released to Emma Rodriguez",
    created_at: "2024-02-02T14:00:00Z",
  },
  {
    id: "act-7",
    type: "dispute_opened",
    project_id: "proj-3",
    milestone_id: "mile-7",
    user_id: "client-1",
    description: 'Dispute opened for "3D Modeling" milestone',
    created_at: "2024-02-12T10:00:00Z",
  },
  {
    id: "act-8",
    type: "project_created",
    project_id: "job-5",
    user_id: "client-3",
    description: 'David Wilson posted a new job "Mobile App UI/UX Design"',
    created_at: "2024-02-17T09:30:00Z",
  },
];
