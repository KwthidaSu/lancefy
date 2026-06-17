"""add profile fields to users

Revision ID: 8be895650aec
Revises: f3f0543c615f
Create Date: 2026-03-31 14:35:22.858844
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8be895650aec'
down_revision: Union[str, Sequence[str], None] = 'd37127c04040'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # bio + avatar_url already exist in DB from a previous out-of-band migration.
    # skills/hourly_rate/is_public moved to user_freelance_skills — not added here.
    pass


def downgrade() -> None:
    pass