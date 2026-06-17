import { useEffect, useMemo, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import Button from "@/components/ui/Button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { fetchKycStatus, getStoredKycStatusFallback } from "@/services/kyc/kyc";
import type { KycStatus } from "@/services/kyc/kyc.types";

type ViewState =
  | "not_submitted"
  | "under_review"
  | "needs_resubmission"
  | "rejected"
  | "approved"
  | "loading";

export default function BecomeFreelancerState() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];
  const hasFreelancerRole = roles.includes("freelancer");
  const storedKycFallback = getStoredKycStatusFallback();

  const [kycStatus, setKycStatus] = useState<KycStatus | null>(
    hasFreelancerRole ? "approved" : storedKycFallback?.status ?? null
  );
  const [loadingKycStatus, setLoadingKycStatus] = useState(
    !hasFreelancerRole && !storedKycFallback
  );

  useEffect(() => {
    if (hasFreelancerRole) {
      setKycStatus("approved");
      setLoadingKycStatus(false);
      return;
    }

    const loadKycStatus = async () => {
      try {
        const res = await fetchKycStatus();
        setKycStatus(res.data.status ?? "not_submitted");
      } catch (error) {
        console.error("Failed to fetch KYC status:", error);
        setKycStatus(storedKycFallback?.status ?? "not_submitted");
      } finally {
        setLoadingKycStatus(false);
      }
    };

    loadKycStatus();
  }, [hasFreelancerRole, storedKycFallback?.status]);

  const viewState: ViewState = useMemo(() => {
    if (loadingKycStatus) return "loading";
    if (!kycStatus) return "not_submitted";
    return kycStatus;
  }, [loadingKycStatus, kycStatus]);

  const content = useMemo(() => {
    switch (viewState) {
      case "under_review":
        return {
          image: "/images/verify-freelancer.png",
          alt: t("freelancer.states.underReview.alt"),
          title: t("freelancer.states.underReview.title"),
          subtitle: t("freelancer.states.underReview.subtitle"),
          cta: t("freelancer.states.underReview.cta"),
          action: () => navigate("/app/kyc/status"),
          buttonVariant: "secondary" as const,
        };

      case "needs_resubmission":
        return {
          image: "/images/verify-freelancer.png",
          alt: t("freelancer.states.needsResubmission.alt"),
          title: t("freelancer.states.needsResubmission.title"),
          subtitle: t("freelancer.states.needsResubmission.subtitle"),
          cta: t("freelancer.states.needsResubmission.cta"),
          action: () => navigate("/app/kyc"),
          buttonVariant: "primary" as const,
        };

      case "rejected":
        return {
          image: "/images/verify-freelancer.png",
          alt: t("freelancer.states.rejected.alt"),
          title: t("freelancer.states.rejected.title"),
          subtitle: t("freelancer.states.rejected.subtitle"),
          cta: t("freelancer.states.rejected.cta"),
          action: () => navigate("/app/kyc"),
          buttonVariant: "primary" as const,
        };

      case "approved":
        return {
          image: "/images/verify-freelancer.png",
          alt: t("freelancer.states.approved.alt"),
          title: t("freelancer.states.approved.title"),
          subtitle: t("freelancer.states.approved.subtitle"),
          cta: t("freelancer.states.approved.cta"),
          action: () => navigate("/app/dashboard"),
          buttonVariant: "primary" as const,
        };

      case "loading":
        return {
          image: "/images/verify-freelancer.png",
          alt: t("freelancer.states.loading.alt"),
          title: t("freelancer.states.loading.title"),
          subtitle: t("freelancer.states.loading.subtitle"),
          cta: t("freelancer.states.loading.cta"),
          action: () => {},
          buttonVariant: "primary" as const,
        };

      case "not_submitted":
      default:
        return {
          image: "/images/verify-freelancer.png",
          alt: t("freelancer.states.notSubmitted.alt"),
          title: t("freelancer.states.notSubmitted.title"),
          subtitle: t("freelancer.states.notSubmitted.subtitle"),
          cta: t("freelancer.states.notSubmitted.cta"),
          action: () => navigate("/app/kyc"),
          buttonVariant: "primary" as const,
        };
    }
  }, [navigate, t, viewState]);

  const isDisabled = viewState === "loading";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <img
        src={content.image}
        alt={content.alt}
        className="mb-8 w-72 max-w-full sm:w-80"
      />

      <h2 className="text-2xl font-semibold text-text-primary">
        {content.title}
      </h2>

      <p className="mt-3 max-w-md text-text-muted">
        {content.subtitle}
      </p>

      <Button
        variant={content.buttonVariant}
        className="mt-8 px-6"
        onClick={content.action}
        disabled={isDisabled}
      >
        {content.cta}
      </Button>
    </div>
  );
}
