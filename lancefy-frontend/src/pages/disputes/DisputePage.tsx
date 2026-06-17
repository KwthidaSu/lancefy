import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { openDispute } from "@/services/dispute.service";
import { useToast } from "@/components/ui/Toast";

export default function DisputePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const projectId = searchParams.get("projectId") ?? "";
  const milestoneId = searchParams.get("milestoneId") ?? undefined;

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("กรุณาระบุเหตุผล", "error");
      return;
    }
    if (!projectId) {
      showToast("ไม่พบข้อมูล Project", "error");
      return;
    }
    try {
      setLoading(true);
      await openDispute({
        project_id: projectId,
        milestone_id: milestoneId || undefined,
        reason: reason.trim(),
      });
      showToast("เปิด Dispute สำเร็จ", "success");
      navigate(`/app/projects/${projectId}/workspace`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "เปิด Dispute ไม่สำเร็จ";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button
        onClick={() =>
          projectId
            ? navigate(`/app/projects/${projectId}/workspace`)
            : navigate(-1)
        }
        className="text-sm text-text-muted hover:text-primary-foreground"
      >
        ← กลับ
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            เปิด Dispute
          </h1>
          <p className="text-sm text-text-muted">
            แจ้งปัญหาเพื่อให้ Admin ช่วยตรวจสอบ
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <strong>ข้อควรทราบ:</strong> การเปิด Dispute จะหยุดกระบวนการทั้งหมดชั่วคราว
        Admin จะเข้ามาตรวจสอบและตัดสินใจภายใน 3-5 วันทำการ
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            เหตุผลในการเปิด Dispute{" "}
            <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="อธิบายปัญหาที่พบ เช่น งานไม่ตรงกับที่ตกลง, ไม่ได้รับการตอบสนอง..."
            rows={6}
            className="w-full rounded-lg border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-foreground/30"
          />
          <div className="mt-1 text-xs text-text-muted text-right">
            {reason.length} ตัวอักษร
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() =>
              projectId
                ? navigate(`/app/projects/${projectId}/workspace`)
                : navigate(-1)
            }
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary"
          >
            {t("common.cancel", "ยกเลิก")}
          </button>
          <button
            type="submit"
            disabled={loading || !reason.trim()}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-rose-700"
          >
            {loading ? "กำลังส่ง..." : "เปิด Dispute"}
          </button>
        </div>
      </form>
    </div>
  );
}
