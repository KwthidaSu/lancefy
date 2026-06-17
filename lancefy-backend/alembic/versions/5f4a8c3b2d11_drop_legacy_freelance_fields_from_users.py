"""drop legacy freelance fields from users

Revision ID: 5f4a8c3b2d11
Revises: 97a651668657
Create Date: 2026-04-05 16:50:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "5f4a8c3b2d11"
down_revision: Union[str, Sequence[str], None] = "97a651668657"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "is_public")
    op.drop_column("users", "hourly_rate")
    op.drop_column("users", "skills")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "skills",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column("hourly_rate", sa.Float(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "is_public",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.execute(
        """
        UPDATE users AS u
        SET
            skills = s.skills,
            hourly_rate = s.hourly_rate,
            is_public = s.is_public
        FROM user_freelance_skills AS s
        WHERE s.user_id = u.id
        """
    )

    op.alter_column("users", "is_public", server_default=None)
