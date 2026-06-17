"""seed categories, subcategories and skills

Revision ID: 3839951cc266
Revises: e3a15d1986bd
Create Date: 2026-04-06 20:20:00.000000
"""

from __future__ import annotations

import datetime as dt
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "3839951cc266"
down_revision = "e3a15d1986bd"
branch_labels = None
depends_on = None


CATALOG = [
    {
        "slug": "programming-tech",
        "name": "Programming & Tech",
        "name_th": "โปรแกรมมิงและเทคโนโลยี",
        "icon": "code-2",
        "subcategories": [
            {
                "slug": "web-development",
                "name": "Web Development",
                "skills": [
                    ("react", "React"),
                    ("next-js", "Next.js"),
                ],
            },
            {
                "slug": "mobile-app-development",
                "name": "Mobile App Development",
                "skills": [
                    ("flutter", "Flutter"),
                    ("react-native", "React Native"),
                ],
            },
        ],
    },
    {
        "slug": "design-creative",
        "name": "Design & Creative",
        "name_th": "ออกแบบและครีเอทีฟ",
        "icon": "palette",
        "subcategories": [
            {
                "slug": "ui-ux-design",
                "name": "UI/UX Design",
                "skills": [
                    ("figma", "Figma"),
                    ("wireframing", "Wireframing"),
                ],
            },
            {
                "slug": "branding-logo-design",
                "name": "Branding & Logo Design",
                "skills": [
                    ("logo-design", "Logo Design"),
                    ("brand-identity", "Brand Identity"),
                ],
            },
        ],
    },
    {
        "slug": "digital-marketing",
        "name": "Digital Marketing",
        "name_th": "การตลาดดิจิทัล",
        "icon": "megaphone",
        "subcategories": [
            {
                "slug": "social-media-marketing",
                "name": "Social Media Marketing",
                "skills": [
                    ("social-media-strategy", "Social Media Strategy"),
                    ("content-calendar", "Content Calendar"),
                ],
            },
            {
                "slug": "seo",
                "name": "SEO",
                "skills": [
                    ("keyword-research", "Keyword Research"),
                    ("on-page-seo", "On-Page SEO"),
                ],
            },
        ],
    },
    {
        "slug": "writing-translation",
        "name": "Writing & Translation",
        "name_th": "งานเขียนและแปลภาษา",
        "icon": "languages",
        "subcategories": [
            {
                "slug": "content-writing",
                "name": "Content Writing",
                "skills": [
                    ("blog-writing", "Blog Writing"),
                    ("seo-writing", "SEO Writing"),
                ],
            },
            {
                "slug": "translation-localization",
                "name": "Translation & Localization",
                "skills": [
                    ("thai-translation", "Thai Translation"),
                    ("english-localization", "English Localization"),
                ],
            },
        ],
    },
    {
        "slug": "video-animation",
        "name": "Video & Animation",
        "name_th": "วิดีโอและแอนิเมชัน",
        "icon": "clapperboard",
        "subcategories": [
            {
                "slug": "video-editing",
                "name": "Video Editing",
                "skills": [
                    ("adobe-premiere-pro", "Adobe Premiere Pro"),
                    ("short-form-video-editing", "Short-form Video Editing"),
                ],
            },
            {
                "slug": "motion-graphics",
                "name": "Motion Graphics",
                "skills": [
                    ("adobe-after-effects", "Adobe After Effects"),
                    ("motion-design", "Motion Design"),
                ],
            },
        ],
    },
    {
        "slug": "business-consulting",
        "name": "Business & Consulting",
        "name_th": "ธุรกิจและที่ปรึกษา",
        "icon": "briefcase-business",
        "subcategories": [
            {
                "slug": "virtual-assistance",
                "name": "Virtual Assistance",
                "skills": [
                    ("inbox-management", "Inbox Management"),
                    ("data-entry", "Data Entry"),
                ],
            },
            {
                "slug": "market-research",
                "name": "Market Research",
                "skills": [
                    ("competitor-analysis", "Competitor Analysis"),
                    ("survey-design", "Survey Design"),
                ],
            },
        ],
    },
    {
        "slug": "ai-data",
        "name": "AI & Data",
        "name_th": "AI และข้อมูล",
        "icon": "brain-circuit",
        "subcategories": [
            {
                "slug": "machine-learning",
                "name": "Machine Learning",
                "skills": [
                    ("python", "Python"),
                    ("tensorflow", "TensorFlow"),
                ],
            },
            {
                "slug": "data-analysis",
                "name": "Data Analysis",
                "skills": [
                    ("sql", "SQL"),
                    ("data-visualization", "Data Visualization"),
                ],
            },
        ],
    },
    {
        "slug": "music-audio",
        "name": "Music & Audio",
        "name_th": "ดนตรีและเสียง",
        "icon": "audio-lines",
        "subcategories": [
            {
                "slug": "voice-over",
                "name": "Voice Over",
                "skills": [
                    ("voice-over-recording", "Voice Over"),
                    ("audio-cleanup", "Audio Cleanup"),
                ],
            },
            {
                "slug": "podcast-production",
                "name": "Podcast Production",
                "skills": [
                    ("podcast-editing", "Podcast Editing"),
                    ("audio-mixing", "Audio Mixing"),
                ],
            },
        ],
    },
    {
        "slug": "photography",
        "name": "Photography",
        "name_th": "ภาพถ่าย",
        "icon": "camera",
        "subcategories": [
            {
                "slug": "product-photography",
                "name": "Product Photography",
                "skills": [
                    ("studio-lighting", "Studio Lighting"),
                    ("product-retouching", "Product Retouching"),
                ],
            },
            {
                "slug": "photo-editing",
                "name": "Photo Editing",
                "skills": [
                    ("adobe-photoshop", "Adobe Photoshop"),
                    ("lightroom", "Lightroom"),
                ],
            },
        ],
    },
    {
        "slug": "education-training",
        "name": "Education & Training",
        "name_th": "การศึกษาและการฝึกอบรม",
        "icon": "graduation-cap",
        "subcategories": [
            {
                "slug": "online-tutoring",
                "name": "Online Tutoring",
                "skills": [
                    ("lesson-planning", "Lesson Planning"),
                    ("online-teaching", "Online Teaching"),
                ],
            },
            {
                "slug": "course-creation",
                "name": "Course Creation",
                "skills": [
                    ("curriculum-design", "Curriculum Design"),
                    ("course-recording", "Course Recording"),
                ],
            },
        ],
    },
]


