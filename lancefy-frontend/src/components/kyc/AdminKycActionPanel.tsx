import { useState } from "react";

type Props = {
  loading?: boolean;
  initialReason?: string | null;
  onApprove: (reason: string) => Promise<void> | void;
  onReject: (reason: string) => Promise<void> | void;
  onNeedResubmission: (reason: string) => Promise<void> | void;
};

export default function AdminKycActionPanel({
  loading,
  initialReason,
  onApprove,
  onReject,
  onNeedResubmission,
}: Props) {
  const [reason, setReason] = useState(initialReason ?? "");

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">ดำเนินการ</h2>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผล (ไม่บังคับ)"
        className="mb-4 min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-ring"
      />

      <div className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => onApprove(reason)}
          className="w-full rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          อนุมัติ
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onNeedResubmission(reason)}
          className="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ขอเอกสารใหม่
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onReject(reason)}
          className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ปฏิเสธ
        </button>
      </div>
    </section>
  );
}