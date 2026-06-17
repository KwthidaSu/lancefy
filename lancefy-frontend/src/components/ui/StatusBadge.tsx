import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-lime-100 text-lime-700 border-lime-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  submitted: {
    label: "Submitted",
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  under_review: {
    label: "Under Review",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  done: {
    label: "Done",
    className: "bg-lime-100 text-lime-700 border-lime-200",
  },
  completed: {
    label: "Completed",
    className: "bg-lime-100 text-lime-700 border-lime-200",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-500 border-red-200",
  },
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
  PENDING: {
    label: "รอตรวจสอบ",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  UNDER_REVIEW: {
    label: "รอตรวจสอบ",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "อนุมัติแล้ว",
    className: "bg-lime-100 text-lime-700 border-lime-200",
  },
  REJECTED: {
    label: "ปฏิเสธ",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  NEEDS_RESUBMISSION: {
    label: "ให้ส่งใหม่",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  const { t } = useTranslation("common");
  const normalized = String(status || "").trim();

  const config =
    statusConfig[normalized] ??
    statusConfig[normalized.toLowerCase()] ?? {
      label: normalized || "-",
      className: "bg-gray-100 text-gray-600 border-gray-200",
    };

  const localizedLabel =
    label ??
    (normalized === "PENDING"
      ? t("adminKyc.list.status.pending")
      : normalized === "APPROVED"
      ? t("adminKyc.list.status.approved")
      : normalized === "REJECTED"
      ? t("adminKyc.list.status.rejected")
      : normalized === "NEEDS_RESUBMISSION"
      ? t("adminKyc.list.status.needsResubmission")
      : config.label);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        config.className,
        className
      )}
    >
      {localizedLabel}
    </span>
  );
}
