import { useEffect, useMemo, useState } from "react"
import {
  Clock3,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import Button from "@/components/ui/Button"
import { fetchKycStatus } from "@/services/kyc/kyc"
import type { KycStatus } from "@/services/kyc/kyc.types"

type FallbackKycStatus = {
  status: KycStatus
  reason: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

export default function KycStatusPage() {
  const navigate = useNavigate()
  const { t } = useTranslation("common")

  const fallback = useMemo<FallbackKycStatus | null>(() => {
    try {
      const raw = sessionStorage.getItem("kyc_status_fallback")
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [])

  const [status, setStatus] = useState<KycStatus | null>(
    fallback?.status ?? null
  )
  const [reason, setReason] = useState<string | null>(
    fallback?.reason ?? null
  )
  const [submittedAt, setSubmittedAt] = useState<string | null>(
    fallback?.submittedAt ?? null
  )
  const [reviewedAt, setReviewedAt] = useState<string | null>(
    fallback?.reviewedAt ?? null
  )
  const [loading, setLoading] = useState(!fallback)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetchKycStatus()
        const data = res.data

        setStatus(data.status)
        setReason(data.reason ?? null)
        setSubmittedAt(data.submitted_at ?? null)
        setReviewedAt(data.reviewed_at ?? null)
        setFetchFailed(false)

        sessionStorage.setItem(
          "kyc_status_fallback",
          JSON.stringify({
            status: data.status,
            reason: data.reason ?? null,
            submittedAt: data.submitted_at ?? null,
            reviewedAt: data.reviewed_at ?? null,
          })
        )

        if (data.status === "not_submitted") {
          sessionStorage.removeItem("kyc_status_fallback")
          navigate("/app/kyc", { replace: true })
          return
        }

        if (data.status === "approved") {
          sessionStorage.removeItem("kyc_status_fallback")
          navigate("/app/dashboard", { replace: true })
          return
        }
      } catch (error) {
        console.error("Failed to fetch KYC status:", error)
        setFetchFailed(true)

        if (!fallback) {
          navigate("/app/dashboard", { replace: true })
          return
        }
      } finally {
        setLoading(false)
      }
    }

    loadStatus()
  }, [navigate, fallback])

  if (loading || !status) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm md:p-10">
            <div className="text-center text-muted-foreground">
              {t("kycStatus.loading")}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === "needs_resubmission" || status === "rejected") {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm md:p-10">
            {fetchFailed && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">
                  Unable to refresh the latest KYC status right now. Showing the
                  most recent saved status.
                </p>
              </div>
            )}

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-8 w-8 text-amber-700" />
              </div>

              <h1 className="text-3xl font-bold text-foreground">
                {t("kycStatus.attention.title")}
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {t("kycStatus.attention.description")}
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  {t("kycStatus.attention.reviewDetails")}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      {t("kycStatus.labels.status")}
                    </span>{" "}
                    {status === "needs_resubmission"
                      ? t("kycStatus.statuses.needsResubmission")
                      : t("kycStatus.statuses.rejected")}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("kycStatus.labels.reviewedAt")}
                    </span>{" "}
                    {reviewedAt ? new Date(reviewedAt).toLocaleString() : "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("kycStatus.labels.reason")}
                    </span>{" "}
                    {reason || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-900">
                  <ShieldCheck className="h-4 w-4" />
                  {t("kycStatus.attention.nextAction")}
                </div>

                <div className="space-y-2 text-sm text-amber-900">
                  <p>{t("kycStatus.attention.step1")}</p>
                  <p>{t("kycStatus.attention.step2")}</p>
                  <p>{t("kycStatus.attention.step3")}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/app/dashboard">
                <Button variant="secondary" className="h-12 px-6">
                  {t("kycStatus.actions.backToDashboard")}
                </Button>
              </Link>

              <Link to="/app/kyc">
                <Button className="h-12 px-6 font-semibold">
                  {t("kycStatus.actions.resubmit")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm md:p-10">
          {fetchFailed && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                Unable to refresh the latest KYC status right now. Showing the
                most recent saved status.
              </p>
            </div>
          )}

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Clock3 className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-3xl font-bold text-foreground">
              {t("kycStatus.inProgress.title")}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {t("kycStatus.inProgress.descriptionPrefix")}{" "}
              <span className="font-medium text-foreground">
                {t("kycStatus.inProgress.estimatedTime")}
              </span>
              .
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4" />
                {t("kycStatus.inProgress.submissionDetails")}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {t("kycStatus.labels.status")}
                  </span>{" "}
                  {status === "under_review"
                    ? t("kycStatus.statuses.underReview")
                    : status}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {t("kycStatus.labels.submittedAt")}
                  </span>{" "}
                  {submittedAt ? new Date(submittedAt).toLocaleString() : "-"}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {t("kycStatus.labels.estimatedReviewTime")}
                  </span>{" "}
                  {t("kycStatus.inProgress.estimatedTime")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t("kycStatus.inProgress.whatHappensNext")}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t("kycStatus.inProgress.next1")}</p>
                <p>{t("kycStatus.inProgress.next2")}</p>
                <p>{t("kycStatus.inProgress.next3")}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              {t("kycStatus.inProgress.noticeTitle")}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {t("kycStatus.inProgress.noticeDescription")}
            </p>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/app/dashboard">
              <Button variant="secondary" className="h-12 px-6">
                {t("kycStatus.actions.backToDashboard")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}