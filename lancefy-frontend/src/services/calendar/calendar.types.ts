export type CalendarEventType = "milestone" | "project_deadline" | "job_expires";

export type CalendarEvent = {
  event_type: CalendarEventType;
  event_date: string;           // "YYYY-MM-DD"
  title: string;
  project_title?: string | null;  // project name (for milestone events)
  project_id?: string | null;
  milestone_id?: string | null;
  job_id?: string | null;
  status?: string | null;
  is_overdue: boolean;
};

export type ProjectCalendarResponse = {
  data: CalendarEvent[];
};
