from enum import Enum


class NotificationType(str, Enum):
    """
    Canonical notification event types used throughout the system.
    Stored as plain VARCHAR string in DB — just add/remove values here to extend.
    Using `str, Enum` means instances compare equal to plain strings and
    SQLAlchemy stores the `.value` directly without any migration.
    """

    # Job board / Proposal flow
    proposal_received  = "proposal_received"
    proposal_accepted  = "proposal_accepted"
    proposal_rejected  = "proposal_rejected"
    proposal_withdrawn = "proposal_withdrawn"
    job_expired        = "job_expired"

    # Deal / Project
    deal_opened        = "deal_opened"
    project_created    = "project_created"
    project_completed  = "project_completed"

    # Work
    work_submitted     = "work_submitted"
    work_approved      = "work_approved"
    work_rejected      = "work_rejected"

    # Payment
    payment_funded     = "payment_funded"
    payment_released   = "payment_released"
    payout_processed   = "payout_processed"

    # Chat
    message_received   = "message_received"

    # Admin / KYC / Dispute
    kyc_approved       = "kyc_approved"
    kyc_rejected       = "kyc_rejected"
    dispute_opened     = "dispute_opened"
    dispute_resolved   = "dispute_resolved"
