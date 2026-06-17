import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ArrowRight, ArrowLeft, Upload } from "lucide-react"

import KycLayout from "@/components/kyc/KycLayout"

import FormField from "@/components/projects/FormField"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import Dropdown from "@/components/ui/Dropdown"
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea"

import {
  submitKyc,
  uploadIdCard,
  uploadSelfie,
} from "@/services/kyc/kyc"

import { useToast } from "@/components/ui/Toast"

type Option = { value: string; label: string }

export default function KycPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [profile, setProfile] = useState({
    full_name: "",
    citizen_id: "",
    date_of_birth: "",
    country: "",
    address: "",
  })

  const [idCard, setIdCard] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)

  const countries: Option[] = useMemo(
    () => [
      { value: "TH", label: t("kyc.form.countries.thailand") },
      { value: "US", label: t("kyc.form.countries.unitedStates") },
      { value: "JP", label: t("kyc.form.countries.japan") },
    ],
    [t]
  )

  const next = () => setStep((s) => (s + 1) as 1 | 2 | 3)
  const prev = () => setStep((s) => (s - 1) as 1 | 2 | 3)

  const isCitizenIdValid = profile.citizen_id.length === 13

  const canContinueProfile =
    profile.full_name.trim() !== "" &&
    isCitizenIdValid &&
    profile.date_of_birth !== "" &&
    profile.country !== "" &&
    profile.address.trim() !== ""

  const handleSubmit = async () => {
    try {
      if (!idCard || !selfie || isSubmitting) return
      if (!canContinueProfile) return

      setIsSubmitting(true)

      const payload = {
        full_name: profile.full_name.trim(),
        citizen_id: profile.citizen_id,
        date_of_birth: new Date(profile.date_of_birth)
          .toISOString()
          .split("T")[0],
        country: profile.country,
        address: profile.address.trim(),
      }

      const res = await submitKyc(payload)
      const profileId = res.data.id

      await uploadIdCard(profileId, idCard)
      await uploadSelfie(profileId, selfie)

      sessionStorage.setItem(
        "kyc_status_fallback",
        JSON.stringify({
          status: "under_review",
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          reason: null,
        })
      )

      showToast(t("kyc.toast.submitSuccess"), "success")
      navigate("/app/kyc/status", { replace: true })
    } catch (err: any) {
      console.error("ERROR:", err?.response?.data || err)
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        t("kyc.toast.submitFailed")
      showToast(detail, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KycLayout step={step}>
      {step === 1 && (
        <div className="space-y-6">
          <FormField label={t("kyc.form.fullName")} required>
            <Input
              value={profile.full_name}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              placeholder={t("kyc.form.fullNamePlaceholder")}
              className="h-12 w-full"
            />
          </FormField>

          <FormField label={t("kyc.form.citizenId")} required>
            <Input
              value={profile.citizen_id}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "")
                if (value.length <= 13) {
                  setProfile({ ...profile, citizen_id: value })
                }
              }}
              placeholder={t("kyc.form.citizenIdPlaceholder")}
              className="h-12 w-full"
              inputMode="numeric"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              {t("kyc.form.citizenIdHint")}
            </p>

            {profile.citizen_id.length > 0 &&
              profile.citizen_id.length !== 13 && (
                <p className="mt-1 text-sm text-red-500">
                  {t("kyc.form.citizenIdError")}
                </p>
              )}
          </FormField>

          <FormField label={t("kyc.form.dateOfBirth")} required>
            <Input
              type="date"
              value={profile.date_of_birth}
              onChange={(e) =>
                setProfile({ ...profile, date_of_birth: e.target.value })
              }
              className="h-12 w-full"
            />
          </FormField>

          <FormField label={t("kyc.form.country")} required>
            <Dropdown
              value={profile.country}
              onChange={(v) =>
                setProfile({ ...profile, country: v })
              }
              options={countries}
              placeholder={t("kyc.form.countryPlaceholder")}
              className="w-full"
            />
          </FormField>

          <FormField label={t("kyc.form.address")} required>
            <AutoResizeTextarea
              value={profile.address}
              onChange={(v) =>
                setProfile({ ...profile, address: v })
              }
              placeholder={t("kyc.form.addressPlaceholder")}
              className="w-full"
            />
          </FormField>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              {t("kyc.notice.title")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("kyc.notice.description")}
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              disabled={!canContinueProfile}
              onClick={next}
              className="h-12 px-8 font-semibold"
            >
              {t("kyc.actions.next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              {t("kyc.upload.idCardTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("kyc.upload.idCardDescription")}
            </p>
          </div>

          <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition hover:bg-muted">
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />

            <span className="text-sm font-medium text-foreground">
              {t("kyc.upload.clickUpload")}
            </span>

            <span className="mt-1 text-xs text-muted-foreground">
              {t("kyc.upload.imageOnlyHint")}
            </span>

            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) =>
                setIdCard(e.target.files?.[0] || null)
              }
            />
          </label>

          {idCard && (
            <div className="text-sm text-primary">
              {t("kyc.upload.selectedFile", { name: idCard.name })}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={prev}
              className="h-12 px-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("kyc.actions.back")}
            </Button>

            <Button
              disabled={!idCard}
              onClick={next}
              className="h-12 px-8 font-semibold"
            >
              {t("kyc.actions.next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              {t("kyc.upload.selfieTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("kyc.upload.selfieDescription")}
            </p>
          </div>

          <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition hover:bg-muted">
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />

            <span className="text-sm font-medium text-foreground">
              {t("kyc.upload.clickUpload")}
            </span>

            <span className="mt-1 text-xs text-muted-foreground">
              {t("kyc.upload.imageOnlyHint")}
            </span>

            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) =>
                setSelfie(e.target.files?.[0] || null)
              }
            />
          </label>

          {selfie && (
            <div className="text-sm text-primary">
              {t("kyc.upload.selectedFile", { name: selfie.name })}
            </div>
          )}

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              {t("kyc.review.beforeSubmit")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("kyc.review.beforeSubmitDescription")}
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={prev}
              disabled={isSubmitting}
              className="h-12 px-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("kyc.actions.back")}
            </Button>

            <Button
              disabled={!selfie || isSubmitting}
              className="h-12 px-8 font-semibold"
              onClick={handleSubmit}
            >
              {isSubmitting
                ? t("kyc.actions.submitting")
                : t("kyc.actions.submit")}
            </Button>
          </div>
        </div>
      )}
    </KycLayout>
  )
}
