import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Send, X, Check } from "lucide-react";
import { getProposal, acceptProposal, rejectProposal, withdrawProposal } from "@/services/jobs.service";
import type { Proposal } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { formatDbDate } from "@/utils/date";
import { clsx } from "clsx";

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted:  "bg-lime-50 text-lime-700 border-lime-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};
const STATUS_LABEL: Record<string, string> = {
  pending:   "รอตอบรับ",
  accepted:  "รับแล้ว ✅",
  rejected:  "ถูกปฏิเสธ",
  withdrawn: "ถอนแล้ว",
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const currentUserId = keycloak.tokenParsed?.sub;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getProposal(id)
      .then((res) => { if (alive) setProposal(res.data); })
      .catch(() => { if (alive) setProposal(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const handleAccept = async () => {
    if (!id || !proposal) return;
    setActionLoading(true);
    try {
      const res = await acceptProposal(id);
      showToast(t("project.managePage.offers.dealAcceptedToast"), "success");
      if (res.data.project_id) {
        const query = new URLSearchParams({ tab: "chat" });
        if (res.data.project_chat_room_id) {
          query.set("roomId", res.data.project_chat_room_id);
        }
        navigate(`/app/projects/${res.data.project_id}/manage?${query.toString()}`);
      } else if (res.data.deal_chat_room_id || res.data.project_chat_room_id) {
        const roomId = res.data.deal_chat_room_id ?? res.data.project_chat_room_id;
        navigate(`/app/messages?roomId=${roomId}`);
      } else {
        navigate("/app/proposals");
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail ?? "รับข้อเสนอไม่สำเร็จ", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await rejectProposal(id, rejectReason.trim() || undefined);
      setProposal(res.data);
      showToast("ปฏิเสธข้อเสนอแล้ว", "success");
      setShowRejectForm(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail ?? "ปฏิเสธไม่สำเร็จ", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!id || !confirm("ต้องการถอนข้อเสนอนี้ใช่หรือไม่?")) return;
    setActionLoading(true);
    try {
      const res = await withdrawProposal(id);
      setProposal(res.data);
      showToast("ถอนข้อเสนอสำเร็จ", "success");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail ?? "ถอนข้อเสนอไม่สำเร็จ", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse">กำลังโหลด...</div>;
  }

  if (!proposal) {
    return <div className="p-8 text-center text-text-muted">ไม่พบข้อเสนอ</div>;
  }

  const isOwner = proposal.client_id === currentUserId;
  const isProposer = proposal.proposer_id === currentUserId;
  const isPending = proposal.status === "pending";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-primary transition"
      >
        <ChevronLeft className="w-4 h-4" />
        กลับ
      </button>

      <div className="rounded-xl border border-border bg-white p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-text-primary">รายละเอียดข้อเสนอ</h1>
          <span className={clsx("text-xs border px-2.5 py-0.5 rounded-full font-medium", STATUS_STYLE[proposal.status])}>
            {STATUS_LABEL[proposal.status] ?? proposal.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Freelancer</p>
            <p className="font-medium">{proposal.freelancer.display_name ?? proposal.freelancer.username}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Client</p>
            <p className="font-medium">{proposal.client.display_name ?? proposal.client.username}</p>
          </div>
          {proposal.proposed_budget && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">งบที่เสนอ</p>
              <p className="font-semibold text-lime-600">฿{Number(proposal.proposed_budget).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted mb-0.5">วันที่ส่ง</p>
            <p>{formatDbDate(proposal.created_at)}</p>
          </div>
        </div>

        {proposal.message && (
          <div className="space-y-1">
            <p className="text-xs text-text-muted font-medium">ข้อความ</p>
            <p className="text-sm text-text-primary whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
              {proposal.message}
            </p>
          </div>
        )}

        {proposal.rejection_reason && (
          <div className="space-y-1 text-sm">
            <p className="text-xs text-text-muted font-medium">เหตุผลที่ปฏิเสธ</p>
            <p className="text-red-600 bg-red-50 rounded-lg p-3">{proposal.rejection_reason}</p>
          </div>
        )}

        {proposal.job_id && (
          <button
            onClick={() => navigate(`/app/jobs/${proposal.job_id}`)}
            className="text-sm text-primary underline"
          >
            ดูงานต้นทาง →
          </button>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="space-y-3">
          {/* Job owner can accept/reject */}
          {isOwner && !showRejectForm && (
            <div className="flex gap-3">
              <button
                disabled={actionLoading}
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-accent text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                รับข้อเสนอ
              </button>
              <button
                disabled={actionLoading}
                onClick={() => setShowRejectForm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                ปฏิเสธ
              </button>
            </div>
          )}

          {isOwner && showRejectForm && (
            <div className="rounded-xl border border-border bg-white p-5 space-y-3">
              <h3 className="font-medium text-text-primary text-sm">ระบุเหตุผล (ถ้ามี)</h3>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                placeholder="บอกเหตุผลให้ผู้เสนองานทราบ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition disabled:opacity-50"
                >
                  {actionLoading ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ"}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:border-accent/60 transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {/* Proposer can withdraw */}
          {isProposer && (
            <button
              disabled={actionLoading}
              onClick={handleWithdraw}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4 rotate-180" />
              ถอนข้อเสนอ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
