"""add_project_completion_confirmation_timestamps

Revision ID: c2de51849afd
Revises: 2de8a4f0b470
Create Date: 2026-04-06 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2de51849afd"
down_revision: Union[str, Sequence[str], None] = "2de8a4f0b470"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("client_completion_confirmed_at", sa.DateTime(), nullable=True))
    op.add_column("projects", sa.Column("freelancer_completion_confirmed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "freelancer_completion_confirmed_at")
    op.drop_column("projects", "client_completion_confirmed_at")
