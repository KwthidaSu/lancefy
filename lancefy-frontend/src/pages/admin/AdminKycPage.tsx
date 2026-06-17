import { useEffect, useState, type ElementType } from "react";
import {
  HiArrowPath,
  HiCheckCircle,
  HiClock,
  HiDocumentCheck,
  HiDocumentText,
  HiExclamationTriangle,
  HiIdentification,
  HiUserCircle,
  HiXCircle,
} from "react-icons/hi2";

import { useToast } from "@/components/ui/Toast";
import { authHttp } from "@/lib/authHttp";
import { cn } from "@/lib/utils";

type KYCStatus =
  | "NOT_SUBMITTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_RESUBMISSION";

interface KYCListItem {
  user_id: string;
  full_name: string;
  citizen_id: string;
  status: KYCStatus;
  created_at: string | null;
}

interface KYCDocument {
  file_id: string;
  url: string | null;
  created_at: string | null;
}

interface KYCDetail {
  user_id: string;
  profile: {
    full_name: string;
    citizen_id: string;
    date_of_birth: string;
    country: string;
    address: string;
  };
  id_card: KYCDocument | null;
  selfie: KYCDocument | null;
}

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

const STATUS_STYLES: Record<
  KYCStatus,
  {
    badge: string;
    dot: string;
    label: string;
    icon: ElementType;
    iconBg: string;
    iconColor: string;
  }
