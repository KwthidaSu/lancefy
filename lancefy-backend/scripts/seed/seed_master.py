"""
seed_master.py — Clean-DB seed script
======================================
Loads all reference + demo data from seed_data/*.json into a fresh database.

Run from inside the container or locally (with DATABASE_URL set):
    python scripts/seed/seed_master.py

Options:
    --ref-only    Seed only reference data (categories, subcategories, skills)
                  Skip demo users/jobs/proposals

The script is fully IDEMPOTENT — safe to run multiple times.
Existing rows (matched by id) are skipped, not duplicated.

Seeding order (respects FK deps):
  1. categories
  2. subcategories
  3. skills
  4. subcategory_skills  (junction)
  5. users
  6. user_freelance_skills  (freelancer profiles)
  7. user_skills      (junction: user ↔ skill)
  8. jobs
  9. job_skills       (junction: job ↔ skill)
"""

import json
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import SessionLocal
from app.skills.models import Category, Subcategory, Skill, SubcategorySkill, UserSkill
from app.users.models import User, UserFreelanceSkill
from app.jobs.models import Job, JobSkill
# Import all models that are referenced via relationships so SQLAlchemy's
# mapper registry can resolve them before configuring mappers.
from app.projects.models import Project  # noqa: F401 — required for Proposal.project relationship
from app.disputes.models import Dispute  # noqa: F401
from app.reviews.models import Review    # noqa: F401

# ─────────────────────────────────────────────────────────────────
DATA_DIR = BACKEND_ROOT / "seed_data"
NOW = datetime.utcnow()

REF_ONLY = "--ref-only" in sys.argv


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _load(filename: str) -> list | dict:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def _uid(raw: str) -> uuid.UUID:
    return uuid.UUID(raw)


# ─────────────────────────────────────────────────────────────────
# 1. Categories + 2. Subcategories
# ─────────────────────────────────────────────────────────────────

def seed_categories(db: Session) -> dict[str, uuid.UUID]:
    """Returns slug → UUID map for subcategories (used later by skills/jobs)."""
    data = _load("categories.json")
    cat_added = 0
    sub_added = 0
    subcat_map: dict[str, uuid.UUID] = {}

    for cat in data:
        cat_id = _uid(cat["id"])
        if not db.get(Category, cat_id):
            db.add(Category(
                id=cat_id,
                name=cat["name"],
                slug=cat["slug"],
                icon=cat.get("icon"),
                created_at=NOW,
            ))
            cat_added += 1

        for sub in cat.get("subcategories", []):
            sub_id = _uid(sub["id"])
            subcat_map[sub["slug"]] = sub_id
            if not db.get(Subcategory, sub_id):
                db.add(Subcategory(
                    id=sub_id,
                    category_id=cat_id,
                    name=sub["name"],
                    slug=sub["slug"],
                    created_at=NOW,
                ))
                sub_added += 1

    db.commit()
    print(f"  categories:    +{cat_added} added")
    print(f"  subcategories: +{sub_added} added")
    return subcat_map


# ─────────────────────────────────────────────────────────────────
# 3. Skills + 4. SubcategorySkill junction
# ─────────────────────────────────────────────────────────────────

