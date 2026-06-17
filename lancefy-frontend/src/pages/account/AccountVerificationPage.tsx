import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import { fetchKycStatus, getStoredKycStatusFallback } from "@/services/kyc/kyc";
import type { KycStatus } from "@/services/kyc/kyc.types";

type StatusState = {
  status: KycStatus;
  reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
};

type StepItem = {
  label: string;
  done: boolean;
};

function formatDateTime(value?: string | null, fallback = "Not available yet") {
  if (!value) return fallback;

  return new Date(value).toLocaleString();
}

export default function AccountVerificationPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const fallback = useMemo(() => getStoredKycStatusFallback(), []);
  const [data, setData] = useState<StatusState | null>(
    fallback
      ? {
          status: fallback.status,
          reason: fallback.reason,
          submitted_at: fallback.submitted_at,
          reviewed_at: fallback.reviewed_at,
        }
      : null
  );
  const [loading, setLoading] = useState(!fallback);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchKycStatus();
        setData(response.data);
      } catch (error) {
        console.error("Failed to load KYC status", error);
        if (!fallback) {
          setData({ status: "not_submitted" });
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fallback]);

  const status = data?.status ?? "not_submitted";

  const statusMeta = {
    not_submitted: {
      iconWrap: "bg-slate-100 text-slate-600",
      icon: ShieldCheck,
      statusLabel: t("accountSettings.verification.status.notSubmitted"),
      title: t("accountSettings.verification.notSubmitted.title"),
      description: t("accountSettings.verification.notSubmitted.description"),
      nextSteps: [
        "Complete your personal details",
        "Upload your ID card and selfie",
        "Submit your verification package",
      ],
      steps: [
        { label: "Submit documents", done: false },
        { label: "Identity review", done: false },
        { label: "Approval", done: false },
      ] as StepItem[],
    },
    under_review: {
      iconWrap: "bg-amber-100 text-amber-700",
      icon: Clock3,
      statusLabel: t("accountSettings.verification.status.underReview"),
      title: t("accountSettings.verification.status.underReview"),
      description: "Your documents are in the review queue. We will notify you once the review is complete.",
      nextSteps: [
        "Wait for the compliance review",
        "Watch for review notes or resubmission requests",
        "Prepare your payout setup after approval",
      ],
      steps: [
        { label: "Submit documents", done: true },
        { label: "Identity review", done: false },
        { label: "Approval", done: false },
      ] as StepItem[],
    },
    approved: {
      iconWrap: "bg-[rgb(var(--primary)/0.1)] text-primary",
      icon: CheckCircle2,
      statusLabel: t("accountSettings.verification.status.approved"),
      title: t("accountSettings.verification.status.approved"),
      description: "Your account is verified and ready for all freelancer features.",
      nextSteps: [
        "Set up your payout method",
        "Complete your freelancer profile",
        "Start accepting jobs",
      ],
      steps: [
        { label: "Submit documents", done: true },
        { label: "Identity review", done: true },
        { label: "Approval", done: true },
      ] as StepItem[],
    },
    needs_resubmission: {
      iconWrap: "bg-amber-100 text-amber-700",
      icon: AlertTriangle,
      statusLabel: t("accountSettings.verification.status.needsResubmission"),
      title: t("accountSettings.verification.status.needsResubmission"),
      description: "Update the requested details and submit your verification again to continue.",
      nextSteps: [
        "Read the review note carefully",
        "Prepare clearer or corrected documents",
        "Resubmit the verification flow",
      ],
      steps: [
        { label: "Submit documents", done: true },
        { label: "Identity review", done: true },
        { label: "Approval", done: false },
      ] as StepItem[],
    },
    rejected: {
      iconWrap: "bg-rose-100 text-rose-700",
      icon: AlertTriangle,
      statusLabel: t("accountSettings.verification.status.rejected"),
      title: t("accountSettings.verification.status.rejected"),
      description: "This submission was not approved. Please review the note and submit a corrected verification package.",
      nextSteps: [
        "Review the rejection note",
        "Update your identity information",
        "Submit a new verification package",
      ],
      steps: [
        { label: "Submit documents", done: true },
        { label: "Identity review", done: true },
        { label: "Approval", done: false },
      ] as StepItem[],
    },
  }[status];

  const StatusIcon = statusMeta.icon;
  const showKycCta = status === "not_submitted" || status === "needs_resubmission" || status === "rejected";
  const ctaLabel =
    status === "not_submitted"
      ? "Start KYC verification"
      : "Continue KYC submission";

  return (
    <div className="-m-6 min-h-screen w-auto space-y-6 bg-background p-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          {t("accountSettings.verification.title")}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Review your current KYC status and verification details
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Verification status
          </p>

          <div className="mt-6 flex items-start gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${statusMeta.iconWrap}`}
            >
              <StatusIcon className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                {statusMeta.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                {statusMeta.description}
              </p>

              {showKycCta ? (
                <button
                  type="button"
                  onClick={() => navigate("/app/account/verification/start")}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="grid gap-5 text-sm sm:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-slate-500">Current Status</p>
              <p className="font-medium text-primary">{statusMeta.statusLabel}</p>

              <p className="text-slate-500">Submitted At</p>
              <p className="font-medium text-slate-900">
                {formatDateTime(
                  data?.submitted_at,
                  t("accountSettings.verification.summary.notAvailable")
                )}
              </p>

              <p className="text-slate-500">Reviewed At</p>
              <p className="font-medium text-slate-900">
                {formatDateTime(
                  data?.reviewed_at,
                  t("accountSettings.verification.summary.notAvailable")
                )}
              </p>

              <p className="text-slate-500">Document Type</p>
              <p className="font-medium text-slate-900">Government-issued ID</p>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Verification steps
          </p>

          <div className="mt-5 space-y-4">
            {statusMeta.steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3 text-sm text-slate-700">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step.done
                      ? "bg-accent text-primary"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              What's next
            </p>

            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {statusMeta.nextSteps.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          Review note
        </p>
        <p className="mt-4 text-sm leading-6 text-text-secondary">
          {loading
            ? t("loading")
            : data?.reason?.trim() ||
              t("accountSettings.verification.summary.noReviewNote")}
        </p>
      </section>
    </div>
  );
}
