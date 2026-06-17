"""add user invitations table

Revision ID: a5d7f59e21c1
Revises: ed9e2b5ba074
Create Date: 2026-04-03 14:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a5d7f59e21c1"
down_revision: Union[str, Sequence[str], None] = '8be895650aec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "user_invitations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "invited_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )

    op.create_index(
        op.f("ix_user_invitations_email"),
        "user_invitations",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_invitations_token"),
        "user_invitations",
        ["token"],
        unique=True,
    )
    op.create_index(
        op.f("ix_user_invitations_user_id"),
        "user_invitations",
        ["user_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f("ix_user_invitations_user_id"), table_name="user_invitations")
    op.drop_index(op.f("ix_user_invitations_token"), table_name="user_invitations")
    op.drop_index(op.f("ix_user_invitations_email"), table_name="user_invitations")
    op.drop_table("user_invitations")
