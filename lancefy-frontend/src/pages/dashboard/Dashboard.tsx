import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  Gavel,
  PlusCircle,
  Send,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/formatters";
import { authService } from "@/services/auth.service";
import { fetchMyProjects, fetchMilestoneBoard } from "@/services/projects/project";
import { getMyProposals, getMyJobs } from "@/services/jobs.service";
import { listMyDisputes } from "@/services/dispute.service";
import { getUserReviews } from "@/services/review.service";
import { listTransactions } from "@/services/payments.service";
import type { CurrentUser } from "@/auth/auth.types";
import type { Job, PaymentTransaction, Proposal } from "@/types";
import type { DisputeResponse } from "@/services/dispute.service";
import type { ReviewResponse } from "@/services/review.service";

type Milestone = {
  id: string;
  title: string;
  due_date: string;
  workflow_status: string;
  amount: number;
};

type Project = {
  id: string;
  title: string;
  scope: string;
  status: string;
  budget: number;
  client_id: string;
  freelancer_id: string;
  milestones: Milestone[];
};

type Role = "employer" | "freelancer";

type QueueMilestone = Milestone & {
  projectId: string;
  projectTitle: string;
  daysLeft: number;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProjectLike = (raw: any): Project => ({
  id: String(raw?.id ?? raw?.project_id ?? `tmp-${Math.random().toString(36).slice(2)}`),
  title: String(raw?.title ?? ""),
  scope: String(raw?.scope ?? raw?.description ?? ""),
  status: String(raw?.status ?? raw?.assignment_status ?? "draft"),
  budget: toNumber(raw?.budget ?? raw?.total_budget, 0),
  client_id: String(raw?.client_id ?? raw?.client?.id ?? raw?.owner_id ?? ""),
  freelancer_id: String(raw?.freelancer_id ?? raw?.freelancer?.id ?? raw?.assignee?.id ?? ""),
  milestones: Array.isArray(raw?.milestones) ? raw.milestones : [],
});

const projectMilestones = (project: Project): Milestone[] =>
  Array.isArray(project?.milestones) ? project.milestones : [];

function formatThb(value: number) {
  return `฿${new Intl.NumberFormat("th-TH").format(value)}`;
}

function formatThbSafe(value: number) {
  return formatThb(value).replace("à¸¿", "\u0e3f");
}

const PROPOSAL_STATUS: Record<string, { icon: ElementType; color: string; labelKey: string }> = {
  pending: { icon: Circle, color: "text-amber-500", labelKey: "dashboardPage.status.proposals.pending" },
  accepted: { icon: CheckCircle2, color: "text-lime-600", labelKey: "dashboardPage.status.proposals.accepted" },
  rejected: { icon: XCircle, color: "text-rose-500", labelKey: "dashboardPage.status.proposals.rejected" },
  withdrawn: { icon: XCircle, color: "text-slate-400", labelKey: "dashboardPage.status.proposals.withdrawn" },
};

const DISPUTE_STATUS_STYLES: Record<string, { color: string; labelKey: string }> = {
  open: { color: "bg-rose-100 text-rose-700", labelKey: "dashboardPage.status.disputes.open" },
  reviewing: { color: "bg-amber-100 text-amber-700", labelKey: "dashboardPage.status.disputes.reviewing" },
  resolved: { color: "bg-lime-100 text-lime-700", labelKey: "dashboardPage.status.disputes.resolved" },
};

const DASHBOARD_TYPE = {
  pageTitle: "text-4xl font-bold tracking-tight text-text-primary md:text-[3.15rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle: "text-[1.6rem] font-semibold tracking-tight text-text-primary md:text-[1.75rem]",
  statLabel: "text-base font-medium text-text-secondary",
  statValue: "mt-3 text-[2.35rem] font-bold leading-none text-text-primary",
  cardTitle: "text-[1.05rem] font-semibold leading-6 text-text-primary",
  body: "text-[0.95rem] leading-7 text-text-secondary",
  meta: "text-[0.82rem] font-medium leading-5 text-text-muted",
  micro: "text-[0.75rem] font-medium leading-5 text-text-muted",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  bgClass,
  iconClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ElementType;
  bgClass: string;
  iconClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
      <div className="relative flex items-start gap-5">
        <div className={cn("flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px] shadow-sm", bgClass)}>
          <Icon className={cn("h-7 w-7", iconClass)} />
        </div>
        <div className="min-w-0">
          <p className={DASHBOARD_TYPE.statLabel}>{label}</p>
          <p className={DASHBOARD_TYPE.statValue}>{value}</p>
          {sub ? <p className={cn("mt-2", DASHBOARD_TYPE.meta)}>{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  actionHref,
  children,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <h2 className={DASHBOARD_TYPE.sectionTitle}>{title}</h2>
        {action && actionHref ? (
          <Link
            to={actionHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            {action}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] px-6 py-10 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
        <Icon className="h-8 w-8 text-blue-400" />
      </div>
      <p className={DASHBOARD_TYPE.cardTitle}>{title}</p>
      <p className={cn("mt-2 max-w-md", DASHBOARD_TYPE.body)}>{description}</p>
      {actionLabel && actionHref ? (
        <Link to={actionHref} className="mt-5 inline-flex items-center gap-2 rounded-[12px] border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function EmployerProjectCard({ project }: { project: Project }) {
  const { t } = useTranslation();
  const milestones = projectMilestones(project);
  const doneCount = milestones.filter((milestone) => milestone.workflow_status === "done").length;
  const totalCount = milestones.length || 1;
  const progress = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.85))] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("truncate", DASHBOARD_TYPE.cardTitle)}>
            {project.title || t("dashboardPage.fallbacks.untitledProject")}
          </h3>
          <p className={cn("mt-1", DASHBOARD_TYPE.meta)}>
            {t("dashboardPage.projectCard.progress", {
              done: doneCount,
              total: totalCount,
              budget: formatThbSafe(project.budget),
            })}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <ProgressBar value={progress} />
      <div className={cn("mt-3 flex items-center justify-between", DASHBOARD_TYPE.meta)}>
        <span>{t("dashboardPage.projectCard.percentComplete", { progress })}</span>
        <Link to={`/app/projects/${project.id}`} className="font-medium text-primary transition-colors hover:text-primary-hover">
          {t("dashboardPage.actions.open")} →
        </Link>
      </div>
    </div>
  );
}

function QueueCard({ item }: { item: QueueMilestone }) {
  const { t } = useTranslation();
  const overdue = item.daysLeft < 0;
  const urgent = item.daysLeft >= 0 && item.daysLeft <= 2;

  return (
    <div
      className={cn(
        "rounded-[16px] border p-4",
        overdue
          ? "border-rose-200 bg-rose-50/70"
          : urgent
            ? "border-amber-200 bg-amber-50/50"
            : "border-slate-200/80 bg-slate-50/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("truncate", DASHBOARD_TYPE.cardTitle)}>
            {item.title || t("dashboardPage.fallbacks.untitledMilestone")}
          </h3>
          <p className={cn("mt-1", DASHBOARD_TYPE.meta)}>{item.projectTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {item.amount > 0 ? (
            <span className="text-[1rem] font-semibold text-lime-700">{formatThbSafe(item.amount)}</span>
          ) : null}
          {overdue ? (
            <StatusBadge status="overdue" label={t("dashboardPage.status.overdue")} />
          ) : urgent ? (
            <StatusBadge status="pending" label={t("dashboardPage.status.urgent")} />
          ) : (
            <StatusBadge status="in_progress" label={t("dashboardPage.status.inProgress")} />
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-1", DASHBOARD_TYPE.meta, overdue ? "text-rose-600" : "text-text-muted")}>
          <CalendarDays className="h-3 w-3" />
          {overdue
            ? t("dashboardPage.queue.overdue", { days: Math.abs(item.daysLeft) })
            : t("dashboardPage.queue.due", {
                date: formatDate(item.due_date),
                days: item.daysLeft,
              })}
        </span>
        <Link
          to={`/app/projects/${item.projectId}`}
          className="rounded-[12px] border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {t("dashboardPage.actions.viewWork")} →
        </Link>
      </div>
    </div>
  );
}

export default function DashboardV2() {
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [myDisputes, setMyDisputes] = useState<DisputeResponse[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewResponse[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [role, setRole] = useState<Role>("employer");

  useEffect(() => {
    if (!keycloak.authenticated) return;

    authService
      .getCurrentUser()
      .then((user: CurrentUser) => {
        setCurrentUser(user);

        if (user.kyc_status === "verified" && user.is_public) {
          setRole("freelancer");
        }

        fetchMyProjects({ page: 1, pageSize: 50, role: "all" })
          .then((res) => {
            const list = Array.isArray(res?.data?.data) ? res.data.data : [];
            const base = list.map(normalizeProjectLike);

            // Fetch milestones for active projects in parallel
            // (the /projects list endpoint does not include milestones)
            const activeIds = base
              .filter((p) => ["active", "in_progress", "disputed"].includes(p.status))
              .map((p) => p.id);

            Promise.all(
              activeIds.map((id) =>
                fetchMilestoneBoard(id)
                  .then((r) => ({ id, milestones: r.data as Milestone[] }))
                  .catch(() => ({ id, milestones: [] as Milestone[] }))
              )
            ).then((results) => {
              const milestoneMap: Record<string, Milestone[]> = {};
              results.forEach(({ id, milestones }) => { milestoneMap[id] = milestones; });
              setProjects(
                base.map((p) => ({
                  ...p,
                  milestones: milestoneMap[p.id] ?? p.milestones,
                }))
              );
            });
          })
          .catch(() => {});

        getMyJobs()
          .then((res) => setMyJobs(Array.isArray(res?.data) ? res.data : []))
          .catch(() => {});

        getMyProposals()
          .then((res) => setMyProposals(Array.isArray(res?.data) ? res.data : []))
          .catch(() => {});

        listMyDisputes()
          .then((res) => setMyDisputes(Array.isArray(res?.data) ? res.data : []))
          .catch(() => {});

        getUserReviews(user.id)
          .then((res) => setMyReviews(Array.isArray(res?.data) ? res.data : []))
          .catch(() => {});

        listTransactions({ limit: 100 })
          .then((res) => setTransactions(Array.isArray(res?.data) ? res.data : []))
          .catch(() => {});
      })
      .catch(() => {});
  }, [keycloak.authenticated]);

  const displayName =
    [currentUser?.firstname, currentUser?.lastname].filter(Boolean).join(" ") ||
    currentUser?.username ||
    "—";

  const myId = currentUser?.id;
  const now = new Date();
  const safeProjects = Array.isArray(projects) ? projects : [];

  const projectsAsClient = safeProjects.filter((project) => project.client_id === myId);
  const activeClientProjects = projectsAsClient.filter((project) =>
    ["active", "in_progress"].includes(project.status),
  );
  const pendingReviews = projectsAsClient
    .flatMap((project) =>
      projectMilestones(project)
        .filter((milestone) => milestone.workflow_status === "submitted" || milestone.workflow_status === "review")
        .map((milestone) => ({
          ...milestone,
          projectId: project.id,
          projectTitle: project.title,
          daysLeft: Math.ceil(
            (new Date(milestone.due_date).getTime() - now.getTime()) / 86_400_000,
          ),
        })),
    )
    .slice(0, 3);

  const projectsAsFreelancer = safeProjects.filter(
    (project) => project.freelancer_id === myId,
  );
  const activeFreelanceProjects = projectsAsFreelancer.filter((project) =>
    ["active", "in_progress"].includes(project.status),
  );
  const workQueue = projectsAsFreelancer
    .flatMap((project) =>
      projectMilestones(project)
        .filter((milestone) => milestone.workflow_status !== "done")
        .map((milestone) => ({
          ...milestone,
          projectId: project.id,
          projectTitle: project.title,
          daysLeft: Math.ceil(
            (new Date(milestone.due_date).getTime() - now.getTime()) / 86_400_000,
          ),
        })),
    )
    .sort((left, right) => left.daysLeft - right.daysLeft)
    .slice(0, 5);

  const pendingProposals = myProposals.filter((proposal) => proposal.status === "pending");
  const acceptedProposals = myProposals.filter((proposal) => proposal.status === "accepted");
  const activeDisputes = myDisputes.filter((dispute) =>
    ["open", "reviewing"].includes(dispute.status),
  );

  const clientBudgetTotal = projectsAsClient.reduce(
    (sum, project) => sum + project.budget,
    0,
  );
  const totalEarnings = transactions
    .filter((transaction) => transaction.type === "release" && transaction.status === "completed")
    .reduce((sum, transaction) => sum + (transaction.net_amount ?? transaction.amount), 0);
  const pendingEarnings = transactions
    .filter((transaction) => transaction.type === "escrow" && transaction.status === "held")
    .reduce((sum, transaction) => sum + (transaction.net_amount ?? transaction.amount), 0);

  const averageRating =
    myReviews.length > 0
      ? (myReviews.reduce((sum, review) => sum + review.rating, 0) / myReviews.length).toFixed(1)
      : null;

  const employerStats = [
    {
      label: t("dashboardPage.stats.employer.activeProjects.label"),
      value: String(activeClientProjects.length),
      sub: activeClientProjects.length > 0 ? t("dashboardPage.stats.employer.activeProjects.sub") : undefined,
      icon: Briefcase,
      bgClass: "bg-primary",
      iconClass: "text-primary-foreground",
    },
    {
      label: t("dashboardPage.stats.employer.proposals.label"),
      value: String(myJobs.reduce((sum, job) => sum + (job.proposals_count ?? 0), 0)),
      sub: t("dashboardPage.stats.employer.proposals.sub", { count: myJobs.length }),
      icon: FileText,
      bgClass: "bg-blue-50",
      iconClass: "text-primary",
    },
    {
      label: t("dashboardPage.stats.employer.pendingReviews.label"),
      value: String(pendingReviews.length),
      sub: pendingReviews.length > 0 ? t("dashboardPage.stats.employer.pendingReviews.sub") : undefined,
      icon: Clock3,
      bgClass: "bg-amber-50",
      iconClass: "text-amber-600",
    },
    {
      label: t("dashboardPage.stats.employer.totalBudget.label"),
      value: formatThbSafe(clientBudgetTotal),
      sub: t("dashboardPage.stats.employer.totalBudget.sub", { count: projectsAsClient.length }),
      icon: TrendingUp,
      bgClass: "bg-lime-50",
      iconClass: "text-lime-600",
    },
  ];

  const freelancerStats = [
    {
      label: t("dashboardPage.stats.freelancer.activeWork.label"),
      value: String(activeFreelanceProjects.length),
      sub: activeFreelanceProjects.length > 0 ? t("dashboardPage.stats.freelancer.activeWork.sub") : undefined,
      icon: Briefcase,
      bgClass: "bg-primary",
      iconClass: "text-primary-foreground",
    },
    {
      label: t("dashboardPage.stats.freelancer.proposals.label"),
      value: `${acceptedProposals.length}/${myProposals.length}`,
      sub: t("dashboardPage.stats.freelancer.proposals.sub", { count: pendingProposals.length }),
      icon: Send,
      bgClass: "bg-blue-50",
      iconClass: "text-primary",
    },
    {
      label: t("dashboardPage.stats.freelancer.urgentMilestones.label"),
      value: String(workQueue.filter((item) => item.daysLeft <= 2).length),
      sub: t("dashboardPage.stats.freelancer.urgentMilestones.sub", { count: workQueue.length }),
      icon: AlertTriangle,
      bgClass: "bg-amber-50",
      iconClass: "text-amber-600",
    },
    {
      label: t("dashboardPage.stats.freelancer.earnings.label"),
      value: formatThbSafe(totalEarnings),
      sub:
        pendingEarnings > 0
          ? t("dashboardPage.stats.freelancer.earnings.pending", { amount: formatThbSafe(pendingEarnings) })
          : t("dashboardPage.stats.freelancer.earnings.ready"),
      icon: Wallet,
      bgClass: "bg-lime-50",
      iconClass: "text-lime-600",
    },
  ];

  const summaryStats = role === "employer" ? employerStats : freelancerStats;

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative space-y-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className={DASHBOARD_TYPE.pageTitle}>
              {role === "employer"
                ? t("dashboardPage.hero.titleEmployer")
                : t("dashboardPage.hero.titleFreelancer")}
            </h1>
            <p className={cn("mt-2", DASHBOARD_TYPE.pageSubtitle)}>
              {t("dashboardPage.hero.welcome", { name: displayName })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-[16px] border border-slate-200 bg-white p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <button
                onClick={() => setRole("employer")}
                className={cn(
                  "rounded-[10px] px-6 py-2.5 text-sm font-semibold transition-colors",
                  role === "employer"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {t("dashboardPage.roleTabs.employer")}
              </button>
              <button
                onClick={() => setRole("freelancer")}
                className={cn(
                  "rounded-[10px] px-6 py-2.5 text-sm font-semibold transition-colors",
                  role === "freelancer"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {t("dashboardPage.roleTabs.freelancer")}
              </button>
            </div>

            {role === "employer" ? (
              <Link
                to="/app/jobs/create"
                className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition-colors hover:bg-primary-hover"
              >
                <PlusCircle className="h-4 w-4" />
                {t("dashboardPage.actions.postJob")}
              </Link>
            ) : (
              <Link
                to="/app/explore/jobs"
                className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition-colors hover:bg-primary-hover"
              >
                <ArrowRight className="h-4 w-4" />
                {t("dashboardPage.actions.findWork")}
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {activeDisputes.length > 0 ? (
            <div className="flex items-center gap-3 rounded-[16px] border border-rose-200 bg-rose-50 px-5 py-4">
              <Gavel className="h-4 w-4 flex-shrink-0 text-rose-600" />
              <p className="flex-1 text-[0.95rem] font-medium leading-6 text-rose-800">
                {t("dashboardPage.banners.disputes", { count: activeDisputes.length })}
              </p>
              <Link to="/app/disputes" className="text-xs font-semibold text-rose-700 underline">
                {t("dashboardPage.actions.viewDisputes")}
              </Link>
            </div>
          ) : null}

          {!currentUser?.bio ? (
            <div className="flex items-center gap-4 rounded-[20px] border border-blue-200/80 bg-[linear-gradient(90deg,rgba(245,249,255,1),rgba(255,255,255,1))] px-5 py-4 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="flex-1 text-[0.95rem] font-medium leading-6 text-text-primary">
                {t("dashboardPage.banners.completeProfile")}
              </p>
              <Link
                to="/app/profile"
                className="rounded-[14px] border border-blue-300 bg-white px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-blue-50"
              >
                {t("dashboardPage.actions.updateProfile")}
              </Link>
            </div>
          ) : null}

          {role === "freelancer" && currentUser?.kyc_status !== "verified" ? (
            <div className="flex items-center gap-3 rounded-[16px] border border-blue-200 bg-blue-50 px-5 py-4">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-primary" />
              <p className="flex-1 text-[0.95rem] font-medium leading-6 text-blue-800">
                {t("dashboardPage.banners.completeKyc")}
              </p>
              <Link
                to="/app/kyc"
                className="rounded-[12px] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {t("dashboardPage.actions.verifyKyc")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {role === "employer" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title={t("dashboardPage.sections.activeProjects.title")}
                action={t("dashboardPage.actions.viewAll")}
                actionHref="/app/projects"
              >
                {activeClientProjects.length === 0 ? (
                  <EmptyPanel
                    icon={Briefcase}
                    title={t("dashboardPage.empty.activeProjects.title")}
                    description={t("dashboardPage.empty.activeProjects.description")}
                    actionLabel={t("dashboardPage.actions.postJobNow")}
                    actionHref="/app/jobs/create"
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeClientProjects.slice(0, 5).map((project) => (
                      <EmployerProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="mt-6">
                <SectionCard
                  title={t("dashboardPage.sections.postedJobs.title")}
                  action={t("dashboardPage.actions.viewAll")}
                  actionHref="/app/jobs/mine"
                >
                  {myJobs.length === 0 ? (
                    <EmptyPanel
                      icon={PlusCircle}
                      title={t("dashboardPage.empty.postedJobs.title")}
                      description={t("dashboardPage.empty.postedJobs.description")}
                      actionLabel={t("dashboardPage.actions.createJob")}
                      actionHref="/app/jobs/create"
                    />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {myJobs.slice(0, 4).map((job) => (
                        <Link
                          key={job.id}
                          to={`/app/jobs/${job.id}`}
                          className="group flex items-center justify-between py-3"
                        >
                          <div className="min-w-0">
                            <p className={cn("truncate transition-colors group-hover:text-primary", DASHBOARD_TYPE.cardTitle)}>
                              {job.title}
                            </p>
                            <p className={cn("mt-0.5", DASHBOARD_TYPE.meta)}>
                              {t("dashboardPage.postedJobs.meta", {
                                count: job.proposals_count ?? 0,
                                status: job.status === "open" ? t("dashboardPage.status.active") : job.status,
                              })}
                            </p>
                          </div>
                          <div className="ml-3 flex items-center gap-2">
                            {job.budget ? (
                              <span className="text-[0.95rem] font-semibold text-text-secondary">
                                {formatThbSafe(job.budget)}
                              </span>
                            ) : null}
                            <ChevronRight className="h-4 w-4 text-text-muted" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <SectionCard title={t("dashboardPage.sections.pendingReviews.title")}>
                {pendingReviews.length === 0 ? (
                  <EmptyPanel
                    icon={Clock3}
                    title={t("dashboardPage.empty.pendingReviews.title")}
                    description={t("dashboardPage.empty.pendingReviews.description")}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {pendingReviews.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[18px] border border-violet-200 bg-violet-50/50 p-4"
                      >
                        <p className={DASHBOARD_TYPE.cardTitle}>{item.title}</p>
                        <p className={cn("mt-1", DASHBOARD_TYPE.meta)}>{item.projectTitle}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            {item.daysLeft >= 0
                              ? t("dashboardPage.queue.daysLeft", { days: item.daysLeft })
                              : t("dashboardPage.queue.overBy", { days: Math.abs(item.daysLeft) })}
                          </span>
                          <Link
                            to={`/app/projects/${item.projectId}`}
                            className="rounded-[12px] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                          >
                            {t("dashboardPage.actions.review")}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {myDisputes.length > 0 ? (
                <SectionCard title={t("dashboardPage.sections.disputes.title")} action={t("dashboardPage.actions.viewAll")} actionHref="/app/disputes">
                  <div className="flex flex-col gap-2.5">
                    {myDisputes.slice(0, 3).map((dispute) => {
                      const style =
                        DISPUTE_STATUS_STYLES[dispute.status] ?? DISPUTE_STATUS_STYLES.open;
                      return (
                        <Link
                          key={dispute.id}
                          to={`/app/disputes/${dispute.id}`}
                          className="flex items-start justify-between gap-2 rounded-[16px] border border-slate-200/80 p-3 transition-colors hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className={cn("truncate", DASHBOARD_TYPE.cardTitle)}>
                              {dispute.project_title ?? t("dashboardPage.fallbacks.dispute")}
                            </p>
                            <p className={cn("mt-0.5 truncate", DASHBOARD_TYPE.meta)}>
                              {dispute.reason}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold",
                              style.color,
                            )}
                          >
                            {t(style.labelKey)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title={t("dashboardPage.sections.milestonesToSubmit.title")}
                action={t("dashboardPage.actions.viewAllWork")}
                actionHref="/app/projects"
              >
                {workQueue.length === 0 ? (
                  <EmptyPanel
                    icon={CheckCircle2}
                    title={t("dashboardPage.empty.workQueue.title")}
                    description={t("dashboardPage.empty.workQueue.description")}
                    actionLabel={t("dashboardPage.actions.browseJobs")}
                    actionHref="/app/explore/jobs"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {workQueue.map((item) => (
                      <QueueCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="flex flex-col gap-6">
              <SectionCard
                title={t("dashboardPage.sections.myProposals.title")}
                action={t("dashboardPage.actions.viewAll")}
                actionHref="/app/proposals"
              >
                {myProposals.length === 0 ? (
                  <EmptyPanel
                    icon={Send}
                    title={t("dashboardPage.empty.proposals.title")}
                    description={t("dashboardPage.empty.proposals.description")}
                    actionLabel={t("dashboardPage.actions.findWork")}
                    actionHref="/app/explore/jobs"
                  />
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {myProposals.slice(0, 5).map((proposal) => {
                      const config =
                        PROPOSAL_STATUS[proposal.status] ?? PROPOSAL_STATUS.pending;
                      const Icon = config.icon;
                      return (
                        <div
                          key={proposal.id}
                          className="flex items-center gap-3 rounded-[16px] p-3 transition-colors hover:bg-slate-50"
                        >
                          <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate", DASHBOARD_TYPE.cardTitle)}>
                              {(proposal as any).job_title ??
                                t("dashboardPage.fallbacks.job", { id: proposal.job_id?.slice(0, 6) })}
                            </p>
                            <p className={DASHBOARD_TYPE.meta}>{t(config.labelKey)}</p>
                          </div>
                          {proposal.proposed_budget ? (
                            <span className="text-[0.82rem] font-medium text-text-secondary">
                              {formatThbSafe(proposal.proposed_budget)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={t("dashboardPage.sections.activeWork.title")}
                action={t("dashboardPage.actions.viewAll")}
                actionHref="/app/projects"
              >
                {activeFreelanceProjects.length === 0 ? (
                  <EmptyPanel
                    icon={Briefcase}
                    title={t("dashboardPage.empty.activeWork.title")}
                    description={t("dashboardPage.empty.activeWork.description")}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeFreelanceProjects.slice(0, 4).map((project) => {
                      const milestones = projectMilestones(project);
                      const doneCount = milestones.filter(
                        (milestone) => milestone.workflow_status === "done",
                      ).length;
                      const totalCount = milestones.length || 1;
                      const progress = Math.round((doneCount / totalCount) * 100);
                      return (
                        <div key={project.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <p className={cn("max-w-[70%] truncate", DASHBOARD_TYPE.cardTitle)}>
                              {project.title || t("dashboardPage.fallbacks.untitledProject")}
                            </p>
                            <span className={DASHBOARD_TYPE.meta}>{progress}%</span>
                          </div>
                          <ProgressBar value={progress} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {myReviews.length > 0 ? (
                <SectionCard title={t("dashboardPage.sections.latestReviews.title")}>
                  <div className="flex flex-col gap-3">
                    {myReviews.slice(0, 3).map((review) => (
                      <div
                        key={review.id}
                        className="rounded-[16px] border border-slate-200/80 p-3"
                      >
                        <div className="mb-1.5 flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={cn(
                                "h-3.5 w-3.5",
                                index < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-200",
                              )}
                            />
                          ))}
                        </div>
                        {review.comment ? (
                          <p className="line-clamp-2 text-[0.82rem] leading-6 text-text-secondary">
                            {review.comment}
                          </p>
                        ) : null}
                        <p className={cn("mt-1", DASHBOARD_TYPE.meta)}>
                          {review.reviewer_display_name ?? review.reviewer_username ?? ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}

              {myDisputes.length > 0 ? (
                <SectionCard title={t("dashboardPage.sections.disputes.title")} action={t("dashboardPage.actions.viewAll")} actionHref="/app/disputes">
                  <div className="flex flex-col gap-2">
                    {myDisputes.slice(0, 3).map((dispute) => {
                      const style =
                        DISPUTE_STATUS_STYLES[dispute.status] ?? DISPUTE_STATUS_STYLES.open;
                      return (
                        <Link
                          key={dispute.id}
                          to={`/app/disputes/${dispute.id}`}
                          className="flex items-center justify-between gap-2 rounded-[16px] border border-slate-200/80 p-3 transition-colors hover:bg-slate-50"
                        >
                          <p className={cn("truncate", DASHBOARD_TYPE.cardTitle)}>
                            {dispute.project_title ?? t("dashboardPage.fallbacks.dispute")}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold",
                              style.color,
                            )}
                          >
                            {t(style.labelKey)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </SectionCard>
              ) : null}

              {averageRating ? (
                <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                  <p className={DASHBOARD_TYPE.statLabel}>{t("dashboardPage.rating.title")}</p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className={DASHBOARD_TYPE.pageTitle}>{averageRating}</p>
                    <div className="mb-1 flex items-center gap-1 text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                  </div>
                  <p className={cn("mt-2", DASHBOARD_TYPE.meta)}>
                    {t("dashboardPage.rating.fromReviews", { count: myReviews.length })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