def seed_skills(db: Session, subcat_map: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    """Returns skill slug → UUID map."""
    data = _load("skills.json")
    skill_added = 0
    link_added = 0
    skill_map: dict[str, uuid.UUID] = {}

    for item in data:
        skill_id = _uid(item["id"])
        skill_map[item["slug"]] = skill_id

        if not db.get(Skill, skill_id):
            db.add(Skill(
                id=skill_id,
                name=item["name"],
                slug=item["slug"],
                created_at=NOW,
            ))
            skill_added += 1

        for sub_slug in item.get("subcategories", []):
            sub_id = subcat_map.get(sub_slug)
            if not sub_id:
                print(f"  WARNING: subcategory slug '{sub_slug}' not found — skipping")
                continue
            existing = (
                db.query(SubcategorySkill)
                .filter_by(subcategory_id=sub_id, skill_id=skill_id)
                .first()
            )
            if not existing:
                db.add(SubcategorySkill(subcategory_id=sub_id, skill_id=skill_id))
                link_added += 1

    db.commit()
    print(f"  skills:            +{skill_added} added")
    print(f"  subcategory_skills:+{link_added} added")
    return skill_map


# ─────────────────────────────────────────────────────────────────
# 5. Users + 6. UserFreelanceSkill + 7. UserSkill
# ─────────────────────────────────────────────────────────────────

def seed_users(db: Session, skill_map: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    """Returns username → user UUID map."""
    data = _load("users.json")
    user_map: dict[str, uuid.UUID] = {}
    user_added = 0
    profile_added = 0
    skill_link_added = 0

    all_users = data.get("clients", []) + data.get("freelancers", [])

    # Pass 1: insert User rows and flush so FKs resolve in pass 2
    for u in all_users:
        user_id = _uid(u["id"])
        user_map[u["username"]] = user_id

        if not db.get(User, user_id):
            db.add(User(
                id=user_id,
                keycloak_user_id=_uid(u["keycloak_user_id"]),
                email=u["email"],
                username=u["username"],
                firstname=u["firstname"],
                lastname=u["lastname"],
                bio=u.get("bio"),
                status=u.get("status", "active"),
                email_verified=True,
                created_at=NOW,
                updated_at=NOW,
            ))
            user_added += 1

    db.flush()  # write users to DB before inserting FK-dependent rows

    # Pass 2: freelance profiles + skills
    for u in all_users:
        user_id = _uid(u["id"])

        # Freelance profile
        profile = u.get("freelance_profile")
        if profile:
            existing_profile = (
                db.query(UserFreelanceSkill).filter_by(user_id=user_id).first()
            )
            if not existing_profile:
                db.add(UserFreelanceSkill(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    tagline=profile.get("tagline"),
                    hourly_rate=profile.get("hourly_rate"),
                    is_public=profile.get("is_public", False),
                    created_at=NOW,
                    updated_at=NOW,
                ))
                profile_added += 1

        # UserSkill links
        for slug in u.get("skills", []):
            skill_id = skill_map.get(slug)
            if not skill_id:
                print(f"  WARNING: skill slug '{slug}' not found — skipping")
                continue
            existing_link = (
                db.query(UserSkill)
                .filter_by(user_id=user_id, skill_id=skill_id)
                .first()
            )
            if not existing_link:
                db.add(UserSkill(
                    user_id=user_id,
                    skill_id=skill_id,
                    created_at=NOW,
                ))
                skill_link_added += 1

    db.commit()
    print(f"  users:             +{user_added} added")
    print(f"  freelance_profiles:+{profile_added} added")
    print(f"  user_skills:       +{skill_link_added} added")
    return user_map


# ─────────────────────────────────────────────────────────────────
# 8. Jobs + 9. JobSkill
# ─────────────────────────────────────────────────────────────────

def seed_jobs(
    db: Session,
    user_map: dict[str, uuid.UUID],
    skill_map: dict[str, uuid.UUID],
    subcat_map: dict[str, uuid.UUID],
) -> None:
    data = _load("jobs.json")

    # Build category slug → id from DB (re-query to be safe)
    cat_slug_map: dict[str, uuid.UUID] = {
        row.slug: row.id for row in db.query(Category).all()
    }
    subcat_slug_map: dict[str, uuid.UUID] = {
        row.slug: row.id for row in db.query(Subcategory).all()
    }

    job_added = 0
    skill_link_added = 0

    for j in data:
        job_id = _uid(j["id"])
        if db.get(Job, job_id):
            continue

        owner_id = user_map.get(j["owner"])
        if not owner_id:
            print(f"  WARNING: owner username '{j['owner']}' not found — skipping job")
            continue

        delivery_days = j.get("delivery_days", 30)
        db.add(Job(
            id=job_id,
            owner_id=owner_id,
            job_type=j.get("job_type", "hire"),
            title=j["title"],
            description=j.get("description"),
            budget=j.get("budget"),
            images=j.get("images", []),
            category_id=cat_slug_map.get(j.get("category_slug", "")),
            subcategory_id=subcat_slug_map.get(j.get("subcategory_slug", "")),
            status=j.get("status", "open"),
            delivery_date=(datetime.utcnow() + timedelta(days=delivery_days)).date(),
            created_at=NOW - timedelta(days=3),
            published_at=NOW - timedelta(days=3),
            updated_at=NOW - timedelta(days=3),
        ))
        job_added += 1

        for slug in j.get("skills", []):
            skill_id = skill_map.get(slug)
            if not skill_id:
                print(f"  WARNING: skill slug '{slug}' not found — skipping")
                continue
            db.add(JobSkill(job_id=job_id, skill_id=skill_id))
            skill_link_added += 1

    db.commit()
    print(f"  jobs:      +{job_added} added")
    print(f"  job_skills:+{skill_link_added} added")


# ─────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────

def main() -> None:
    db: Session = SessionLocal()
    try:
        print("\n===== seed_master.py =====")
        print(f"Mode: {'REF ONLY' if REF_ONLY else 'FULL (ref + demo)'}\n")

        print("[1/3] Seeding reference taxonomy...")
        subcat_map = seed_categories(db)

        print("\n[2/3] Seeding skills...")
        skill_map = seed_skills(db, subcat_map)

        if not REF_ONLY:
            print("\n[3/3] Seeding demo users + jobs...")
            user_map = seed_users(db, skill_map)
            seed_jobs(db, user_map, skill_map, subcat_map)

        print("\n===== Done ✓ =====\n")

    except Exception as exc:
        db.rollback()
        print(f"\nERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
