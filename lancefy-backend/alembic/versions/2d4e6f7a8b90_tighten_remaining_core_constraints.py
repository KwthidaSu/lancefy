"""tighten_remaining_core_constraints

Revision ID: 2d4e6f7a8b90
Revises: fa1c8b0e0cfa
Create Date: 2026-04-05 18:24:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "2d4e6f7a8b90"
down_revision: Union[str, Sequence[str], None] = "fa1c8b0e0cfa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("chat_messages", "chat_room_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("chat_messages", "sender_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("chat_messages", "message_type", existing_type=sa.String(), nullable=False)
    op.alter_column("chat_messages", "content", existing_type=sa.Text(), nullable=False)
    op.alter_column("chat_messages", "created_at", existing_type=sa.DateTime(), nullable=False)
    op.drop_constraint("chat_messages_chat_room_id_fkey", "chat_messages", type_="foreignkey")
    op.create_foreign_key(
        "chat_messages_chat_room_id_fkey",
        "chat_messages",
        "chat_rooms",
        ["chat_room_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.alter_column("chat_participants", "chat_room_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("chat_participants", "user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("chat_participants", "joined_at", existing_type=sa.DateTime(), nullable=False)
    op.drop_constraint("chat_participants_chat_room_id_fkey", "chat_participants", type_="foreignkey")
    op.drop_constraint("chat_participants_user_id_fkey", "chat_participants", type_="foreignkey")
    op.create_foreign_key(
        "chat_participants_chat_room_id_fkey",
        "chat_participants",
        "chat_rooms",
        ["chat_room_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "chat_participants_user_id_fkey",
        "chat_participants",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.alter_column("chat_rooms", "created_at", existing_type=sa.DateTime(), nullable=False)

    op.alter_column("job_assignments", "job_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("job_assignments", "client_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("job_assignments", "freelancer_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)

    op.alter_column("jobs", "owner_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)

    op.alter_column("notifications", "user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column("notifications", "type", existing_type=sa.String(), nullable=False)
    op.alter_column("notifications", "is_read", existing_type=sa.Boolean(), nullable=False)
    op.alter_column("notifications", "created_at", existing_type=sa.DateTime(), nullable=False)
    op.drop_constraint("notifications_user_id_fkey", "notifications", type_="foreignkey")
    op.create_foreign_key(
        "notifications_user_id_fkey",
        "notifications",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.alter_column("users", "firstname", existing_type=sa.String(), nullable=False)
    op.alter_column("users", "status", existing_type=sa.String(), nullable=False)
    op.alter_column("users", "created_at", existing_type=sa.DateTime(), nullable=False)
    op.alter_column("users", "updated_at", existing_type=sa.DateTime(), nullable=False)
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"], unique=False)
    op.create_index("ix_users_status", "users", ["status"], unique=False)
    op.create_index("ix_users_username", "users", ["username"], unique=False)
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_status", table_name="users")
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.alter_column("users", "updated_at", existing_type=sa.DateTime(), nullable=True)
    op.alter_column("users", "created_at", existing_type=sa.DateTime(), nullable=True)
    op.alter_column("users", "status", existing_type=sa.String(), nullable=True)
    op.alter_column("users", "firstname", existing_type=sa.String(), nullable=True)

    op.drop_constraint("notifications_user_id_fkey", "notifications", type_="foreignkey")
    op.create_foreign_key(
        "notifications_user_id_fkey",
        "notifications",
        "users",
        ["user_id"],
        ["id"],
    )
    op.alter_column("notifications", "created_at", existing_type=sa.DateTime(), nullable=True)
    op.alter_column("notifications", "is_read", existing_type=sa.Boolean(), nullable=True)
    op.alter_column("notifications", "type", existing_type=sa.String(), nullable=True)
    op.alter_column("notifications", "user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    op.alter_column("jobs", "owner_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    op.alter_column("job_assignments", "freelancer_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.alter_column("job_assignments", "client_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.alter_column("job_assignments", "job_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    op.alter_column("chat_rooms", "created_at", existing_type=sa.DateTime(), nullable=True)

    op.drop_constraint("chat_participants_user_id_fkey", "chat_participants", type_="foreignkey")
    op.drop_constraint("chat_participants_chat_room_id_fkey", "chat_participants", type_="foreignkey")
    op.create_foreign_key(
        "chat_participants_user_id_fkey",
        "chat_participants",
        "users",
        ["user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "chat_participants_chat_room_id_fkey",
        "chat_participants",
        "chat_rooms",
        ["chat_room_id"],
        ["id"],
    )
    op.alter_column("chat_participants", "joined_at", existing_type=sa.DateTime(), nullable=True)
    op.alter_column("chat_participants", "user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.alter_column("chat_participants", "chat_room_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    op.drop_constraint("chat_messages_chat_room_id_fkey", "chat_messages", type_="foreignkey")
    op.create_foreign_key(
        "chat_messages_chat_room_id_fkey",
        "chat_messages",
        "chat_rooms",
        ["chat_room_id"],
        ["id"],
    )
    op.alter_column("chat_messages", "created_at", existing_type=sa.DateTime(), nullable=True)
    op.alter_column("chat_messages", "content", existing_type=sa.Text(), nullable=True)
    op.alter_column("chat_messages", "message_type", existing_type=sa.String(), nullable=True)
    op.alter_column("chat_messages", "sender_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.alter_column("chat_messages", "chat_room_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
