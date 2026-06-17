"""add kyc audit logs

Revision ID: 6b5d35d20f80
Revises: 54b88cecbf4c
Create Date: 2026-04-05 23:10:00.000000
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6b5d35d20f80"
down_revision: Union[str, Sequence[str], None] = "54b88cecbf4c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "kyc_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kyc_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "actor_type",
            sa.String(length=20),
            nullable=False,
            comment="user | admin | system",
        ),
        sa.Column(
            "event_type",
            sa.String(length=50),
            nullable=False,
            comment="submitted | id_card_uploaded | selfie_uploaded | documents_completed | approved | rejected | needs_resubmission",
        ),
        sa.Column("from_status", sa.String(length=40), nullable=True),
        sa.Column("to_status", sa.String(length=40), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("extra_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["kyc_profile_id"], ["kyc_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_kyc_audit_event",
        "kyc_audit_logs",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        "ix_kyc_audit_profile_created",
        "kyc_audit_logs",
        ["kyc_profile_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_kyc_audit_user_created",
        "kyc_audit_logs",
        ["user_id", "created_at"],
        unique=False,
    )

    bind = op.get_bind()
    audit_table = sa.table(
        "kyc_audit_logs",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("kyc_profile_id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("actor_user_id", postgresql.UUID(as_uuid=True)),
        sa.column("actor_type", sa.String(length=20)),
        sa.column("event_type", sa.String(length=50)),
        sa.column("from_status", sa.String(length=40)),
        sa.column("to_status", sa.String(length=40)),
        sa.column("note", sa.Text()),
        sa.column("extra_data", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("created_at", sa.DateTime()),
    )
    rows = bind.execute(
        sa.text(
            """
            SELECT
                kp.id AS profile_id,
                kp.user_id,
                kp.status,
                kp.reviewed_by,
                kp.review_note,
                kp.reviewed_at,
                kp.created_at AS submitted_at,
                kid.front_image_file_id AS id_card_file_id,
                kid.created_at AS id_card_created_at,
                ks.image_file_id AS selfie_file_id,
                ks.created_at AS selfie_created_at
            FROM kyc_profiles kp
            LEFT JOIN kyc_id_cards kid ON kid.kyc_profile_id = kp.id
            LEFT JOIN kyc_selfies ks ON ks.kyc_profile_id = kp.id
            """
        )
    ).mappings().all()

    inserts: list[dict] = []
    for row in rows:
        submitted_at = row["submitted_at"]
        if submitted_at:
            inserts.append(
                {
                    "id": uuid.uuid4(),
                    "kyc_profile_id": row["profile_id"],
                    "user_id": row["user_id"],
                    "actor_user_id": row["user_id"],
                    "actor_type": "user",
                    "event_type": "submitted",
                    "from_status": None,
                    "to_status": "pending",
                    "note": None,
                    "extra_data": {"backfilled": True},
                    "created_at": submitted_at,
                }
            )

        if row["id_card_created_at"]:
            inserts.append(
                {
                    "id": uuid.uuid4(),
                    "kyc_profile_id": row["profile_id"],
                    "user_id": row["user_id"],
                    "actor_user_id": row["user_id"],
                    "actor_type": "user",
                    "event_type": "id_card_uploaded",
                    "from_status": None,
                    "to_status": None,
                    "note": None,
                    "extra_data": {
                        "backfilled": True,
                        "file_id": str(row["id_card_file_id"]) if row["id_card_file_id"] else None,
                    },
                    "created_at": row["id_card_created_at"],
                }
            )

        if row["selfie_created_at"]:
            inserts.append(
                {
                    "id": uuid.uuid4(),
                    "kyc_profile_id": row["profile_id"],
                    "user_id": row["user_id"],
                    "actor_user_id": row["user_id"],
                    "actor_type": "user",
                    "event_type": "selfie_uploaded",
                    "from_status": None,
                    "to_status": None,
                    "note": None,
                    "extra_data": {
                        "backfilled": True,
                        "file_id": str(row["selfie_file_id"]) if row["selfie_file_id"] else None,
                    },
                    "created_at": row["selfie_created_at"],
                }
            )

        if row["id_card_created_at"] and row["selfie_created_at"]:
            completed_at = max(row["id_card_created_at"], row["selfie_created_at"])
            inserts.append(
                {
                    "id": uuid.uuid4(),
                    "kyc_profile_id": row["profile_id"],
                    "user_id": row["user_id"],
                    "actor_user_id": row["user_id"],
                    "actor_type": "user",
                    "event_type": "documents_completed",
                    "from_status": None,
                    "to_status": None,
                    "note": None,
                    "extra_data": {"backfilled": True},
                    "created_at": completed_at,
                }
            )

        if row["reviewed_at"] and row["status"] in {"verified", "rejected", "needs_resubmission"}:
            event_type = (
                "approved"
                if row["status"] == "verified"
                else "rejected"
                if row["status"] == "rejected"
                else "needs_resubmission"
            )
            inserts.append(
                {
                    "id": uuid.uuid4(),
                    "kyc_profile_id": row["profile_id"],
                    "user_id": row["user_id"],
                    "actor_user_id": row["reviewed_by"],
                    "actor_type": "admin" if row["reviewed_by"] else "system",
                    "event_type": event_type,
                    "from_status": "pending",
                    "to_status": row["status"],
                    "note": row["review_note"],
                    "extra_data": {"backfilled": True},
                    "created_at": row["reviewed_at"],
                }
            )

    if inserts:
        op.bulk_insert(audit_table, inserts)


def downgrade() -> None:
    op.drop_index("ix_kyc_audit_user_created", table_name="kyc_audit_logs")
    op.drop_index("ix_kyc_audit_profile_created", table_name="kyc_audit_logs")
    op.drop_index("ix_kyc_audit_event", table_name="kyc_audit_logs")
    op.drop_table("kyc_audit_logs")
