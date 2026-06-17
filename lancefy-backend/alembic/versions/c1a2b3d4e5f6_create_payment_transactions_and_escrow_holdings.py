"""create payment transactions and escrow holdings

Revision ID: c1a2b3d4e5f6
Revises: 5f4a8c3b2d11
Create Date: 2026-04-05 17:35:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "5f4a8c3b2d11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payment_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("gateway_provider", sa.String(length=20), nullable=False),
        sa.Column("gateway_tx_id", sa.String(length=255), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reference_type", sa.String(length=30), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("gateway_created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("gateway_provider", "gateway_tx_id", name="uq_gateway_tx"),
    )
    op.create_index(
        "ix_payment_tx_reference",
        "payment_transactions",
        ["reference_type", "reference_id"],
        unique=False,
    )
    op.create_index(
        "ix_payment_tx_status",
        "payment_transactions",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_payment_tx_type",
        "payment_transactions",
        ["type"],
        unique=False,
    )
    op.create_index(
        "ix_payment_tx_user_created",
        "payment_transactions",
        ["user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "escrow_holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("milestone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("freelancer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("charge_tx_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("release_tx_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("held_at", sa.DateTime(), nullable=False),
        sa.Column("released_at", sa.DateTime(), nullable=True),
        sa.Column("released_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["milestone_id"], ["job_milestones.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["freelancer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["charge_tx_id"], ["payment_transactions.id"]),
        sa.ForeignKeyConstraint(["release_tx_id"], ["payment_transactions.id"]),
        sa.ForeignKeyConstraint(["released_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("milestone_id", name="uq_escrow_milestone"),
    )
    op.create_index(
        "ix_escrow_client",
        "escrow_holdings",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        "ix_escrow_freelancer",
        "escrow_holdings",
        ["freelancer_id"],
        unique=False,
    )
    op.create_index(
        "ix_escrow_status",
        "escrow_holdings",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_escrow_status", table_name="escrow_holdings")
    op.drop_index("ix_escrow_freelancer", table_name="escrow_holdings")
    op.drop_index("ix_escrow_client", table_name="escrow_holdings")
    op.drop_table("escrow_holdings")

    op.drop_index("ix_payment_tx_user_created", table_name="payment_transactions")
    op.drop_index("ix_payment_tx_type", table_name="payment_transactions")
    op.drop_index("ix_payment_tx_status", table_name="payment_transactions")
    op.drop_index("ix_payment_tx_reference", table_name="payment_transactions")
    op.drop_table("payment_transactions")
