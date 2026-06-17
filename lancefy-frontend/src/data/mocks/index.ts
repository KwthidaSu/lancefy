import { mockUsers } from "./users";
import { mockProjects } from "./projects";
import { calendarProjects } from "./calendarProjects";
import { mockOffers } from "./offers";
import { mockChatConversations, mockChatMessages } from "./chat";
import {
  mockTransactions,
  mockWalletBalance,
  mockDisputes,
  mockActivities,
} from "./finance";
import { mockReviews } from "./reviews"; // NEW

// Mock messages (generic project messages, distinct from chat)
import { Message } from "@/types";
export const mockMessages: Message[] = [
  {
    id: "msg-1",
    project_id: "proj-1",
    sender_id: "client-1",
    text: "Hi Emma! Excited to work with you on this project.",
    created_at: "2024-01-15T12:00:00Z",
    attachments: [],
  },
  {
    id: "msg-2",
    project_id: "proj-1",
    sender_id: "freelancer-1",
    text: "Thank you! I have some questions about the character personalities.",
    created_at: "2024-01-15T13:00:00Z",
    attachments: [],
  },
  {
    id: "msg-3",
    project_id: "proj-1",
    sender_id: "client-1",
    text: "Sure! Let me send you the character briefs.",
    created_at: "2024-01-15T13:30:00Z",
    attachments: [
      {
        id: "att-1",
        name: "character_briefs.pdf",
        url: "#",
        size: 524288,
        type: "application/pdf",
      },
    ],
  },
  {
    id: "msg-4",
    project_id: "proj-3",
    sender_id: "client-1",
    text: "The proportions on Product B need adjustment. Can you make it 20% wider?",
    created_at: "2024-02-11T09:00:00Z",
    attachments: [],
  },
];

import { mockServices } from "./services"; // NEW

// ... imports

export const initialMockData = {
  users: mockUsers,
  projects: [...mockProjects, ...calendarProjects],
  offers: mockOffers,
  services: mockServices, // NEW
  transactions: mockTransactions,
  messages: mockMessages,
  chat_conversations: mockChatConversations,
  chat_messages: mockChatMessages,
  disputes: mockDisputes,
  reviews: mockReviews,
  activities: mockActivities,
  wallet_balance: mockWalletBalance,
};

export * from "./users";
export * from "./projects";
export * from "./offers";
export * from "./services"; // NEW
export * from "./finance";
export * from "./chat";
export * from "./calendarProjects";
export * from "./reviews";
