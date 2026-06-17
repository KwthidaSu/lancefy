"""add_tags_to_jobs

Revision ID: e3a15d1986bd
Revises: c2de51849afd
Create Date: 2026-04-06 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e3a15d1986bd"
down_revision: Union[str, Sequence[str], None] = "c2de51849afd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
            comment="free-form tags typed by the job owner",
        ),
    )


def downgrade() -> None:
    op.drop_column("jobs", "tags")
