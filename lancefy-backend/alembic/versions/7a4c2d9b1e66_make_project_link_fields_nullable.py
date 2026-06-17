"""make project link fields nullable

Revision ID: 7a4c2d9b1e66
Revises: 6f9c9f1f77a1
Create Date: 2026-04-07 23:05:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "7a4c2d9b1e66"
down_revision = "6f9c9f1f77a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "projects",
        "proposal_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
        existing_comment="Accepted proposal that created this project",
        comment="NULL = pre-contract project from job post, set when proposal is accepted",
    )
    op.alter_column(
        "projects",
        "freelancer_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
        existing_comment=None,
        comment="NULL until a freelancer is attached to the project",
    )


def downgrade() -> None:
    op.alter_column(
        "projects",
        "freelancer_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
        existing_comment="NULL until a freelancer is attached to the project",
        comment=None,
    )
    op.alter_column(
        "projects",
        "proposal_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
        existing_comment="NULL = pre-contract project from job post, set when proposal is accepted",
        comment="Accepted proposal that created this project",
    )
