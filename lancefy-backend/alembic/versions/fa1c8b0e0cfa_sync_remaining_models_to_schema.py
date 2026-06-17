"""sync_remaining_models_to_schema

Revision ID: fa1c8b0e0cfa
Revises: c1a2b3d4e5f6
Create Date: 2026-04-05 10:50:11.295094

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "fa1c8b0e0cfa"
down_revision: Union[str, Sequence[str], None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


community_reaction_type = postgresql.ENUM(
    "LIKE",
    "DISLIKE",
    name="communityreactiontype",
    create_type=False,
)


def upgrade() -> None:
    """Upgrade schema."""
    community_reaction_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "community_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(), nullable=True, server_default="general"),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("edited_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_community_posts_author_id", "community_posts", ["author_id"], unique=False)
    op.create_index("ix_community_posts_category", "community_posts", ["category"], unique=False)
    op.create_index("ix_community_posts_created_at", "community_posts", ["created_at"], unique=False)

    op.create_table(
        "freelancer_portfolios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(), nullable=False, server_default="My Portfolio"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.String(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_freelancer_portfolios_user_id", "freelancer_portfolios", ["user_id"], unique=False)

    op.create_table(
        "community_post_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False, server_default="image"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "community_post_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_comment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("edited_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_comment_id"], ["community_post_comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "community_post_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viewed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_community_post_view"),
    )

    op.create_table(
        "portfolio_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["portfolio_id"], ["freelancer_portfolios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_files_portfolio_id", "portfolio_files", ["portfolio_id"], unique=False)

    op.create_table(
        "community_post_reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("comment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reaction_type", community_reaction_type, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["comment_id"], ["community_post_comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "comment_id", "user_id", name="uq_community_reaction"),
    )

    op.create_table(
        "job_offer_milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("offer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(), nullable=True),
        sa.Column("estimated_days", sa.Integer(), nullable=True),
        sa.Column("deliverables", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["offer_id"], ["job_offers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("is_immutable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["job_assignments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "disputes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("milestone_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("raised_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("resolution", sa.String(), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["assignment_id"], ["job_assignments.id"]),
        sa.ForeignKeyConstraint(["milestone_id"], ["job_milestones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "job_extension_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("milestone_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("freelancer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("days", sa.Integer(), nullable=True),
        sa.Column("new_due_date", sa.Date(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=True, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["freelancer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["milestone_id"], ["job_milestones.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "evidences",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispute_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "message_read_receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["chat_messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_message_read_receipt"),
    )
    op.create_index("ix_read_receipts_user_message", "message_read_receipts", ["user_id", "message_id"], unique=False)

    op.add_column("chat_messages", sa.Column("reply_to_message_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_chat_messages_room_created", "chat_messages", ["chat_room_id", "created_at"], unique=False)
    op.create_foreign_key(
        "chat_messages_reply_to_message_id_fkey",
        "chat_messages",
        "chat_messages",
        ["reply_to_message_id"],
        ["id"],
    )
    op.drop_column("chat_messages", "read_at")

    op.add_column("chat_participants", sa.Column("left_at", sa.DateTime(), nullable=True))
    op.add_column("chat_participants", sa.Column("last_read_at", sa.DateTime(), nullable=True))
    op.create_unique_constraint("uq_chat_participant", "chat_participants", ["chat_room_id", "user_id"])

    op.add_column("job_assignments", sa.Column("client_completion_confirmed_at", sa.DateTime(), nullable=True))
    op.add_column("job_assignments", sa.Column("freelancer_completion_confirmed_at", sa.DateTime(), nullable=True))

    op.add_column("job_milestones", sa.Column("amount", sa.Numeric(), nullable=True))
    op.add_column("job_milestones", sa.Column("currency", sa.String(), nullable=True))
    op.add_column("job_milestones", sa.Column("funding_status", sa.String(), nullable=True))
    op.add_column("job_milestones", sa.Column("funded_at", sa.DateTime(), nullable=True))

    op.add_column("job_offers", sa.Column("attachments", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("jobs", sa.Column("images", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("milestone_submissions", sa.Column("attachments", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column(
        "milestone_submissions",
        sa.Column("auto_release_eligible", sa.Boolean(), nullable=True, server_default=sa.text("false")),
    )

    op.add_column("notifications", sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("notifications", sa.Column("title", sa.String(), nullable=False, server_default=""))
    op.add_column("notifications", sa.Column("body", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("reference_type", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("reference_id", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("read_at", sa.DateTime(), nullable=True))
    op.add_column("notifications", sa.Column("expires_at", sa.DateTime(), nullable=True))
    op.create_foreign_key(
        "notifications_actor_id_fkey",
        "notifications",
        "users",
        ["actor_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"], unique=False)
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "is_read"], unique=False)
    op.drop_column("notifications", "message")
    op.alter_column("notifications", "title", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("notifications", sa.Column("message", sa.Text(), nullable=True))
    op.drop_index("ix_notifications_user_unread", table_name="notifications")
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_constraint("notifications_actor_id_fkey", "notifications", type_="foreignkey")
    op.drop_column("notifications", "expires_at")
    op.drop_column("notifications", "read_at")
    op.drop_column("notifications", "reference_id")
    op.drop_column("notifications", "reference_type")
    op.drop_column("notifications", "body")
    op.drop_column("notifications", "title")
    op.drop_column("notifications", "actor_id")

    op.drop_column("milestone_submissions", "auto_release_eligible")
    op.drop_column("milestone_submissions", "attachments")

    op.drop_column("jobs", "images")
    op.drop_column("job_offers", "attachments")

    op.drop_column("job_milestones", "funded_at")
    op.drop_column("job_milestones", "funding_status")
    op.drop_column("job_milestones", "currency")
    op.drop_column("job_milestones", "amount")

    op.drop_column("job_assignments", "freelancer_completion_confirmed_at")
    op.drop_column("job_assignments", "client_completion_confirmed_at")

    op.drop_constraint("uq_chat_participant", "chat_participants", type_="unique")
    op.drop_column("chat_participants", "last_read_at")
    op.drop_column("chat_participants", "left_at")

    op.add_column("chat_messages", sa.Column("read_at", sa.DateTime(), nullable=True))
    op.drop_constraint("chat_messages_reply_to_message_id_fkey", "chat_messages", type_="foreignkey")
    op.drop_index("ix_chat_messages_room_created", table_name="chat_messages")
    op.drop_column("chat_messages", "reply_to_message_id")

    op.drop_index("ix_read_receipts_user_message", table_name="message_read_receipts")
    op.drop_table("message_read_receipts")
    op.drop_table("evidences")
    op.drop_table("job_extension_requests")
    op.drop_table("disputes")
    op.drop_table("reviews")
    op.drop_table("job_offer_milestones")
    op.drop_table("community_post_reactions")
    op.drop_index("ix_portfolio_files_portfolio_id", table_name="portfolio_files")
    op.drop_table("portfolio_files")
    op.drop_table("community_post_views")
    op.drop_table("community_post_comments")
    op.drop_table("community_post_attachments")
    op.drop_index("ix_freelancer_portfolios_user_id", table_name="freelancer_portfolios")
    op.drop_table("freelancer_portfolios")
    op.drop_index("ix_community_posts_created_at", table_name="community_posts")
    op.drop_index("ix_community_posts_category", table_name="community_posts")
    op.drop_index("ix_community_posts_author_id", table_name="community_posts")
    op.drop_table("community_posts")

    community_reaction_type.drop(op.get_bind(), checkfirst=True)
