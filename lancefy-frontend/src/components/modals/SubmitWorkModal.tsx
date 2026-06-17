import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import Button from "@/components/ui/Button";

type SubmitWorkModalProps = {
  open: boolean;
  milestoneTitle: string;
  loading?: boolean;
  onSubmit: (message: string) => void;
  onCancel: () => void;
};

export default function SubmitWorkModal({
  open,
  milestoneTitle,
  loading = false,
  onSubmit,
  onCancel,
}: SubmitWorkModalProps) {
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
            ส่งงาน
          </h2>
          <p className="text-sm text-text-muted">
            Milestone: {milestoneTitle}
          </p>
        </div>

        <div className="mt-5">
          <AutoResizeTextarea
            value={message}
            onChange={setMessage}
            placeholder="ใส่รายละเอียดงานที่ส่งหรือหมายเหตุ (ไม่บังคับ)"
            minRows={4}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            ยกเลิก
          </Button>

          <Button
            onClick={() => onSubmit(message)}
            isLoading={loading}
            className="flex-1"
          >
            ส่งงาน
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
