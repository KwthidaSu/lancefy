import { useTranslation } from "react-i18next";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";

import KycDocumentPreview from "@/components/kyc/KycDocumentPreview";

type Props = {
  idCardUrl: string | null;
  selfieUrl: string | null;
  availableDocuments: number;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  submittingAction: "APPROVED" | "REJECTED" | null;
};

export default function KycReviewPanel({
  idCardUrl,
  selfieUrl,
  availableDocuments,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  submittingAction,
}: Props) {
  const { t } = useTranslation();

  const isSubmitting = submittingAction !== null;

  return (
    <section className="rounded-[24px] border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t("adminKyc.detail.documents.title")}
        </h2>
      </div>

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <KycDocumentPreview
            title={t("adminKyc.detail.documents.idCard")}
            imageUrl={idCardUrl}
          />
          <KycDocumentPreview
            title={t("adminKyc.detail.documents.selfie")}
            imageUrl={selfieUrl}
          />
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t("adminKyc.detail.review.title")}
        </h2>
      </div>

      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("adminKyc.detail.review.documentsLabel")}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {availableDocuments === 2
                  ? t("adminKyc.detail.review.documentsComplete")
                  : t("adminKyc.detail.review.documentsIncomplete")}
              </div>
            </div>

            <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground">
              {availableDocuments}/2
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            {t("adminKyc.detail.review.reasonLabel")}
          </span>

          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder={t("adminKyc.detail.review.reasonPlaceholder")}
            disabled={isSubmitting}
            className="mt-2 min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-text-secondary focus:border-foreground/20 focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={onApprove}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-lime-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HiCheckCircle className="h-5 w-5" />
            {submittingAction === "APPROVED"
              ? t("adminKyc.detail.actions.processing")
              : t("adminKyc.detail.actions.approve")}
          </button>

          <button
            onClick={onReject}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HiXCircle className="h-5 w-5" />
            {submittingAction === "REJECTED"
              ? t("adminKyc.detail.actions.processing")
              : t("adminKyc.detail.actions.reject")}
          </button>
        </div>

        <p className="text-xs leading-5 text-text-secondary">
          {t("adminKyc.detail.review.helper")}
        </p>
      </div>
    </section>
  );
}