"""create_user_freelance_skills_table_and_backfill_from_users

Revision ID: 97a651668657
Revises: 204f7380e489
Create Date: 2026-04-05 05:59:05.518068

"""
from typing import Sequence, Union
import uuid
from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '97a651668657'
down_revision: Union[str, Sequence[str], None] = '204f7380e489'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_freelance_skills",
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
        sa.Column("tagline", sa.String(length=160), nullable=True),
        sa.Column(
            "skills",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("hourly_rate", sa.Float(), nullable=True),
        sa.Column(
            "is_public",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_freelance_skill"),
    )
    op.create_index(
        "ix_freelance_public",
        "user_freelance_skills",
        ["is_public"],
        unique=False,
    )
    op.create_index(
        "ix_freelance_hourly_rate",
        "user_freelance_skills",
        ["hourly_rate"],
        unique=False,
    )

    connection = op.get_bind()

    users_table = sa.table(
        "users",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("skills", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("hourly_rate", sa.Float()),
        sa.column("is_public", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )
    freelance_table = sa.table(
        "user_freelance_skills",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("tagline", sa.String(length=160)),
        sa.column("skills", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("hourly_rate", sa.Float()),
        sa.column("is_public", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )

    users_to_backfill = connection.execute(
        sa.select(
            users_table.c.id,
            users_table.c.skills,
            users_table.c.hourly_rate,
            users_table.c.is_public,
            users_table.c.created_at,
            users_table.c.updated_at,
        ).where(
            sa.or_(
                users_table.c.skills.is_not(None),
                users_table.c.hourly_rate.is_not(None),
                users_table.c.is_public.is_(True),
            )
        )
    ).mappings().all()

    now = datetime.utcnow()
    rows = [
        {
            "id": uuid.uuid4(),
            "user_id": row["id"],
            "tagline": None,
            "skills": row["skills"] or [],
            "hourly_rate": row["hourly_rate"],
            "is_public": bool(row["is_public"]),
            "created_at": row["created_at"] or now,
            "updated_at": row["updated_at"] or row["created_at"] or now,
        }
        for row in users_to_backfill
    ]
    if rows:
        connection.execute(freelance_table.insert(), rows)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_freelance_hourly_rate", table_name="user_freelance_skills")
    op.drop_index("ix_freelance_public", table_name="user_freelance_skills")
    op.drop_table("user_freelance_skills")
