import type { ReactNode } from "react";

export type MilestoneOfferMessage = {
  kind: "milestone_offer";
  offer_id: string;
  project_id?: string;
  proposed_budget: number;
  currency: string;
  message?: string;
  milestones: {
    title: string;
    amount: number;
    estimated_days?: number;
    description?: string;
  }[];
  counter_to?: string;
  sent_by?: string;
  created_at?: string;
};

export type MilestoneOfferDecisionMessage = {
  kind: "milestone_offer_decision";
  offer_id: string;
  decision: "accepted" | "rejected";
  by?: string;
  created_at?: string;
};

export type SystemPayload =
  | MilestoneOfferMessage
  | MilestoneOfferDecisionMessage;

export type FileAttachmentMeta = {
  url: string;
  filename: string;
  size: number;
};

export type RoomTabKey = "all" | "dm" | "deal" | "project" | "archive";

export type RoomTabItem = {
  key: RoomTabKey;
  label: string;
  icon: ReactNode;
};
