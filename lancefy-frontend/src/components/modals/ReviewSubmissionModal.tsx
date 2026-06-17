import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import Button from "@/components/ui/Button";

type ReviewSubmissionModalProps = {
  open: boolean;
  milestoneTitle: string;
  submissionMessage?: string | null;
  loading?: boolean;
  onApprove: (message: string) => void;
  onReject: (message: string) => void;
  onCancel: () => void;
};

export default function ReviewSubmissionModal({
  open,
  milestoneTitle,
  submissionMessage,
  loading = false,
  onApprove,
  onReject,
  onCancel,
}: ReviewSubmissionModalProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setMessage("");
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">
            ตรวจงาน
          </h2>
          <p className="text-sm text-text-muted">
            Milestone: {milestoneTitle}
          </p>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-text-subtle mb-2">
            ข้อความจากฟรีแลนซ์
          </div>
          <div className="text-sm text-text-primary">
            {submissionMessage?.trim() || "-"}
          </div>
        </div>

        <div className="mt-5">
          <AutoResizeTextarea
            value={message}
            onChange={setMessage}
            placeholder="ให้ feedback หรือขอแก้ไข (ไม่บังคับ)"
            minRows={4}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            ยกเลิก
          </Button>

          <Button
            variant="danger"
            onClick={() => onReject(message)}
            isLoading={loading}
            className="flex-1"
          >
            ขอแก้ไข
          </Button>

          <Button
            onClick={() => onApprove(message)}
            isLoading={loading}
            className="flex-1"
          >
            อนุมัติ
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
