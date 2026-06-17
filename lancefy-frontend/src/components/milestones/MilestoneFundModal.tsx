import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/ui/Toast";
import {
  fundMilestone,
  getFundMilestoneQuote,
  type FundMilestoneQuote,
} from "@/services/payments.service";
import type { MilestoneBoardItem } from "@/services/projects/project.types";

interface Props {
  projectId: string;
  milestone: MilestoneBoardItem;
  onSuccess: () => void;
  onClose: () => void;
}

const formatMoney = (amount: number, currency: string) =>
  `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

export default function MilestoneFundModal({
  projectId: _projectId,
  milestone,
  onSuccess,
  onClose,
}: Props) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quote, setQuote] = useState<FundMilestoneQuote | null>(null);

  const amount = Number(milestone.amount ?? 0);
  const currency = quote?.currency ?? milestone.currency ?? "THB";
  const totalChargeAmount = Number(quote?.total_charge_amount ?? amount);

  useEffect(() => {
    let mounted = true;

    const loadQuote = async () => {
      try {
        setQuoteLoading(true);
        const response = await getFundMilestoneQuote(milestone.id);
        if (!mounted) return;
        setQuote(response.data);
      } catch (err: unknown) {
        if (!mounted) return;
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? t("paymentsPage.fundMilestone.errors.quoteFailed");
        showToast(message, "error");
      } finally {
        if (mounted) setQuoteLoading(false);
      }
    };

    void loadQuote();

    return () => {
      mounted = false;
    };
  }, [milestone.id, showToast]);

  const handleConfirm = async () => {
    if (loading || quoteLoading) return;
    try {
      setLoading(true);
      await fundMilestone(milestone.id, amount);
      showToast(t("paymentsPage.fundMilestone.toast.success"), "success");
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("paymentsPage.fundMilestone.toast.error");
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary">{t("paymentsPage.fundMilestone.title")}</h2>

        <div className="space-y-1 rounded-lg border border-border bg-white p-4 text-sm">
          <div className="font-semibold text-text-primary">
            {milestone.title || t("paymentsPage.fundMilestone.untitled")}
          </div>
          {milestone.description && (
            <div className="text-text-muted">{milestone.description}</div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-text-primary">{t("paymentsPage.fundMilestone.summary.total")}</span>
            <span className="text-base font-bold text-text-primary">
              {quoteLoading ? t("loading") : formatMoney(totalChargeAmount, currency)}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {t("paymentsPage.fundMilestone.summary.includedFee", {
              defaultValue: "รวมค่าธรรมเนียมแล้ว",
            })}
          </p>
        </div>

        <p className="text-sm text-text-muted">
          {t("paymentsPage.fundMilestone.helper")}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || quoteLoading}
            className="rounded-lg bg-accent-foreground px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? t("paymentsPage.fundMilestone.actions.processing")
              : quoteLoading
                ? t("loading")
                : t("paymentsPage.fundMilestone.actions.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
