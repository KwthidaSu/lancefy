"""align kyc status comment

Revision ID: 8f2c7de1a4b3
Revises: 6b5d35d20f80
Create Date: 2026-04-05 23:25:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8f2c7de1a4b3"
down_revision: Union[str, Sequence[str], None] = "6b5d35d20f80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "kyc_profiles",
        "status",
        existing_type=sa.String(),
        comment="pending | verified | rejected | needs_resubmission",
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "kyc_profiles",
        "status",
        existing_type=sa.String(),
        comment="pending | verified | rejected",
        existing_nullable=False,
    )
