import { Project } from "@/types";

export const calendarProjects: Project[] = [
  // --- CALENDAR DEMO PROJECTS (JAN 2026) ---
  {
    id: "proj-calendar-1",
    title: "Social Media Strategy Jan 2026",
    category: "graphic",
    scope: "Plan and design social media posts for January campaign",
    budget: 1200,
    client_id: "client-1",
    freelancer_id: "freelancer-1",
    status: "active",
    created_at: "2026-01-01T09:00:00Z",
    funding_mode: "per-milestone",
    milestones: [
      {
        id: "mile-cal-1-1",
        project_id: "proj-calendar-1",
        title: "Week 1-2 Content",
        description: "Posts for first half of Jan",
        amount: 600,
        due_date: "2026-01-14T00:00:00Z", // Past
        workflow_status: "done",
        funding_status: "released",
        submission_status: "approved",
      },
      {
        id: "mile-cal-1-2",
        project_id: "proj-calendar-1",
        title: "Week 3-4 Content",
        description: "Posts for second half of Jan",
        amount: 600,
        due_date: "2026-01-20T00:00:00Z", // Near Future
        workflow_status: "in_progress",
        funding_status: "funded",
        submission_status: "none",
      },
    ],
  },
  {
    id: "proj-calendar-2",
    title: "Corporate Website Refresh",
    category: "web",
    scope: "Update homepage and about us section",
    budget: 2800,
    client_id: "client-1",
    freelancer_id: "freelancer-2",
    status: "active",
    created_at: "2026-01-05T10:00:00Z",
    funding_mode: "per-milestone",
    milestones: [
      {
        id: "mile-cal-2-1",
        project_id: "proj-calendar-2",
        title: "Homepage Design",
        description: "New layout",
        amount: 1000,
        due_date: "2026-01-10T00:00:00Z", // Past
        workflow_status: "review",
        funding_status: "funded",
        submission_status: "submitted",
      },
      {
        id: "mile-cal-2-2",
        project_id: "proj-calendar-2",
        title: "About Us Page",
        description: "Content and layout update",
        amount: 800,
        due_date: "2026-01-18T00:00:00Z", // Tomorrow (relative to 17th)
        workflow_status: "todo",
        funding_status: "unfunded",
        submission_status: "none",
      },
      {
        id: "mile-cal-2-3",
        project_id: "proj-calendar-2",
        title: "Final Review & Deploy",
        description: "QA and Push to Prod",
        amount: 1000,
        due_date: "2026-01-25T00:00:00Z", // Future
        workflow_status: "todo",
        funding_status: "unfunded",
        submission_status: "none",
      },
    ],
  },
  {
    id: "proj-calendar-3",
    title: "Product Photoshoot Edits",
    category: "graphic",
    scope: "Edit 50 product photos",
    budget: 500,
    client_id: "client-2",
    freelancer_id: "freelancer-1",
    status: "active",
    created_at: "2026-01-10T11:00:00Z",
    funding_mode: "full",
    milestones: [
      {
        id: "mile-cal-3-1",
        project_id: "proj-calendar-3",
        title: "Batch 1 Edits",
        description: "First 25 photos",
        amount: 250,
        due_date: "2026-01-16T00:00:00Z", // Yesterday
        workflow_status: "review",
        funding_status: "funded",
        submission_status: "submitted",
      },
      {
        id: "mile-cal-3-2",
        project_id: "proj-calendar-3",
        title: "Batch 2 Edits",
        description: "Remaining 25 photos",
        amount: 250,
        due_date: "2026-01-22T00:00:00Z", // Future
        workflow_status: "todo",
        funding_status: "funded",
        submission_status: "none",
      },
    ],
  },
];
