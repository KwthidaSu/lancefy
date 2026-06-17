"""add new_due_date to disputes

Revision ID: b3f7d9c2a8e1
Revises: 7a4c2d9b1e66
Create Date: 2026-04-08 03:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b3f7d9c2a8e1"
down_revision = "7a4c2d9b1e66"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "disputes",
        sa.Column(
            "new_due_date",
            sa.Date(),
            nullable=True,
            comment="New due date when dispute resolution extends the deadline",
        ),
    )


def downgrade() -> None:
    op.drop_column("disputes", "new_due_date")
