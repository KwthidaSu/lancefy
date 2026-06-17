import { Offer } from "@/types";

export const mockOffers: Offer[] = [
  {
    id: "offer-demo-1",
    project_id: "job-demo-offer", // Links to the demo job
    freelancer_id: "freelancer-2",
    client_id: "client-1",
    status: "pending",
    proposed_milestones: [
      {
        id: "pm-demo-1",
        title: "Demo Milestone 1",
        description: "This milestone will be created upon acceptance",
        amount: 500,
        estimated_days: 7,
        deliverables: ["Demo Deliverable"],
        status: "pending",
      },
      {
        id: "pm-demo-2",
        title: "Demo Milestone 2",
        description: "Second part of the work",
        amount: 500,
        estimated_days: 14,
        deliverables: ["Final Deliverable"],
        status: "pending",
      },
    ],
    total_amount: 1000,
    cover_letter:
      "This is a demo offer. Verification: Accepting this should create 2 milestones in the project.",
    created_at: new Date().toISOString(),
  },
  {
    id: "offer-1",
    project_id: "job-1",
    freelancer_id: "freelancer-2",
    client_id: "client-1",
    status: "pending",
    proposed_milestones: [
      {
        id: "pm-1",
        title: "Initial Concept Sketches",
        description: "3 different character concept variations",
        amount: 500,
        estimated_days: 3,
        deliverables: ["3 concept sketches", "Color palette options"],
        status: "pending",
      },
      {
        id: "pm-2",
        title: "Final Character Design",
        description: "Refined character design with details",
        amount: 800,
        estimated_days: 5,
        deliverables: ["High-res character design", "Turnaround sheet"],
        status: "pending",
      },
    ],
    total_amount: 1300,
    cover_letter:
      "Hi Sarah! I'm very interested in your character design project. I have 5 years of experience in character design for games and animation. I can deliver high-quality work within your timeline. Looking forward to working with you!",
    created_at: "2024-02-15T10:00:00Z",
  },
  {
    id: "offer-2",
    project_id: "job-1",
    freelancer_id: "freelancer-3",
    client_id: "client-1",
    status: "pending",
    proposed_milestones: [
      {
        id: "pm-3",
        title: "Character Concept",
        description: "Initial character design concepts",
        amount: 600,
        estimated_days: 4,
        deliverables: ["5 concept variations", "Mood board"],
        status: "pending",
      },
      {
        id: "pm-4",
        title: "Final Design & Assets",
        description: "Polished character with expressions",
        amount: 900,
        estimated_days: 6,
        deliverables: [
          "Final character design",
          "5 facial expressions",
          "PSD source files",
        ],
        status: "pending",
      },
    ],
    total_amount: 1500,
    cover_letter:
      "Hello! I specialize in stylized character design for games. I'd love to bring your character to life with unique personality and style. Check out my portfolio for similar work!",
    created_at: "2024-02-15T14:30:00Z",
  },
];
