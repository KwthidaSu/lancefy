"""merge heads

Revision ID: 204f7380e489
Revises: 8be895650aec, a5d7f59e21c1
Create Date: 2026-04-05 05:58:54.515201

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '204f7380e489'
down_revision: Union[str, Sequence[str], None] = ('8be895650aec', 'a5d7f59e21c1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
