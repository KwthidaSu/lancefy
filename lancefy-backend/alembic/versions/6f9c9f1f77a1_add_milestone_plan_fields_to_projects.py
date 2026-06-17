"""add milestone plan fields to projects

Revision ID: 6f9c9f1f77a1
Revises: 3839951cc266
Create Date: 2026-04-07 21:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6f9c9f1f77a1"
down_revision = "3839951cc266"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "milestone_plan_pending",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "projects",
        sa.Column("milestone_plan_proposed_by", sa.UUID(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("projects", "milestone_plan_proposed_by")
    op.drop_column("projects", "milestone_plan_pending")
