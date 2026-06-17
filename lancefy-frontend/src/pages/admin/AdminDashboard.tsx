import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Clock3,
  Gavel,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { browseJobs } from "@/services/jobs.service";
import { adminListDisputes, type DisputeResponse } from "@/services/dispute.service";
import { fetchAdminKycList, type AdminKycItem } from "@/services/kyc/adminKyc";
import { fetchAdminUsers, type AdminUserRecord } from "@/services/users/adminUsers";

const ADMIN_TYPE = {
  pageTitle:
    "text-4xl font-bold tracking-tight text-text-primary md:text-[3.15rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle:
    "text-[1.6rem] font-semibold tracking-tight text-text-primary md:text-[1.75rem]",
  statLabel: "text-base font-medium text-text-secondary",
  statValue: "mt-3 text-[2.35rem] font-bold leading-none text-text-primary",
  cardTitle: "text-[1.05rem] font-semibold leading-6 text-text-primary",
  body: "text-[0.95rem] leading-7 text-text-secondary",
  meta: "text-[0.82rem] font-medium leading-5 text-text-muted",
  micro: "text-[0.75rem] font-medium leading-5 text-text-muted",
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function HeroSection() {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          Admin Console
        </div>

        <h1 className={ADMIN_TYPE.pageTitle}>
          {t("admin.meta.dashboard.title")}
        </h1>

        <p className={cn("mt-2 max-w-3xl", ADMIN_TYPE.pageSubtitle)}>
          {t("admin.meta.dashboard.description")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 hover:text-text-primary"
        >
          {t("admin.users")}
          <ChevronRight className="h-4 w-4" />
        </Link>

        <Link
          to="/admin/community"
          className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition-colors hover:bg-primary-hover"
        >
          {t("admin.community")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  bgClass,
  iconClass,
}: {
  label: string;
  value: string | number;
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
        <div
          className={cn(
            "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px] shadow-sm",
            bgClass,
          )}
        >
          <Icon className={cn("h-7 w-7", iconClass)} />
        </div>

        <div className="min-w-0">
          <p className={ADMIN_TYPE.statLabel}>{label}</p>
          <p className={ADMIN_TYPE.statValue}>{value}</p>
          {sub ? <p className={cn("mt-2", ADMIN_TYPE.meta)}>{sub}</p> : null}
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
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <h2 className={ADMIN_TYPE.sectionTitle}>{title}</h2>

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
    </section>
  );
}

function EmptyState({
  icon: Icon = Clock3,
  title = "Nothing waiting right now",
  description,
}: {
  icon?: ElementType;
  title?: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] px-6 py-10 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
        <Icon className="h-8 w-8 text-blue-400" />
      </div>

      <p className={ADMIN_TYPE.cardTitle}>{title}</p>
      <p className={cn("mt-2 max-w-md", ADMIN_TYPE.body)}>{description}</p>
    </div>
  );
}

function QueueItemCard({
  title,
  meta,
  description,
  actionLabel,
  actionHref,
  tone = "default",
}: {
  title: string;
  meta?: string;
  description?: string;
  actionLabel: string;
  actionHref: string;
  tone?: "default" | "amber" | "rose";
}) {
  const toneClass = {
    default:
      "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.85))]",
    amber: "border-amber-200 bg-amber-50/50",
    rose: "border-rose-200 bg-rose-50/70",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-[18px] border p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        toneClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate", ADMIN_TYPE.cardTitle)}>{title}</h3>

          {description ? (
            <p className={cn("mt-1 truncate", ADMIN_TYPE.body)}>
              {description}
            </p>
          ) : null}

          {meta ? (
            <p className={cn("mt-2 inline-flex items-center gap-1", ADMIN_TYPE.meta)}>
              <Clock3 className="h-3.5 w-3.5" />
              {meta}
            </p>
          ) : null}
        </div>

        <Link
          to={actionHref}
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-[12px] border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation("common");

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [kycList, setKycList] = useState<AdminKycItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeResponse[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);

  useEffect(() => {
    fetchAdminUsers()
      .then((res) => setUsers(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});

    fetchAdminKycList("PENDING")
      .then((res) => setKycList(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});

    adminListDisputes("open")
      .then((res) => setDisputes(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});

    browseJobs({ limit: 1 })
      .then((res) => setJobsTotal(res?.data?.total ?? 0))
      .catch(() => {});
  }, []);

  const activeUsers = users.filter((user) => user.status === "active").length;

  const stats = [
    {
      label: "Platform users",
      value: users.length,
      sub: `${activeUsers} active`,
      icon: Users,
      bgClass: "bg-primary",
      iconClass: "text-primary-foreground",
    },
    {
      label: "Pending KYC",
      value: kycList.length,
      icon: ShieldCheck,
      bgClass: "bg-amber-50",
      iconClass: "text-amber-600",
    },
    {
      label: "Open disputes",
      value: disputes.length,
      icon: Gavel,
      bgClass: "bg-rose-50",
      iconClass: "text-rose-600",
    },
    {
      label: "Published jobs",
      value: jobsTotal,
      icon: Briefcase,
      bgClass: "bg-lime-50",
      iconClass: "text-lime-600",
    },
  ];

  const quickAccessItems = [
    { label: t("admin.users"), href: "/admin/users", icon: Users },
    { label: t("admin.kyc"), href: "/admin/kyc", icon: ShieldCheck },
    { label: t("admin.disputes"), href: "/admin/disputes", icon: Gavel },
    {
      label: t("admin.community"),
      href: "/admin/community",
      icon: Briefcase,
    },
  ];

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative space-y-7">
          <HeroSection />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard
              title="Pending KYC queue"
              action="Open review"
              actionHref="/admin/kyc"
            >
              {kycList.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No pending KYC"
                  description="No KYC submissions are waiting for review."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {kycList.slice(0, 6).map((item) => (
                    <QueueItemCard
                      key={item.user_id}
                      title={item.full_name || "Unknown user"}
                      meta={formatDate(item.created_at)}
                      actionLabel="Review"
                      actionHref={`/admin/kyc/${item.user_id}`}
                      tone="amber"
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Open dispute queue"
              action="Open disputes"
              actionHref="/admin/disputes"
            >
              {disputes.length === 0 ? (
                <EmptyState
                  icon={Gavel}
                  title="No open disputes"
                  description="There are no open disputes right now."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {disputes.slice(0, 6).map((item) => (
                    <QueueItemCard
                      key={item.id}
                      title={
                        item.project_title ||
                        `Project ${item.project_id.slice(0, 8)}`
                      }
                      description={item.reason}
                      meta={formatDate(item.created_at)}
                      actionLabel="Open"
                      actionHref="/admin/disputes"
                      tone="rose"
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Quick access">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="group flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.85))] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-primary shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className={cn("truncate", ADMIN_TYPE.cardTitle)}>
                        {item.label}
                      </span>
                    </div>

                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-muted transition-colors group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}