> = {
  NOT_SUBMITTED: {
    dot: "bg-slate-400",
    badge: "border border-slate-200 bg-slate-50 text-slate-600",
    label: "ยังไม่ยื่น",
    icon: HiDocumentText,
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
  },
  PENDING: {
    dot: "bg-amber-500",
    badge: "border border-amber-200 bg-amber-50 text-amber-700",
    label: "รอตรวจสอบ",
    icon: HiClock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  APPROVED: {
    dot: "bg-lime-500",
    badge: "border border-lime-200 bg-lime-50 text-lime-700",
    label: "อนุมัติแล้ว",
    icon: HiCheckCircle,
    iconBg: "bg-lime-50",
    iconColor: "text-lime-600",
  },
  REJECTED: {
    dot: "bg-rose-500",
    badge: "border border-rose-200 bg-rose-50 text-rose-700",
    label: "ปฏิเสธ",
    icon: HiXCircle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  NEEDS_RESUBMISSION: {
    dot: "bg-primary",
    badge: "border border-blue-200 bg-blue-50 text-primary",
    label: "ส่งใหม่",
    icon: HiExclamationTriangle,
    iconBg: "bg-blue-50",
    iconColor: "text-primary",
  },
};

const inputClass =
  "w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PageHero({
  loading,
  onRefresh,
}: {
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          Admin Console
        </div>

        <h1 className={ADMIN_TYPE.pageTitle}>KYC Review</h1>

        <p className={cn("mt-2 max-w-3xl", ADMIN_TYPE.pageSubtitle)}>
          ตรวจสอบเอกสารยืนยันตัวตนของ freelancer และจัดการสถานะ KYC
          ให้เป็นระบบเดียวกับหน้า Admin ทั้งหมด
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className={secondaryButtonClass}
      >
        <HiArrowPath className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
        Refresh
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  bgClass,
  iconClass,
}: {
  label: string;
  value: number;
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
          <p className={ADMIN_TYPE.statValue}>{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: KYCStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        style.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

function Avatar({ name }: { name?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
      {initial}
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
        <Icon className="h-8 w-8 text-blue-400" />
      </div>

      <p className={ADMIN_TYPE.cardTitle}>{title}</p>
      <p className={cn("mt-2 max-w-md", ADMIN_TYPE.body)}>{description}</p>
    </div>
  );
}

function DocumentPreview({
  label,
  document,
}: {
  label: string;
  document: KYCDocument | null;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{label}</p>

        {document?.created_at ? (
          <span className={ADMIN_TYPE.micro}>
            {formatDate(document.created_at)}
          </span>
        ) : null}
      </div>

      {document?.url ? (
        <a
          href={document.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          <img
            src={document.url}
            alt={label}
            className="h-44 w-full object-cover transition duration-200 group-hover:scale-[1.02] group-hover:opacity-90"
          />
        </a>
      ) : (
        <div className="flex h-44 w-full items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-white text-sm font-medium text-text-muted">
          ไม่มีเอกสาร
        </div>
      )}

      {document?.file_id ? (
        <p className="mt-3 break-all text-xs font-medium text-text-muted">
          File ID: <span className="text-text-secondary">{document.file_id}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function AdminKycPage() {
  const { showToast } = useToast();

  const [list, setList] = useState<KYCListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<KYCDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadList = async () => {
    setLoading(true);

    try {
      const res = await authHttp.get("/kyc/admin/pending");
      setList(res.data);
    } catch {
      showToast("โหลดรายการ KYC ล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openDetail = async (userId: string) => {
    setSelected(userId);
    setDetail(null);
    setReason("");
    setDetailLoading(true);

    try {
      const res = await authHttp.get(`/kyc/admin/${userId}`);
      setDetail(res.data);
    } catch {
      showToast("โหลดรายละเอียด KYC ล้มเหลว", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReview = async (
    status: "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION",
  ) => {
    if (!selected) return;

    setSubmitting(true);

    try {
      await authHttp.patch(`/kyc/admin/${selected}/review`, {
        status,
        reason: reason || undefined,
      });

      const labels: Record<string, string> = {
        APPROVED: "อนุมัติ KYC แล้ว",
        REJECTED: "ปฏิเสธ KYC แล้ว",
        NEEDS_RESUBMISSION: "ขอเอกสารเพิ่มแล้ว",
      };

      showToast(labels[status], "success");
      setSelected(null);
      setDetail(null);
      loadList();
    } catch {
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    pending: list.filter((item) => item.status === "PENDING").length,
    resubmission: list.filter((item) => item.status === "NEEDS_RESUBMISSION")
      .length,
    total: list.length,
  };

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative space-y-7">
          <PageHero loading={loading} onRefresh={loadList} />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              label="รอตรวจสอบ"
              value={loading ? 0 : stats.pending}
              icon={HiClock}
              bgClass="bg-primary"
              iconClass="text-primary-foreground"
            />

            <StatCard
              label="ต้องส่งใหม่"
              value={loading ? 0 : stats.resubmission}
              icon={HiExclamationTriangle}
              bgClass="bg-amber-50"
              iconClass="text-amber-600"
            />

            <StatCard
              label="รายการทั้งหมด"
              value={loading ? 0 : stats.total}
              icon={HiIdentification}
              bgClass="bg-lime-50"
              iconClass="text-lime-600"
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] xl:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className={ADMIN_TYPE.sectionTitle}>รอตรวจสอบ</h2>
                  <p className={cn("mt-1", ADMIN_TYPE.meta)}>
                    {list.length.toLocaleString()} รายการ
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-blue-50 text-primary shadow-sm">
                  <HiDocumentCheck className="h-5 w-5" />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-[18px] border border-slate-200/80 bg-slate-50"
                    />
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
                    <HiCheckCircle className="h-8 w-8 text-blue-400" />
                  </div>

                  <p className={ADMIN_TYPE.cardTitle}>
                    ไม่มีรายการรอตรวจสอบ
                  </p>
                  <p className={cn("mt-2", ADMIN_TYPE.body)}>
                    ตอนนี้ยังไม่มี KYC ที่ต้องดำเนินการ
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((item) => {
                    const isSelected = selected === item.user_id;
                    const statusStyle = STATUS_STYLES[item.status];
                    const Icon = statusStyle.icon;

                    return (
                      <li key={item.user_id}>
                        <button
                          type="button"
                          onClick={() => openDetail(item.user_id)}
                          className={cn(
                            "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors",
                            isSelected
                              ? "bg-blue-50/70"
                              : "hover:bg-slate-50/70",
                          )}
                        >
                          <Avatar name={item.full_name} />

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {item.full_name}
                              </p>

                              {isSelected ? (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                              ) : null}
                            </div>

                            <p className={cn("mt-1", ADMIN_TYPE.meta)}>
                              {formatDate(item.created_at)}
                            </p>

                            <p className="mt-1 truncate font-mono text-xs text-text-muted">
                              {item.citizen_id}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <StatusBadge status={item.status} />

                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-[12px]",
                                statusStyle.iconBg,
                                statusStyle.iconColor,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="xl:col-span-3">
              {!selected ? (
                <EmptyPanel
                  icon={HiUserCircle}
                  title="เลือกรายการเพื่อดูรายละเอียด"
                  description="คลิกรายการ KYC ทางด้านซ้ายเพื่อดูข้อมูลโปรไฟล์ เอกสาร และดำเนินการตรวจสอบ"
                />
              ) : detailLoading ? (
                <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  {[80, 120, 180, 120].map((height, index) => (
                    <div
                      key={index}
                      style={{ height }}
                      className="animate-pulse rounded-[18px] bg-slate-100"
                    />
                  ))}
                </div>
              ) : detail ? (
                <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary">
                          KYC Detail
                        </div>

                        <h2 className={ADMIN_TYPE.sectionTitle}>
                          {detail.profile.full_name}
                        </h2>

                        <p className={cn("mt-1", ADMIN_TYPE.meta)}>
                          User ID: {detail.user_id}
                        </p>
                      </div>

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-sm">
                        <HiIdentification className="h-7 w-7" />
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        ["หมายเลขบัตร", detail.profile.citizen_id],
                        ["วันเกิด", detail.profile.date_of_birth],
                        ["ประเทศ", detail.profile.country],
                        ["ที่อยู่", detail.profile.address],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] px-4 py-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                            {label}
                          </p>

                          <p className="mt-2 break-words text-sm font-semibold text-text-primary">
                            {value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="mb-4 flex items-center gap-2">
                      <HiDocumentText className="h-4 w-4 text-text-muted" />
                      <h3 className="text-sm font-semibold text-text-primary">
                        Documents
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DocumentPreview
                        label="บัตรประชาชน"
                        document={detail.id_card}
                      />

                      <DocumentPreview label="Selfie" document={detail.selfie} />
                    </div>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-text-primary">
                        หมายเหตุ / เหตุผล
                      </label>

                      <input
                        type="text"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="ระบุเหตุผล เช่น กรณีปฏิเสธหรือขอเอกสารเพิ่ม"
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleReview("APPROVED")}
                        className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-lime-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(132,204,22,0.18)] transition-colors hover:bg-lime-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HiCheckCircle className="h-4 w-4" />
                        อนุมัติ
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleReview("NEEDS_RESUBMISSION")}
                        className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(245,158,11,0.18)] transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HiArrowPath className="h-4 w-4" />
                        ขอเพิ่ม
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleReview("REJECTED")}
                        className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(225,29,72,0.16)] transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HiXCircle className="h-4 w-4" />
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyPanel
                  icon={HiExclamationTriangle}
                  title="ไม่พบรายละเอียด KYC"
                  description="ลองเลือกรายการใหม่ หรือกด Refresh เพื่อโหลดข้อมูลล่าสุด"
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}