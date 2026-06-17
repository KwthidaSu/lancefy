import { useNavigate } from "react-router-dom";
import { HiOutlineClock } from "react-icons/hi2";
import { useNotifications } from "@/context/NotificationContext";
import type { AppNotification } from "@/services/notification.service";

type Variant = "success" | "warning" | "error" | "info" | "default";

function getVariant(type: string): Variant {
  if (["proposal_accepted", "work_approved", "payment_released", "payout_processed", "kyc_approved", "deal_opened"].includes(type))
    return "success";
  if (["work_submitted", "payment_funded", "milestone_funded"].includes(type)) return "warning";
  if (["proposal_rejected", "work_rejected", "dispute_opened", "kyc_rejected"].includes(type))
    return "error";
  if (["proposal_received", "message_received", "project_created", "job_expired", "dispute_resolved"].includes(type))
    return "info";
  return "default";
}

const VARIANT_LINE: Record<Variant, string> = {
  success: "bg-lime-400",
  warning: "bg-yellow-400",
  error: "bg-red-400",
  info: "bg-blue-400",
  default: "bg-gray-300",
};

const VARIANT_DOT: Record<Variant, string> = {
  success: "bg-lime-500 ring-lime-100",
  warning: "bg-yellow-500 ring-yellow-100",
  error: "bg-red-500 ring-red-100",
  info: "bg-blue-500 ring-blue-100",
  default: "bg-gray-400 ring-gray-100",
};

const TYPE_LABEL: Record<string, string> = {
  proposal_received:  "ได้รับ Proposal ใหม่",
  proposal_accepted:  "Proposal ถูกยอมรับ",
  proposal_rejected:  "Proposal ถูกปฏิเสธ",
  proposal_withdrawn: "Proposal ถูกถอน",
  job_expired:        "Job หมดเวลา",
  deal_opened:        "เปิด Deal แล้ว",
  project_created:    "สร้างโปรเจกต์ใหม่",
  work_submitted:     "ส่งงานแล้ว",
  work_approved:      "งานได้รับการอนุมัติ",
  work_rejected:      "งานถูกขอแก้ไข",
  payment_funded:     "วาง Escrow แล้ว",
  payment_released:   "ปล่อยเงินสำเร็จ",
  payout_processed:   "โอนเงินให้ฟรีแลนซ์แล้ว",
  message_received:   "ได้รับข้อความ",
  kyc_approved:       "KYC ผ่านแล้ว",
  kyc_rejected:       "KYC ถูกปฏิเสธ",
  dispute_opened:     "มีการเปิด Dispute",
  dispute_resolved:   "Dispute ได้รับการตัดสินแล้ว",
};

function resolveLink(n: AppNotification): string | null {
  if (n.reference_type === "project" && n.reference_id)
    return `/app/projects/${n.reference_id}/manage`;
  if (n.reference_type === "proposal" && n.reference_id)
    return `/app/proposals/${n.reference_id}`;
  if (n.reference_type === "job" && n.reference_id)
    return `/app/jobs/${n.reference_id}`;
  if (n.reference_type === "dispute" && n.reference_id)
    return `/app/disputes/${n.reference_id}`;
  if (n.reference_type === "message") return "/app/messages";
  return null;
}

// Group notifications by calendar day
function groupByDay(items: AppNotification[]) {
  const map = new Map<string, AppNotification[]>();
  for (const n of items) {
    const day = new Date(n.created_at).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(n);
  }
  return map;
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const { notifications, loading } = useNotifications();

  // Summary stats derived from notifications
  const totalProjects = new Set(
    notifications
      .filter((n) => n.reference_type === "project" && n.reference_id)
      .map((n) => n.reference_id)
  ).size;
  const payments = notifications.filter(
    (n) => n.type === "payment_released"
  ).length;
  const offers = notifications.filter(
    (n) => n.type === "proposal_received"
  ).length;

  const grouped = groupByDay(notifications);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">ประวัติกิจกรรม</h1>
        <p className="text-sm text-text-muted">บันทึกกิจกรรมทั้งหมดของคุณบนแพลตฟอร์ม (ไม่สามารถแก้ไขได้)</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "กิจกรรมทั้งหมด", value: notifications.length, color: "text-text-primary" },
          { label: "โปรเจกต์", value: totalProjects, color: "text-blue-600" },
          { label: "การชำระเงิน", value: payments, color: "text-lime-600" },
          { label: "ข้อเสนอที่ได้รับ", value: offers, color: "text-purple-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <HiOutlineClock className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">ยังไม่มีกิจกรรม</p>
          <p className="text-sm text-gray-400">
            ประวัติกิจกรรมทั้งหมดของคุณจะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">
                {day}
              </p>

              <div className="relative space-y-0">
                {items.map((n, idx) => {
                  const variant = getVariant(n.type);
                  const link = resolveLink(n);
                  const isLast = idx === items.length - 1;

                  return (
                    <div key={n.id} className="flex gap-4">
                      {/* Timeline spine */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ring-4 flex-shrink-0 z-10 ${VARIANT_DOT[variant]}`}
                        />
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[2rem] ${VARIANT_LINE[variant]} opacity-30`} />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        onClick={() => link && navigate(link)}
                        className={`flex-1 pb-6 ${link ? "cursor-pointer" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-text-primary leading-snug">
                              {TYPE_LABEL[n.type] ?? n.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-text-secondary mt-0.5">
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-text-muted mt-0.5 italic">
                                {n.body}
                              </p>
                            )}
                          </div>
                          <p className="text-[10px] text-text-subtle whitespace-nowrap flex-shrink-0 mt-0.5">
                            {new Date(n.created_at).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