def _seed_uuid(scope: str, slug: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"lancefy-seed:{scope}:{slug}")


def upgrade() -> None:
    now = dt.datetime.utcnow()

    categories_table = sa.table(
        "categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("icon", sa.String()),
        sa.column("created_at", sa.DateTime()),
    )
    category_translations_table = sa.table(
        "category_translations",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("category_id", postgresql.UUID(as_uuid=True)),
        sa.column("locale", sa.String()),
        sa.column("name", sa.String()),
    )
    subcategories_table = sa.table(
        "subcategories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("category_id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("created_at", sa.DateTime()),
    )
    skills_table = sa.table(
        "skills",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("created_at", sa.DateTime()),
    )
    subcategory_skills_table = sa.table(
        "subcategory_skills",
        sa.column("subcategory_id", postgresql.UUID(as_uuid=True)),
        sa.column("skill_id", postgresql.UUID(as_uuid=True)),
    )

    category_rows: list[dict] = []
    category_translation_rows: list[dict] = []
    subcategory_rows: list[dict] = []
    skill_rows: list[dict] = []
    subcategory_skill_rows: list[dict] = []
    inserted_skill_slugs: set[str] = set()

    for category in CATALOG:
        category_id = _seed_uuid("category", category["slug"])
        category_rows.append(
            {
                "id": category_id,
                "name": category["name"],
                "slug": category["slug"],
                "icon": category["icon"],
                "created_at": now,
            }
        )
        category_translation_rows.extend(
            [
                {
                    "id": _seed_uuid("category-translation", f"{category['slug']}:en"),
                    "category_id": category_id,
                    "locale": "en",
                    "name": category["name"],
                },
                {
                    "id": _seed_uuid("category-translation", f"{category['slug']}:th"),
                    "category_id": category_id,
                    "locale": "th",
                    "name": category["name_th"],
                },
            ]
        )

        for subcategory in category["subcategories"]:
            subcategory_id = _seed_uuid("subcategory", subcategory["slug"])
            subcategory_rows.append(
                {
                    "id": subcategory_id,
                    "category_id": category_id,
                    "name": subcategory["name"],
                    "slug": subcategory["slug"],
                    "created_at": now,
                }
            )

            for skill_slug, skill_name in subcategory["skills"]:
                skill_id = _seed_uuid("skill", skill_slug)
                if skill_slug not in inserted_skill_slugs:
                    skill_rows.append(
                        {
                            "id": skill_id,
                            "name": skill_name,
                            "slug": skill_slug,
                            "created_at": now,
                        }
                    )
                    inserted_skill_slugs.add(skill_slug)
                subcategory_skill_rows.append(
                    {
                        "subcategory_id": subcategory_id,
                        "skill_id": skill_id,
                    }
                )

    op.bulk_insert(categories_table, category_rows)
    op.bulk_insert(category_translations_table, category_translation_rows)
    op.bulk_insert(subcategories_table, subcategory_rows)
    op.bulk_insert(skills_table, skill_rows)
    op.bulk_insert(subcategory_skills_table, subcategory_skill_rows)


