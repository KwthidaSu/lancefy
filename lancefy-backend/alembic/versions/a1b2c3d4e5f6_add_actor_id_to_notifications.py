"""add actor_id to notifications

Revision ID: a1b2c3d4e5f6
Revises: 86b32bcd5e53
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '86b32bcd5e53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'notifications',
        sa.Column(
            'actor_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index(
        'ix_notifications_actor_id',
        'notifications',
        ['actor_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_notifications_actor_id', table_name='notifications')
    op.drop_column('notifications', 'actor_id')
