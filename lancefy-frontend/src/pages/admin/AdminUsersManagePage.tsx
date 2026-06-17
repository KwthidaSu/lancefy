import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineMagnifyingGlass,
  HiOutlineUserGroup,
  HiOutlineUserPlus,
  HiOutlineUsers,
  HiShieldCheck,
} from "react-icons/hi2";

import Modal from "@/components/ui/Modal";
import Dropdown from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  fetchInviteRoles,
  inviteTeamMember,
  updateAdminUserStatus,
  type AdminUserDetail,
  type AdminUserRecord,
  type InviteRoleOption,
} from "@/services/users/adminUsers";

const FALLBACK_ROLES: InviteRoleOption[] = [
  { value: "staff", label: "Staff" },
  { value: "platform_admin", label: "Admin" },
];

type UsersTab = "team" | "platform";

const ADMIN_TYPE = {
  pageTitle:
    "text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle: "text-lg font-semibold tracking-tight text-text-primary",
  cardTitle: "text-[1.02rem] font-semibold leading-6 text-text-primary",
  body: "text-[0.95rem] leading-7 text-text-secondary",
  meta: "text-[0.82rem] font-medium leading-5 text-text-muted",
  micro:
    "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-text-muted",
};

const surfaceClass =
  "overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

const inputClass =
  "h-12 w-full rounded-[16px] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:ring-4 focus:ring-blue-100";

const primaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-slate-50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminUsersManagePage() {
  const { t, i18n } = useTranslation("common");
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [roles, setRoles] = useState<InviteRoleOption[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<UsersTab>("platform");
  const [kycFilter, setKycFilter] = useState("all");

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(FALLBACK_ROLES[0].value);
  const [submitting, setSubmitting] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  async function loadUsers() {
    const res = await fetchAdminUsers();
    setUsers(res.data);
  }

  useEffect(() => {
    Promise.allSettled([fetchAdminUsers(), fetchInviteRoles()])
      .then(([usersResult, rolesResult]) => {
        if (usersResult.status === "fulfilled") {
          setUsers(usersResult.value.data);
        } else {
          showToast(
            usersResult.reason?.response?.data?.detail ||
              t("adminUsers.toast.loadFailed"),
            "error",
          );
        }

        if (
          rolesResult.status === "fulfilled" &&
          rolesResult.value.data.length > 0
        ) {
          setRoles(rolesResult.value.data);
          setInviteRole(rolesResult.value.data[0].value);
        }
      })
      .finally(() => setLoading(false));
  }, [showToast, t]);

  const backofficeUsers = useMemo(
    () => users.filter((user) => user.user_group === "backoffice"),
    [users],
  );

  const platformUsers = useMemo(
    () => users.filter((user) => user.user_group === "platform_user"),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const source = activeTab === "team" ? backofficeUsers : platformUsers;

    return source.filter((user) => {
      if (activeTab === "platform" && kycFilter !== "all") {
        const normalizedKyc = (user.kyc_status || "unverified").toLowerCase();
        if (normalizedKyc !== kycFilter) return false;
      }

      if (!keyword) return true;

      const fullName = [user.firstname, user.lastname]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (user.email || "").toLowerCase().includes(keyword) ||
        (user.username || "").toLowerCase().includes(keyword) ||
        (user.display_name || "").toLowerCase().includes(keyword) ||
        fullName.includes(keyword) ||
        (user.role || "").toLowerCase().includes(keyword) ||
        user.status.toLowerCase().includes(keyword) ||
        (user.kyc_status || "").toLowerCase().includes(keyword)
      );
    });
  }, [activeTab, backofficeUsers, kycFilter, platformUsers, search]);

  const teamSummary = useMemo(
    () => ({
      total: backofficeUsers.length,
      active: backofficeUsers.filter((user) => user.status === "active").length,
      pendingInvites: backofficeUsers.filter((user) => user.status === "invited")
        .length,
    }),
    [backofficeUsers],
  );

  const platformSummary = useMemo(
    () => ({
      total: platformUsers.length,
      active: platformUsers.filter((user) => user.status === "active").length,
      pendingKyc: platformUsers.filter((user) => user.kyc_status === "pending")
        .length,
    }),
    [platformUsers],
  );

  const kycOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("adminUsers.filters.allKyc", { defaultValue: "All KYC" }),
      },
      {
        value: "unverified",
        label: t("adminUsers.kyc.unverified", {
          defaultValue: "Not verified",
        }),
      },
      {
        value: "pending",
        label: t("adminUsers.kyc.pending", { defaultValue: "Pending" }),
      },
      {
        value: "verified",
        label: t("adminUsers.kyc.verified", { defaultValue: "Verified" }),
      },
      {
        value: "rejected",
        label: t("adminUsers.kyc.rejected", { defaultValue: "Rejected" }),
      },
    ],
    [t],
  );

  async function handleInviteSubmit() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !inviteRole || submitting) return;

    setSubmitting(true);

    try {
      await inviteTeamMember({ email, role: inviteRole });
      await loadUsers();

      setInviteEmail("");
      setInviteRole(roles[0]?.value || FALLBACK_ROLES[0].value);
      setIsInviteOpen(false);

      showToast(t("adminUsers.toast.inviteSuccess"), "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail || t("adminUsers.toast.inviteFailed"),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openUserDetail(userId: string) {
    setSelectedUserId(userId);
    setLoadingDetail(true);

    try {
      const res = await fetchAdminUserDetail(userId);
      setSelectedUser(res.data);
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail ||
          t("adminUsers.toast.detailFailed", {
            defaultValue: "Unable to load user details.",
          }),
        "error",
      );
      setSelectedUserId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleStatusToggle(user: AdminUserRecord) {
    if (user.status !== "active" && user.status !== "inactive") return;

    const nextStatus = user.status === "active" ? "inactive" : "active";

    setUpdatingStatusId(user.id);

    try {
      const res = await updateAdminUserStatus(user.id, nextStatus);

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? res.data.user : item)),
      );

      setSelectedUser((prev) =>
        prev && prev.id === user.id
          ? {
              ...prev,
              status: res.data.user.status,
              last_activity_at:
                res.data.user.last_activity_at ?? prev.last_activity_at,
            }
          : prev,
      );

      showToast(
        t("adminUsers.toast.statusUpdated", {
          defaultValue: "User status updated successfully.",
        }),
        "success",
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail ||
          t("adminUsers.toast.statusUpdateFailed", {
            defaultValue: "Unable to update user status.",
          }),
        "error",
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  const summary = activeTab === "team" ? teamSummary : platformSummary;

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative space-y-7">
          <PageHeader
            activeTab={activeTab}
            onInvite={() => setIsInviteOpen(true)}
            t={t}
          />

          <div className="flex flex-wrap gap-3">
            <TabButton
              active={activeTab === "platform"}
              label={t("adminUsers.tabs.platformUsers", {
                defaultValue: "Platform Users",
              })}
              onClick={() => setActiveTab("platform")}
            />
            <TabButton
              active={activeTab === "team"}
              label={t("adminUsers.tabs.teamAccess", {
                defaultValue: "Team Access",
              })}
              onClick={() => setActiveTab("team")}
            />
          </div>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <SummaryCard
              icon={activeTab === "team" ? HiOutlineUserGroup : HiOutlineUsers}
              label={
                activeTab === "team"
                  ? t("adminUsers.summary.totalTeam", {
                      defaultValue: "Team Members",
                    })
                  : t("adminUsers.summary.totalUsers")
              }
              value={activeTab === "team" ? summary.total : summary.total}
            />
            <SummaryCard
              icon={HiOutlineLockOpen}
              label={
                activeTab === "team"
                  ? t("adminUsers.summary.activeTeam", {
                      defaultValue: "Active Team",
                    })
                  : t("adminUsers.summary.activeUsers")
              }
              value={activeTab === "team" ? summary.active : summary.active}
            />
            <SummaryCard
              icon={activeTab === "team" ? HiOutlineEnvelope : HiShieldCheck}
              label={
                activeTab === "team"
                  ? t("adminUsers.summary.pendingInvites")
                  : t("adminUsers.summary.pendingKyc", {
                      defaultValue: "Pending KYC",
                    })
              }
              value={
                activeTab === "team"
                  ? teamSummary.pendingInvites
                  : platformSummary.pendingKyc
              }
            />
          </section>

          <section className={surfaceClass}>
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex w-full max-w-5xl flex-col gap-3 lg:flex-row">
                <label className="relative w-full lg:max-w-xl">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      activeTab === "team"
                        ? t("adminUsers.searchTeamPlaceholder", {
                            defaultValue:
                              "Search by email, name, role, or status...",
                          })
                        : t("adminUsers.searchPlatformPlaceholder", {
                            defaultValue:
                              "Search by email, name, username, status, or KYC...",
                          })
                    }
                    className={inputClass}
                  />
                </label>

                {activeTab === "platform" ? (
                  <div className="w-full lg:w-56">
                    <Dropdown
                      value={kycFilter}
                      onChange={setKycFilter}
                      options={kycOptions}
                      placeholder={t("adminUsers.filters.kyc", {
                        defaultValue: "KYC status",
                      })}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-text-muted">
                {t("adminUsers.table.count", { count: filteredUsers.length })}
              </div>
            </div>

            <UsersTable
              users={filteredUsers}
              loading={loading}
              activeTab={activeTab}
              updatingStatusId={updatingStatusId}
              onOpenDetail={openUserDetail}
              onToggleStatus={handleStatusToggle}
              language={i18n.language}
              t={t}
            />
          </section>
        </div>
      </div>

      <InviteModal
        isOpen={isInviteOpen}
        roles={roles}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        submitting={submitting}
        onClose={() => {
          if (!submitting) setIsInviteOpen(false);
        }}
        onEmailChange={setInviteEmail}
        onRoleChange={setInviteRole}
        onSubmit={handleInviteSubmit}
        t={t}
      />

      <UserDetailModal
        isOpen={!!selectedUserId}
        loading={loadingDetail}
        user={selectedUser}
        updatingStatusId={updatingStatusId}
        language={i18n.language}
        onClose={() => {
          setSelectedUserId(null);
          setSelectedUser(null);
        }}
        onViewKyc={(id) => {
          navigate(`/admin/kyc/${id}`);
          setSelectedUserId(null);
          setSelectedUser(null);
        }}
        onToggleStatus={handleStatusToggle}
        t={t}
      />
    </div>
  );
}

function PageHeader({
  activeTab,
  onInvite,
  t,
}: {
  activeTab: UsersTab;
  onInvite: () => void;
  t: TranslateFn;
}) {
  return (
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
        <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
          {Array.from({ length: 12 }).map((_, index) => (
            <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          Admin Console
        </div>

        <h1 className={ADMIN_TYPE.pageTitle}>{t("adminUsers.page.title")}</h1>

        <p className={cn("mt-2 max-w-3xl", ADMIN_TYPE.pageSubtitle)}>
          {t("adminUsers.page.subtitle")}
        </p>
      </div>

      {activeTab === "team" ? (
        <button type="button" onClick={onInvite} className={primaryButtonClass}>
          <HiOutlineUserPlus className="h-5 w-5" />
          {t("adminUsers.actions.inviteTeam")}
        </button>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
          <Icon className="h-7 w-7" />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-text-primary">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(37,99,235,0.20)]"
          : "border border-slate-200 bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary",
      )}
    >
      {label}
    </button>
  );
}

function UsersTable({
  users,
  loading,
  activeTab,
  updatingStatusId,
  onOpenDetail,
  onToggleStatus,
  language,
  t,
}: {
  users: AdminUserRecord[];
  loading: boolean;
  activeTab: UsersTab;
  updatingStatusId: string | null;
  onOpenDetail: (userId: string) => void;
  onToggleStatus: (user: AdminUserRecord) => void;
  language: string;
  t: TranslateFn;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center px-6 py-16 text-sm font-medium text-text-muted">
        {t("loading")}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
          <HiOutlineUsers className="h-8 w-8 text-blue-400" />
        </div>
        <p className={ADMIN_TYPE.cardTitle}>{t("adminUsers.empty")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full text-left">
        <thead className="border-b border-slate-100 bg-white text-xs uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="px-7 py-5 font-semibold">{t("adminUsers.table.email")}</th>
            <th className="px-7 py-5 font-semibold">{t("adminUsers.table.name")}</th>
            <th className="px-7 py-5 font-semibold">{t("adminUsers.table.role")}</th>
            {activeTab === "platform" ? (
              <th className="px-7 py-5 font-semibold">
                {t("adminUsers.table.kyc", { defaultValue: "KYC" })}
              </th>
            ) : null}
            <th className="px-7 py-5 font-semibold">{t("adminUsers.table.status")}</th>
            <th className="px-7 py-5 font-semibold">
              {t("adminUsers.table.invitedAt")}
            </th>
            <th className="px-7 py-5 text-right font-semibold">
              {t("adminUsers.table.actions", { defaultValue: "Actions" })}
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
            >
              <td className="px-7 py-5 align-top">
                <div className="font-semibold text-text-primary">
                  {user.email || "-"}
                </div>
                {user.username ? (
                  <div className="mt-1 text-xs font-medium text-text-muted">
                    @{user.username}
                  </div>
                ) : null}
              </td>

              <td className="px-7 py-5 align-top">
                <div className="font-semibold text-text-primary">
                  {formatUserName(user, t)}
                </div>
              </td>

              <td className="px-7 py-5 align-top text-sm font-medium text-text-secondary">
                {formatRole(user.role)}
              </td>

              {activeTab === "platform" ? (
                <td className="px-7 py-5 align-top">
                  <KycPill status={user.kyc_status || "unverified"} t={t} />
                </td>
              ) : null}

              <td className="px-7 py-5 align-top">
                <StatusPill label={getStatusLabel(user.status, t)} status={user.status} />
              </td>

              <td className="px-7 py-5 align-top text-sm font-medium text-text-muted">
                {formatDate(
                  user.last_activity_at || user.invited_at || user.accepted_at,
                  language,
                )}
              </td>

              <td className="px-7 py-5 align-top">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(user.id)}
                    className={secondaryButtonClass}
                  >
                    <HiOutlineEye className="h-4 w-4" />
                    {t("adminUsers.actions.view", { defaultValue: "View" })}
                  </button>

                  {(user.status === "active" || user.status === "inactive") ? (
                    <button
                      type="button"
                      disabled={updatingStatusId === user.id}
                      onClick={() => onToggleStatus(user)}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                        user.status === "active"
                          ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "border border-lime-200 bg-lime-50 text-lime-700 hover:bg-lime-100",
                      )}
                    >
                      {user.status === "active" ? (
                        <HiOutlineLockClosed className="h-4 w-4" />
                      ) : (
                        <HiOutlineLockOpen className="h-4 w-4" />
                      )}
                      {user.status === "active"
                        ? t("adminUsers.actions.deactivate", {
                            defaultValue: "Deactivate",
                          })
                        : t("adminUsers.actions.activate", {
                            defaultValue: "Activate",
                          })}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InviteModal({
  isOpen,
  roles,
  inviteEmail,
  inviteRole,
  submitting,
  onClose,
  onEmailChange,
  onRoleChange,
  onSubmit,
  t,
}: {
  isOpen: boolean;
  roles: InviteRoleOption[];
  inviteEmail: string;
  inviteRole: string;
  submitting: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSubmit: () => void;
  t: TranslateFn;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("adminUsers.inviteModal.title")}
      size="md"
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-text-secondary">
          {t("adminUsers.inviteModal.subtitle")}
        </p>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">
            {t("adminUsers.inviteModal.email")}
          </label>
          <div className="relative">
            <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={t("adminUsers.inviteModal.emailPlaceholder")}
              className="h-12 w-full rounded-[16px] border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-200 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">
            {t("adminUsers.inviteModal.role")}
          </label>
          <Dropdown
            value={inviteRole}
            onChange={onRoleChange}
            options={roles}
            placeholder={t("adminUsers.inviteModal.rolePlaceholder")}
          />
        </div>

        <div className="rounded-[16px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          {t("adminUsers.inviteModal.helper")}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={!inviteEmail.trim() || !inviteRole || submitting}
            onClick={onSubmit}
            className={primaryButtonClass}
          >
            {submitting
              ? t("adminUsers.inviteModal.sending")
              : t("adminUsers.inviteModal.submit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function UserDetailModal({
  isOpen,
  loading,
  user,
  updatingStatusId,
  language,
  onClose,
  onViewKyc,
  onToggleStatus,
  t,
}: {
  isOpen: boolean;
  loading: boolean;
  user: AdminUserDetail | null;
  updatingStatusId: string | null;
  language: string;
  onClose: () => void;
  onViewKyc: (id: string) => void;
  onToggleStatus: (user: AdminUserRecord) => void;
  t: TranslateFn;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("adminUsers.detail.title", { defaultValue: "User Details" })}
      size="lg"
    >
      {loading || !user ? (
        <div className="py-10 text-center text-sm font-medium text-text-muted">
          {t("loading")}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label={t("adminUsers.table.name")} value={formatUserName(user, t)} />
            <DetailCard label={t("adminUsers.table.email")} value={user.email || "-"} />
            <DetailCard label={t("adminUsers.table.role")} value={formatRole(user.role)} />
            <DetailCard
              label={t("adminUsers.table.group", { defaultValue: "Group" })}
              value={formatUserGroup(user.user_group, t)}
            />
            <DetailCard
              label={t("adminUsers.table.status")}
              value={getStatusLabel(user.status, t)}
            />
            <DetailCard
              label={t("adminUsers.table.kyc", { defaultValue: "KYC" })}
              value={getKycLabel(user.kyc_status || "unverified", t)}
            />
            <DetailCard
              label={t("adminUsers.detail.username", { defaultValue: "Username" })}
              value={user.username ? `@${user.username}` : "-"}
            />
            <DetailCard
              label={t("adminUsers.detail.phone", { defaultValue: "Phone" })}
              value={user.phone || "-"}
            />
            <DetailCard
              label={t("adminUsers.detail.createdAt", { defaultValue: "Created At" })}
              value={formatDate(user.created_at || null, language)}
            />
            <DetailCard
              label={t("adminUsers.detail.lastActivity", {
                defaultValue: "Last Activity",
              })}
              value={formatDate(user.last_activity_at || null, language)}
            />
          </div>

          <InfoPanel title={t("adminUsers.detail.roles", { defaultValue: "Roles" })}>
            <div className="flex flex-wrap gap-2">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {formatRole(role)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-secondary">-</span>
              )}
            </div>
          </InfoPanel>

          <InfoPanel
            title={t("adminUsers.detail.invitation", {
              defaultValue: "Invitation",
            })}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DetailCard
                label={t("adminUsers.detail.invitationStatus", {
                  defaultValue: "Invitation Status",
                })}
                value={user.invitation?.status || "-"}
              />
              <DetailCard
                label={t("adminUsers.detail.invitedRole", {
                  defaultValue: "Invited Role",
                })}
                value={formatRole(user.invitation?.invited_role || null)}
              />
              <DetailCard
                label={t("adminUsers.detail.invitedAt", {
                  defaultValue: "Invited At",
                })}
                value={formatDate(user.invitation?.invited_at || null, language)}
              />
              <DetailCard
                label={t("adminUsers.detail.acceptedAt", {
                  defaultValue: "Accepted At",
                })}
                value={formatDate(user.invitation?.accepted_at || null, language)}
              />
            </div>
          </InfoPanel>

          {user.bio ? (
            <InfoPanel title={t("adminUsers.detail.bio", { defaultValue: "Bio" })}>
              <p className="text-sm leading-7 text-text-secondary">{user.bio}</p>
            </InfoPanel>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              disabled={!user.has_kyc_profile}
              onClick={() => onViewKyc(user.id)}
              className={secondaryButtonClass}
            >
              {t("adminUsers.actions.viewKyc", { defaultValue: "View KYC" })}
            </button>

            {(user.status === "active" || user.status === "inactive") ? (
              <button
                type="button"
                disabled={updatingStatusId === user.id}
                onClick={() =>
                  onToggleStatus({
                    ...user,
                    invitation_status: user.invitation?.status || null,
                    invited_at: user.invitation?.invited_at || null,
                    accepted_at: user.invitation?.accepted_at || null,
                    expires_at: user.invitation?.expires_at || null,
                  })
                }
                className={cn(
                  "rounded-[14px] px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60",
                  user.status === "active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-lime-600 hover:bg-lime-700",
                )}
              >
                {user.status === "active"
                  ? t("adminUsers.actions.deactivate", {
                      defaultValue: "Deactivate",
                    })
                  : t("adminUsers.actions.activate", {
                      defaultValue: "Activate",
                    })}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] p-4">
      <div className={ADMIN_TYPE.micro}>{label}</div>
      <div className="mt-2 break-words text-sm font-semibold text-text-primary">
        {value}
      </div>
    </div>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] p-4">
      <div className="text-sm font-semibold text-text-primary">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const tone =
    status === "active"
      ? "bg-lime-50 text-lime-700 border-lime-200"
      : status === "invited"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>
      {label}
    </span>
  );
}

function KycPill({ status, t }: { status: string; t: TranslateFn }) {
  const normalized = status.toLowerCase();

  const tone =
    normalized === "verified"
      ? "bg-lime-50 text-lime-700 border-lime-200"
      : normalized === "pending"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : normalized === "rejected"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>
      {getKycLabel(normalized, t)}
    </span>
  );
}

type TranslateFn = (
  key: string,
  options?: Record<string, unknown>,
) => string;

function getStatusLabel(status: string, t: TranslateFn) {
  if (status === "invited") return t("adminUsers.status.invited");
  if (status === "inactive") return t("adminUsers.status.inactive");
  return t("adminUsers.status.active");
}

function getKycLabel(status: string, t: TranslateFn) {
  if (status === "verified") return t("adminUsers.kyc.verified");
  if (status === "pending") return t("adminUsers.kyc.pending");
  if (status === "rejected") return t("adminUsers.kyc.rejected");
  return t("adminUsers.kyc.unverified");
}

function formatUserGroup(value: string, t: TranslateFn) {
  if (value === "backoffice") return t("adminUsers.groups.backoffice");
  return t("adminUsers.groups.platformUsers");
}

function formatRole(role: string | null) {
  if (!role) return "-";
  if (role === "user") return "User";
  if (role === "freelancer") return "Freelancer";
  if (role === "platform_admin") return "Admin";
  if (role === "staff") return "Staff";

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatUserName(
  user: Pick<
    AdminUserRecord,
    "firstname" | "lastname" | "display_name" | "username" | "email"
  >,
  t: TranslateFn,
) {
  return (
    [user.firstname, user.lastname].filter(Boolean).join(" ") ||
    user.display_name ||
    (user.username ? `@${user.username}` : "") ||
    user.email ||
    t("adminUsers.table.pendingProfile")
  );
}

function formatDate(value: string | null, language: string) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}