def downgrade() -> None:
    category_slugs = [category["slug"] for category in CATALOG]
    subcategory_slugs = [
        subcategory["slug"]
        for category in CATALOG
        for subcategory in category["subcategories"]
    ]
    skill_slugs = [
        skill_slug
        for category in CATALOG
        for subcategory in category["subcategories"]
        for skill_slug, _ in subcategory["skills"]
    ]

    op.execute(
        sa.text(
            """
            DELETE FROM subcategory_skills
            WHERE subcategory_id IN (
                SELECT id FROM subcategories WHERE slug = ANY(:subcategory_slugs)
            )
            OR skill_id IN (
                SELECT id FROM skills WHERE slug = ANY(:skill_slugs)
            )
            """
        ).bindparams(
            sa.bindparam("subcategory_slugs", value=subcategory_slugs, type_=postgresql.ARRAY(sa.String())),
            sa.bindparam("skill_slugs", value=skill_slugs, type_=postgresql.ARRAY(sa.String())),
        )
    )
    op.execute(
        sa.text(
            """
            DELETE FROM category_translations
            WHERE category_id IN (
                SELECT id FROM categories WHERE slug = ANY(:category_slugs)
            )
            """
        ).bindparams(
            sa.bindparam("category_slugs", value=category_slugs, type_=postgresql.ARRAY(sa.String()))
        )
    )
    op.execute(
        sa.text("DELETE FROM subcategories WHERE slug = ANY(:subcategory_slugs)").bindparams(
            sa.bindparam("subcategory_slugs", value=subcategory_slugs, type_=postgresql.ARRAY(sa.String()))
        )
    )
    op.execute(
        sa.text("DELETE FROM skills WHERE slug = ANY(:skill_slugs)").bindparams(
            sa.bindparam("skill_slugs", value=skill_slugs, type_=postgresql.ARRAY(sa.String()))
        )
    )
    op.execute(
        sa.text("DELETE FROM categories WHERE slug = ANY(:category_slugs)").bindparams(
            sa.bindparam("category_slugs", value=category_slugs, type_=postgresql.ARRAY(sa.String()))
        )
    )
