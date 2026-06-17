import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineScale,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineDocumentText,
  HiOutlinePaperClip,
  HiOutlineCalendarDays,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
} from "react-icons/hi2";
import {
  getDispute,
  listDisputeMessages,
  sendDisputeMessage,
  type DisputeResponse,
  type DisputeMessage,
} from "@/services/dispute.service";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; badge: string; bg: string; icon: React.ReactNode }> = {
  open:      { label: "รอดำเนินการ",   badge: "bg-amber-500 text-white",   bg: "bg-amber-500",   icon: <HiOutlineClock className="w-4 h-4" /> },
  reviewing: { label: "กำลังพิจารณา", badge: "bg-blue-500 text-white",    bg: "bg-blue-500",    icon: <HiOutlineEye className="w-4 h-4" /> },
  resolved:  { label: "ตัดสินแล้ว",   badge: "bg-lime-500 text-white", bg: "bg-lime-500", icon: <HiOutlineCheckCircle className="w-4 h-4" /> },
  rejected:  { label: "ปฏิเสธแล้ว",   badge: "bg-red-500 text-white",     bg: "bg-red-500",     icon: <HiOutlineXCircle className="w-4 h-4" /> },
};

const REASON_LABELS: Record<string, string> = {
  work_not_as_described:   "งานไม่ตรงสเปค",
  work_incomplete:         "งานส่งไม่ครบ",
  work_poor_quality:       "คุณภาพต่ำกว่าที่ระบุ",
  freelancer_unresponsive: "Freelancer หายตัว",
  missed_deadline:         "ส่งงานช้า",
  scope_changed:           "Client เปลี่ยน Scope",
  client_unresponsive:     "Client ไม่ตอบกลับ",
  unfair_rejection:        "Reject โดยไม่มีเหตุผล",
  cancellation_dispute:    "ต้องการยกเลิก Project",
  payment_not_released:    "ไม่ชำระ Milestone",
  other:                   "อื่นๆ",
};

const RESOLUTION_LABELS: Record<string, string> = {
  release:           "ปล่อยเงินให้ Freelancer",
  refund:            "คืนเงินให้ Client",
  extend_deadline:   "ขยาย Deadline",
  force_approve:     "Approve งานโดย Admin",
  terminate_project: "ยุติ Project",
  rejected:          "ปฏิเสธ Dispute",
};

