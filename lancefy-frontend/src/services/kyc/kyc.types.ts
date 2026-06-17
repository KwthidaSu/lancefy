export type KycStatus =
  | "not_submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_resubmission";

export type KycStatusResponse = {
  status: KycStatus;
  reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
};

export function mapKycStatus(status: string): KycStatus {
  switch (status) {
    case "PENDING":
    case "pending":
    case "UNDER_REVIEW":
      return "under_review";
    case "VERIFIED":
    case "verified":
    case "APPROVED":
      return "approved";
    case "REJECTED":
    case "rejected":
      return "rejected";
    case "NEEDS_RESUBMISSION":
    case "needs_resubmission":
      return "needs_resubmission";
    case "NOT_SUBMITTED":
    default:
      return "not_submitted";
  }
}
