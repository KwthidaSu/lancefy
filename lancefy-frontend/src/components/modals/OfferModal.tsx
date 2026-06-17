import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import Input from "@/components/ui/Input";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import Button from "@/components/ui/Button";

type OfferModalProps = {
  open: boolean;
  currency: string;
  projectBudget?: number | null;
  loading?: boolean;
  readOnly?: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  showMessage?: boolean;
  initialMessage?: string;
  initialMilestones?: {
    title: string;
    amount: number;
    estimated_days?: number;
    description?: string;
  }[];
  onSubmit: (
    budget: number,
    message: string,
    milestones: {
      title: string;
      amount: number;
      estimated_days: number;
      description?: string;
    }[]
  ) => void;
  onCancel: () => void;
};

type MilestoneDraft = {
  id: string;
  title: string;
  amount: string;
  description: string;
  estimatedDays: string;
};

export default function OfferModal({
  open,
  currency,
  projectBudget,
  loading = false,
  readOnly = false,
  title,
  subtitle,
  submitLabel,
  showMessage = true,
  initialMessage = "",
  initialMilestones,
  onSubmit,
  onCancel,
}: OfferModalProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setMessage(initialMessage);
    if (initialMilestones?.length) {
      setMilestones(
        initialMilestones.map((item, idx) => ({
          id: `ms-${Date.now()}-${idx + 1}`,
          title: item.title ?? "",
          amount: Number(item.amount ?? 0).toString(),
          description: item.description ?? "",
          estimatedDays: item.estimated_days != null ? String(item.estimated_days) : "",
        }))
      );
      return;
    }
    setMilestones([
      {
        id: `ms-${Date.now()}`,
        title: "",
        amount: "",
        description: "",
        estimatedDays: "",
      },
    ]);
  }, [open, initialMessage, initialMilestones]);

  if (!open) return null;

  const normalized = milestones.map((m) => ({
    title: m.title.trim(),
    amount: Number(m.amount),
    estimated_days: Number(m.estimatedDays),
    description: m.description.trim() || undefined,
  }));
  const totalBudget = normalized.reduce(
    (sum, m) => sum + (Number.isFinite(m.amount) ? m.amount : 0),
    0
  );
  const hasProjectBudget = Number.isFinite(Number(projectBudget));
  const numericProjectBudget = hasProjectBudget ? Number(projectBudget) : 0;
  const remainingBudget = numericProjectBudget - totalBudget;
  const exceedsProjectBudget = hasProjectBudget && totalBudget > numericProjectBudget;
  const budgetMismatch =
    hasProjectBudget && Math.abs(totalBudget - numericProjectBudget) > 0.0001;
  const hasInvalid =
    normalized.length === 0 ||
    normalized.some(
      (m) =>
        !m.title ||
        !Number.isFinite(m.amount) ||
        m.amount <= 0 ||
        !Number.isFinite(m.estimated_days) ||
        m.estimated_days <= 0
    );
  const canSubmit = !hasInvalid && !exceedsProjectBudget && !budgetMismatch;
  const formatAmount = (value: number) => Number(value || 0).toLocaleString();

  const updateMilestone = (id: string, patch: Partial<MilestoneDraft>) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        id: `ms-${Date.now()}-${prev.length + 1}`,
        title: "",
        amount: "",
        description: "",
        estimatedDays: "",
      },
    ]);
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== id)));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">
            {title ?? t("project.offerModal.title")}
          </h2>
          <p className="text-sm text-text-muted">
            {subtitle ?? t("project.offerModal.subtitle")}
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">
                {t("project.offerModal.milestonesTitle")}
              </div>
              <button
                type="button"
                onClick={addMilestone}
                disabled={readOnly}
                className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("project.offerModal.addMilestone")}
              </button>
            </div>

            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div key={m.id} className="rounded-xl border border-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-text-primary">
                      {t("project.offerModal.milestoneTitle", { number: idx + 1 })}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      disabled={readOnly || milestones.length <= 1}
                      className="text-xs text-text-muted hover:text-text-primary disabled:opacity-40"
                    >
                      {t("project.offerModal.removeMilestone")}
                    </button>
                  </div>

                  <Input
                    value={m.title}
                    onChange={(e) =>
                      updateMilestone(m.id, { title: e.target.value })
                    }
                    disabled={readOnly}
                    placeholder={t("project.offerModal.titlePlaceholder")}
                    className="h-10"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-text-muted mb-2">
                        {t("project.offerModal.budgetLabel")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={m.amount}
                          onChange={(e) =>
                            updateMilestone(m.id, { amount: e.target.value })
                          }
                          disabled={readOnly}
                          placeholder={t("project.offerModal.budgetPlaceholder")}
                          className="h-10 flex-1"
                        />
                        <span className="text-xs text-text-muted">
                          {currency}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-2">
                        {t("project.offerModal.durationLabel")}
                      </div>
                      <Input
                        type="number"
                        value={m.estimatedDays}
                        onChange={(e) =>
                          updateMilestone(m.id, { estimatedDays: e.target.value })
                        }
                        disabled={readOnly}
                        placeholder={t("project.offerModal.durationPlaceholder")}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-text-muted mb-2">
                      {t("project.offerModal.detailLabel")}
                    </div>
                    <AutoResizeTextarea
                      value={m.description}
                      onChange={(value) =>
                        updateMilestone(m.id, { description: value })
                      }
                      disabled={readOnly}
                      placeholder={t("project.offerModal.detailPlaceholder")}
                      minRows={3}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm space-y-2">
              {hasProjectBudget && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">
                    {t("project.offerModal.projectBudget", { defaultValue: "Project Budget" })}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {formatAmount(numericProjectBudget)} {currency}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-text-muted">
                  {t("project.offerModal.totalBudget")}
                </span>
                <span className="font-semibold text-text-primary">
                  {formatAmount(totalBudget)} {currency}
                </span>
              </div>
              {hasProjectBudget && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">
                    {t("project.offerModal.remainingAfterProposed", {
                      defaultValue: "Remain After Proposed Budget",
                    })}
                  </span>
                  <span
                    className={`font-semibold ${
                      remainingBudget < 0 ? "text-danger" : "text-lime-700"
                    }`}
                  >
                    {formatAmount(remainingBudget)} {currency}
                  </span>
                </div>
              )}
              {exceedsProjectBudget && (
                <div className="text-xs font-medium text-danger">
                  {t("project.offerModal.exceedsProjectBudget", {
                    defaultValue: "Proposed budget exceeds project budget.",
                  })}
                </div>
              )}
              {budgetMismatch && !exceedsProjectBudget && (
                <div className="text-xs font-medium text-danger">
                  {t("project.offerModal.mustMatchProjectBudget", {
                    defaultValue: "Total milestone amount must equal project budget.",
                  })}
                </div>
              )}
            </div>
          </div>

          {showMessage && (
            <div>
              <div className="text-xs text-text-muted mb-2">
                {t("project.offerModal.messageLabel")}
              </div>
              <AutoResizeTextarea
                value={message}
                onChange={setMessage}
                disabled={readOnly}
                placeholder={t("project.offerModal.messagePlaceholder")}
                minRows={4}
              />
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="mt-6 flex flex-wrap gap-3 z-100 sticky">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              {t("project.offerModal.cancel")}
            </Button>

            <Button
              onClick={() => canSubmit && onSubmit(totalBudget, message, normalized)}
              isLoading={loading}
              disabled={!canSubmit}
              className="flex-1"
            >
              {submitLabel ?? t("project.offerModal.submit")}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