function fmt(d: string, withTime = false) {
  return new Date(d).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">{label}</p>
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DisputeDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [dispute, setDispute] = useState<DisputeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // messages
  const [messages, setMessages]   = useState<DisputeMessage[]>([]);
  const [msgText, setMsgText]     = useState("");
  const [sending, setSending]     = useState(false);
  const msgBottomRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getDispute(id),
      listDisputeMessages(id),
    ])
      .then(([dRes, mRes]) => {
        setDispute(dRes.data);
        setMessages(mRes.data);
      })
      .catch(() => setError("ไม่พบ dispute หรือคุณไม่มีสิทธิ์เข้าถึง"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!id || !msgText.trim()) return;
    setSending(true);
    try {
      const res = await sendDisputeMessage(id, msgText.trim());
      setMessages((prev) => [...prev, res.data]);
      setMsgText("");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[80, 160, 120].map((h, i) => (
          <div key={i} style={{ height: h }} className="rounded-2xl bg-surface border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/app/disputes")}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> กลับไปรายการ
        </button>
        <div className="flex items-start gap-3 p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
          <HiOutlineXCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error ?? "ไม่พบข้อมูล"}</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CFG[dispute.status] ?? STATUS_CFG.open;
  const isResolved = dispute.status === "resolved" || dispute.status === "rejected";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

      {/* ── Back ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/app/disputes")}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors font-medium"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> กลับไปรายการ
        </button>
        <span className="text-text-muted">·</span>
        <Link
          to={`/app/projects/${dispute.project_id}/manage`}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          ดูโปรเจกต์
        </Link>
      </div>

      {/* ── Header card ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Color bar */}
        <div className={`${cfg.bg} h-1.5 w-full`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-surface-hover flex items-center justify-center shrink-0">
                <HiOutlineScale className="w-5 h-5 text-text-muted" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary leading-tight">
                  {dispute.project_title ?? `Project #${dispute.project_id.slice(0, 8)}`}
                </h1>
                {dispute.milestone_title && (
                  <p className="text-sm text-text-muted mt-0.5">Milestone: {dispute.milestone_title}</p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
                  <HiOutlineCalendarDays className="w-3.5 h-3.5 shrink-0" />
                  เปิดเมื่อ {fmt(dispute.created_at)}
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${cfg.badge}`}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Details ──────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm divide-y divide-border/60">
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label="เหตุผลหลัก">
            <span className="font-semibold">{REASON_LABELS[dispute.reason] ?? dispute.reason}</span>
          </Field>
          <Field label="สถานะ">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
              {cfg.icon} {cfg.label}
            </span>
          </Field>
          {dispute.reason_detail && (
            <div className="col-span-2">
              <Field label="รายละเอียดเพิ่มเติม">
                <p className="leading-relaxed text-text-secondary">{dispute.reason_detail}</p>
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* ── Resolution result ────────────────────────────────────────── */}
      {isResolved && dispute.resolution && (
        <div className={`${cfg.bg} rounded-2xl p-5 shadow-sm`}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {cfg.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-white">ผลการตัดสินใจ</p>
              <p className="text-base font-semibold text-white mt-0.5">
                {RESOLUTION_LABELS[dispute.resolution] ?? dispute.resolution}
              </p>
              {dispute.resolution_note && (
                <p className="text-sm text-white/80 mt-1 leading-relaxed">{dispute.resolution_note}</p>
              )}
              {dispute.new_due_date && dispute.resolution === "extend_deadline" && (
                <p className="text-sm text-white/90 mt-1 flex items-center gap-1.5 font-medium">
                  <HiOutlineCalendarDays className="w-4 h-4" />
                  กำหนดใหม่: {new Date(dispute.new_due_date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {dispute.resolved_at && (
                <p className="text-xs text-white/60 mt-2 flex items-center gap-1">
                  <HiOutlineCalendarDays className="w-3.5 h-3.5" />
                  ตัดสินเมื่อ {fmt(dispute.resolved_at, true)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Evidence ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineDocumentText className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-bold text-text-primary">
            หลักฐาน
            {dispute.evidences.length > 0 && (
              <span className="ml-2 text-[11px] font-semibold bg-primary text-white rounded-full px-2 py-0.5">
                {dispute.evidences.length}
              </span>
            )}
          </h2>
        </div>

        {dispute.evidences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface border border-border rounded-2xl gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
              <HiOutlineDocumentText className="w-6 h-6 text-text-muted opacity-30" />
            </div>
            <p className="text-sm text-text-muted">ยังไม่มีหลักฐานที่ส่งมา</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/60">
            {dispute.evidences.map((ev) => (
              <div key={ev.id} className="p-4 hover:bg-surface-hover/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-text-muted bg-surface-hover px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    {ev.type}
                  </span>
                  <span className="text-xs font-semibold text-text-primary">
                    {ev.submitter_name ?? ev.submitter_username ?? `#${ev.submitted_by.slice(0, 8)}`}
                  </span>
                  <span className="text-xs text-text-muted ml-auto flex items-center gap-1">
                    <HiOutlineCalendarDays className="w-3 h-3" />
                    {fmt(ev.created_at)}
                  </span>
                </div>
                {ev.content && (
                  <p className="text-sm text-text-secondary leading-relaxed">{ev.content}</p>
                )}
                {ev.file_id && (
                  <p className="text-xs text-primary mt-2 flex items-center gap-1.5 font-medium">
                    <HiOutlinePaperClip className="w-3.5 h-3.5" />
                    ไฟล์แนบ: {ev.file_id}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Message Thread ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-bold text-text-primary">
            ข้อความจาก Admin
            {messages.length > 0 && (
              <span className="ml-2 text-[11px] font-semibold bg-primary text-white rounded-full px-2 py-0.5">
                {messages.length}
              </span>
            )}
          </h2>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <HiOutlineChatBubbleLeftRight className="w-8 h-8 text-text-muted opacity-30" />
                <p className="text-sm text-text-muted">ยังไม่มีข้อความ</p>
                {!isResolved && (
                  <p className="text-xs text-text-muted opacity-70">Admin อาจขอข้อมูลเพิ่มเติมผ่านช่องทางนี้</p>
                )}
              </div>
            ) : (
              messages.map((msg) => {
                const isInfoRequest = msg.message_type === "info_request";
                return (
                  <div
                    key={msg.id}
                    className={`p-4 ${isInfoRequest ? "bg-amber-50/60 border-l-4 border-l-amber-400" : "hover:bg-surface-hover/40"} transition-colors`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {isInfoRequest && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                          ขอข้อมูลเพิ่ม
                        </span>
                      )}
                      <span className={`text-xs font-semibold ${msg.is_admin ? "text-primary" : "text-text-primary"}`}>
                        {msg.sender_name ?? msg.sender_username ?? "ไม่ระบุ"}
                        {msg.is_admin && <span className="ml-1 text-[10px] font-bold text-primary">(Admin)</span>}
                      </span>
                      <span className="text-xs text-text-muted ml-auto flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3 h-3" />
                        {fmt(msg.created_at, true)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                );
              })
            )}
            <div ref={msgBottomRef} />
          </div>

          {!isResolved && (
            <div className="p-3 border-t border-border bg-surface flex gap-2 items-end">
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="ตอบกลับ admin... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-border bg-white text-sm px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleSend}
                disabled={!msgText.trim() || sending}
                className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0"
              >
                <HiOutlinePaperAirplane className="w-4 h-4" />
                ส่ง
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
