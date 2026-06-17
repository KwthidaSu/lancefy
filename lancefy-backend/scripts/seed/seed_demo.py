"""
seed_demo.py — Complete Demo Data Seeder for LanceFy Presentation

รัน command นี้จาก lancefy-backend directory:
    python scripts/seed/seed_demo.py

จะทำการ seed ข้อมูล demo ครบทุก table ได้แก่:
  ✅ users            — 4 clients + 5 freelancers (profiles ครบ)
  ✅ categories       — 8 หมวดหมู่งาน
  ✅ jobs             — 10+ งานบน job board (หลากหลาย category)
  ✅ job_offers       — offers กับสถานะต่างๆ (pending/accepted/rejected)
  ✅ job_assignments  — 4 สัญญาจ้าง (in_progress, in_progress, completed, in_progress)
  ✅ job_milestones   — milestones ที่มีสถานะต่างๆ (funded/submitted/approved/released)
  ✅ milestone_submissions — งานที่ freelancer ส่งมอบ
  ✅ transactions     — รายการ escrow hold/release
  ✅ chat_rooms       — ห้องแชทแต่ละโปรเจกต์
  ✅ chat_participants
  ✅ chat_messages    — ประวัติสนทนา
  ✅ notifications    — แจ้งเตือนหลากหลายประเภท
  ✅ portfolio_items  — ผลงาน portfolio ของ freelancer
  ✅ reviews          — รีวิวโปรเจกต์ที่เสร็จแล้ว
  ✅ disputes         — 1 dispute ที่กำลัง reviewing
  ✅ evidences        — หลักฐานใน dispute

NOTE: Script เป็น IDEMPOTENT — ถ้ารัน 2 ครั้ง จะข้าม records ที่มีอยู่แล้ว
      รัน scripts/seed/seed.py ก่อนหากต้องการ job board data เพิ่มเติม (ไม่บังคับ)
"""

import sys
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import SessionLocal, engine, Base

# Import all models so Base.metadata knows about every table
import app.portfolio.models  # noqa: F401
import app.reviews.models    # noqa: F401
import app.disputes.models   # noqa: F401
from app.users.models import User
from app.projects.models import (
    Category,
    CategoryTranslation,
    Job,
    JobCategory,
    JobOffer,
    JobAssignment,
    JobMilestone,
    MilestoneSubmission,
    Transaction,
)
from app.chat.models import ChatRoom, ChatParticipant, Message
from app.notifications.models import Notification
from app.portfolio.models import PortfolioItem
from app.reviews.models import Review
from app.disputes.models import Dispute, Evidence

# ─────────────────────────────────────────────────────────────────────────────
# Fixed stable UUIDs
# ─────────────────────────────────────────────────────────────────────────────

NOW = datetime.utcnow()

# --- Categories ---
CAT = {
    "uiux":         uuid.UUID("00000001-0000-0000-0000-000000000001"),
    "branding":     uuid.UUID("00000001-0000-0000-0000-000000000002"),
    "webdev":       uuid.UUID("00000001-0000-0000-0000-000000000003"),
    "illustration": uuid.UUID("00000001-0000-0000-0000-000000000004"),
    "marketing":    uuid.UUID("00000001-0000-0000-0000-000000000005"),
    "video":        uuid.UUID("00000001-0000-0000-0000-000000000006"),
    "writing":      uuid.UUID("00000001-0000-0000-0000-000000000007"),
    "photo":        uuid.UUID("00000001-0000-0000-0000-000000000008"),
}

# --- Users (DB id) ---
U = {
    "client_a":    uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001"),
    "client_b":    uuid.UUID("aaaaaaaa-0000-0000-0000-000000000002"),
    "client_c":    uuid.UUID("aaaaaaaa-0000-0000-0000-000000000003"),
    "client_d":    uuid.UUID("aaaaaaaa-0000-0000-0000-000000000004"),
    "fl_1":        uuid.UUID("aaaaaaaa-0000-0000-0000-000000000011"),  # มินตรา (UI/UX)
    "fl_2":        uuid.UUID("aaaaaaaa-0000-0000-0000-000000000012"),  # กฤต (Web Dev)
    "fl_3":        uuid.UUID("aaaaaaaa-0000-0000-0000-000000000013"),  # เอม (Illustration)
    "fl_4":        uuid.UUID("aaaaaaaa-0000-0000-0000-000000000014"),  # ภัทร (Video)
    "fl_5":        uuid.UUID("aaaaaaaa-0000-0000-0000-000000000015"),  # น้อง (Writing)
}

KC = {  # Keycloak sub IDs (fake, for DB record; replace when using real Keycloak)
    "client_a":    uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001"),
    "client_b":    uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002"),
    "client_c":    uuid.UUID("bbbbbbbb-0000-0000-0000-000000000003"),
    "client_d":    uuid.UUID("bbbbbbbb-0000-0000-0000-000000000004"),
    "fl_1":        uuid.UUID("bbbbbbbb-0000-0000-0000-000000000011"),
    "fl_2":        uuid.UUID("bbbbbbbb-0000-0000-0000-000000000012"),
    "fl_3":        uuid.UUID("bbbbbbbb-0000-0000-0000-000000000013"),
    "fl_4":        uuid.UUID("bbbbbbbb-0000-0000-0000-000000000014"),
    "fl_5":        uuid.UUID("bbbbbbbb-0000-0000-0000-000000000015"),
}

# --- Jobs ---
JOB = {
    "ecommerce":    uuid.UUID("cccccccc-0000-0000-0000-000000000002"),  # active → assigned to fl_2
    "ui_mobile":    uuid.UUID("cccccccc-0000-0000-0000-000000000001"),  # active → assigned to fl_1
    "illustration": uuid.UUID("cccccccc-0000-0000-0000-000000000004"),  # complete → fl_3
    "branding":     uuid.UUID("cccccccc-0000-0000-0000-000000000003"),  # active (disputed) → fl_1
    "video":        uuid.UUID("cccccccc-0000-0000-0000-000000000006"),  # open (no assignment)
    "marketing":    uuid.UUID("cccccccc-0000-0000-0000-000000000005"),  # open
    "api_dev":      uuid.UUID("cccccccc-0000-0000-0000-000000000007"),  # open
    "writing":      uuid.UUID("cccccccc-0000-0000-0000-000000000008"),  # open
    "hr_dash":      uuid.UUID("cccccccc-0000-0000-0000-000000000009"),  # open
    "design_sys":   uuid.UUID("cccccccc-0000-0000-0000-000000000010"),  # open
}

# --- Assignments ---
ASSIGN = {
    "ecommerce":    uuid.UUID("eeeeeeee-0000-0000-0000-000000000001"),
    "ui_mobile":    uuid.UUID("eeeeeeee-0000-0000-0000-000000000002"),
    "illustration": uuid.UUID("eeeeeeee-0000-0000-0000-000000000003"),
    "branding":     uuid.UUID("eeeeeeee-0000-0000-0000-000000000004"),
}

# --- Milestones ---
M = {
    # E-Commerce (3 milestones: released, submitted+reviewing, funded)
    "eco_m1": uuid.UUID("ffffffff-0000-0000-0000-000000000001"),
    "eco_m2": uuid.UUID("ffffffff-0000-0000-0000-000000000002"),
    "eco_m3": uuid.UUID("ffffffff-0000-0000-0000-000000000003"),
    # UI Mobile (2 milestones: submitted+reviewing, awaiting_funding)
    "mob_m1": uuid.UUID("ffffffff-0000-0000-0000-000000000011"),
    "mob_m2": uuid.UUID("ffffffff-0000-0000-0000-000000000012"),
    # Illustration (2 milestones: released, released)
    "ill_m1": uuid.UUID("ffffffff-0000-0000-0000-000000000021"),
    "ill_m2": uuid.UUID("ffffffff-0000-0000-0000-000000000022"),
    # Branding (2 milestones: submitted→disputed, awaiting_funding)
    "brd_m1": uuid.UUID("ffffffff-0000-0000-0000-000000000031"),
    "brd_m2": uuid.UUID("ffffffff-0000-0000-0000-000000000032"),
}

# --- Other IDs ---
SUB = {
    "eco_m1_s1": uuid.UUID("a1a1a1a1-0000-0000-0000-000000000001"),
    "eco_m2_s1": uuid.UUID("a1a1a1a1-0000-0000-0000-000000000002"),
    "mob_m1_s1": uuid.UUID("a1a1a1a1-0000-0000-0000-000000000011"),
    "ill_m1_s1": uuid.UUID("a1a1a1a1-0000-0000-0000-000000000021"),
    "ill_m2_s1": uuid.UUID("a1a1a1a1-0000-0000-0000-000000000022"),
    "brd_m1_s1": uuid.UUID("a1a1a1a1-0000-0000-0000-000000000031"),
}

ROOM = {
    "eco":  uuid.UUID("b2b2b2b2-0000-0000-0000-000000000001"),
    "mob":  uuid.UUID("b2b2b2b2-0000-0000-0000-000000000002"),
    "ill":  uuid.UUID("b2b2b2b2-0000-0000-0000-000000000003"),
    "brd":  uuid.UUID("b2b2b2b2-0000-0000-0000-000000000004"),
    "dm_a1_fl2": uuid.UUID("b2b2b2b2-0000-0000-0000-000000000011"),  # DM client_a ↔ fl_2
    "dm_b_fl1":  uuid.UUID("b2b2b2b2-0000-0000-0000-000000000012"),  # DM client_b ↔ fl_1
}

DISPUTE_ID = uuid.UUID("c3c3c3c3-0000-0000-0000-000000000001")

# ─────────────────────────────────────────────────────────────────────────────
# 1. CATEGORIES
# ─────────────────────────────────────────────────────────────────────────────

CATEGORIES = [
    {"id": CAT["uiux"],         "code": "uiux",         "type": "skill", "en": "UI / UX",               "th": "UI / UX ดีไซน์"},
    {"id": CAT["branding"],     "code": "branding",     "type": "skill", "en": "Branding",               "th": "ออกแบบแบรนด์"},
    {"id": CAT["webdev"],       "code": "webdev",       "type": "skill", "en": "Web Development",        "th": "พัฒนาเว็บไซต์"},
    {"id": CAT["illustration"], "code": "illustration", "type": "skill", "en": "Illustration",           "th": "วาดภาพประกอบ"},
    {"id": CAT["marketing"],    "code": "marketing",    "type": "skill", "en": "Digital Marketing",      "th": "การตลาดดิจิทัล"},
    {"id": CAT["video"],        "code": "video",        "type": "skill", "en": "Video & Animation",      "th": "วิดีโอ & แอนิเมชัน"},
    {"id": CAT["writing"],      "code": "writing",      "type": "skill", "en": "Writing & Translation",  "th": "เขียนและแปลเนื้อหา"},
    {"id": CAT["photo"],        "code": "photo",        "type": "skill", "en": "Photography",            "th": "ถ่ายภาพ"},
]

# ─────────────────────────────────────────────────────────────────────────────
# 2. USERS
# ─────────────────────────────────────────────────────────────────────────────

USERS = [
    # ── Clients ──
    {
        "id": U["client_a"], "kc": KC["client_a"],
        "email": "somchai@demo.lancefy.io", "username": "somchai_client",
        "firstname": "สมชาย", "lastname": "ใจดี",
        "role": "client",
        "bio": "เจ้าของธุรกิจ E-Commerce และ SaaS Startup ชอบงานคุณภาพสูง",
        "skills": [], "hourly_rate": None, "is_public": False,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=somchai",
    },
    {
        "id": U["client_b"], "kc": KC["client_b"],
        "email": "nattaporn@demo.lancefy.io", "username": "nattaporn_biz",
        "firstname": "ณัฐภรณ์", "lastname": "วงศ์รุ่งเรือง",
        "role": "client",
        "bio": "Creative Director บริษัทสื่อและโฆษณา มองหา freelancer ที่มีไอเดียสร้างสรรค์",
        "skills": [], "hourly_rate": None, "is_public": False,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=nattaporn",
    },
    {
        "id": U["client_c"], "kc": KC["client_c"],
        "email": "prayuth@demo.lancefy.io", "username": "prayuth_startup",
        "firstname": "ประยุทธ์", "lastname": "สตาร์ทอัพ",
        "role": "client",
        "bio": "Co-founder ของ Tech Startup ด้าน HR-Tech กำลัง scale product",
        "skills": [], "hourly_rate": None, "is_public": False,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=prayuth",
    },
    {
        "id": U["client_d"], "kc": KC["client_d"],
        "email": "siriporn@demo.lancefy.io", "username": "siriporn_corp",
        "firstname": "ศิริพร", "lastname": "คอร์ปอเรท",
        "role": "client",
        "bio": "IT Manager บริษัทขนาดกลาง ดูแลโปรเจกต์ digital transformation",
        "skills": [], "hourly_rate": None, "is_public": False,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=siriporn",
    },
    # ── Freelancers ──
    {
        "id": U["fl_1"], "kc": KC["fl_1"],
        "email": "mintra@demo.lancefy.io", "username": "mintra_design",
        "firstname": "มินตรา", "lastname": "ศิลปกร",
        "role": "freelancer",
        "bio": "UI/UX Designer 5 ปีประสบการณ์ เชี่ยวชาญ Fintech, Healthcare และ E-Commerce ทำงานด้วยแนวคิด User-Centered Design ใช้ Figma + Prototyping + Usability Testing",
        "skills": ["UI/UX", "Figma", "User Research", "Prototyping", "Design System", "Mobile Design"],
        "hourly_rate": 1200.0, "is_public": True,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=mintra",
    },
    {
        "id": U["fl_2"], "kc": KC["fl_2"],
        "email": "krit@demo.lancefy.io", "username": "krit_dev",
        "firstname": "กฤต", "lastname": "โค้ดดี",
        "role": "freelancer",
        "bio": "Full-Stack Developer 6 ปี เชี่ยวชาญ React, Next.js, FastAPI, PostgreSQL ทำงาน E-Commerce, SaaS และ API integrations. มี CI/CD, Docker, Cloud deployment",
        "skills": ["React", "Next.js", "FastAPI", "Python", "PostgreSQL", "Docker", "TypeScript"],
        "hourly_rate": 1500.0, "is_public": True,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=krit",
    },
    {
        "id": U["fl_3"], "kc": KC["fl_3"],
        "email": "aim@demo.lancefy.io", "username": "aim_creative",
        "firstname": "เอม", "lastname": "ครีเอทีฟ",
        "role": "freelancer",
        "bio": "Illustrator & Character Designer 4 ปี ถนัดสไตล์ Kawaii/Cute, Anime, Children Book ส่งงานตรงเวลา ไฟล์ครบทุก format",
        "skills": ["Illustration", "Character Design", "Procreate", "Adobe Illustrator", "Children Book"],
        "hourly_rate": 900.0, "is_public": True,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=aim",
    },
    {
        "id": U["fl_4"], "kc": KC["fl_4"],
        "email": "pat@demo.lancefy.io", "username": "pat_motion",
        "firstname": "ภัทร", "lastname": "มูฟวิ่ง",
        "role": "freelancer",
        "bio": "Motion Designer & Video Editor After Effects 5 ปี เชี่ยวชาญ Explainer Video, Corporate Video, Social Media Content",
        "skills": ["Motion Design", "After Effects", "Premiere Pro", "Video Editing", "2D Animation"],
        "hourly_rate": 1100.0, "is_public": True,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=pat",
    },
    {
        "id": U["fl_5"], "kc": KC["fl_5"],
        "email": "nong@demo.lancefy.io", "username": "nong_writer",
        "firstname": "น้อง", "lastname": "นักเขียน",
        "role": "freelancer",
        "bio": "Content Writer & Translator TH/EN 3 ปี เขียน SEO blog, copywriting, technical writing รับแปลเอกสารกฎหมายและธุรกิจ",
        "skills": ["Copywriting", "SEO Writing", "Translation", "Content Strategy", "Blog Writing"],
        "hourly_rate": 700.0, "is_public": True,
        "avatar_url": "https://api.dicebear.com/7.x/thumbs/svg?seed=nong",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# 3. JOBS (Job Board)
# ─────────────────────────────────────────────────────────────────────────────

JOBS = [
    # ── Active jobs (have assignments) ──
    {
        "id": JOB["ecommerce"], "owner": U["client_a"],
        "title": "พัฒนาเว็บไซต์ E-Commerce ด้วย Next.js + FastAPI",
        "description": "ต้องการ Full-stack developer พัฒนาร้านค้าออนไลน์ Next.js 14 + FastAPI + PostgreSQL มี product listing, cart, checkout, order management และ admin panel",
        "budget": 80000, "currency": "THB", "status": "active",
        "deadline_date": date.today() + timedelta(days=30),
        "published_at": NOW - timedelta(days=20),
        "cats": ["webdev"],
        "images": ["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"],
    },
    {
        "id": JOB["ui_mobile"], "owner": U["client_b"],
        "title": "ออกแบบ UI/UX สำหรับแอป Mobile Banking",
        "description": "ต้องการนักออกแบบ Fintech UI/UX สำหรับแอปธนาคารบนมือถือ ครอบคลุม onboarding, dashboard, transfer, history และ settings",
        "budget": 45000, "currency": "THB", "status": "active",
        "deadline_date": date.today() + timedelta(days=20),
        "published_at": NOW - timedelta(days=15),
        "cats": ["uiux"],
        "images": ["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80"],
    },
    {
        "id": JOB["illustration"], "owner": U["client_b"],
        "title": "วาดภาพ Illustration ประกอบหนังสือเด็ก 20 ภาพ",
        "description": "ต้องการ Illustrator สไตล์ cute/kawaii วาดภาพประกอบสำหรับหนังสือเด็กอายุ 3-6 ปี จำนวน 20 ภาพ",
        "budget": 18000, "currency": "THB", "status": "complete",
        "deadline_date": date.today() - timedelta(days=10),
        "published_at": NOW - timedelta(days=45),
        "cats": ["illustration"],
        "images": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
    },
    {
        "id": JOB["branding"], "owner": U["client_a"],
        "title": "ออกแบบ Brand Identity สำหรับ Startup F&B",
        "description": "ร้านอาหาร Fusion Thai ต้องการ Brand Identity ครบชุด: Logo, color palette, typography, business card, packaging",
        "budget": 25000, "currency": "THB", "status": "active",
        "deadline_date": date.today() + timedelta(days=10),
        "published_at": NOW - timedelta(days=12),
        "cats": ["branding"],
        "images": ["https://images.unsplash.com/photo-1509343256512-d77a5cb3791b?w=800&q=80"],
    },
    # ── Open jobs (job board, no assignment yet) ──
    {
        "id": JOB["video"], "owner": U["client_b"],
        "title": "ตัดต่อ VDO Content สำหรับ YouTube Channel 4 คลิป",
        "description": "ต้องการตัดต่อวิดีโอ 8-12 นาทีต่อคลิป จำนวน 4 คลิป/เดือน สไตล์ storytelling มี motion graphic ประกอบ subtitle ไทย-อังกฤษ",
        "budget": 12000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=30),
        "published_at": NOW - timedelta(days=3),
        "cats": ["video"],
        "images": ["https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80"],
    },
    {
        "id": JOB["marketing"], "owner": U["client_a"],
        "title": "ทำ SEO และ Content Marketing สำหรับเว็บขายเสื้อผ้า",
        "description": "ต้องการ Digital Marketer วาง strategy SEO on-page/off-page เขียน blog 4 บทความต่อเดือน และดูแล Google Ads budget ระยะ 3 เดือน",
        "budget": 15000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=90),
        "published_at": NOW - timedelta(days=7),
        "cats": ["marketing", "writing"],
        "images": ["https://images.unsplash.com/photo-1432888622747-4eb9a8f2c1a3?w=800&q=80"],
    },
    {
        "id": JOB["api_dev"], "owner": U["client_a"],
        "title": "พัฒนา REST API ระบบจอง Appointment (FastAPI + PostgreSQL)",
        "description": "ต้องการ Backend Developer พัฒนา API ระบบจองนัด รองรับ: สร้าง/แก้ไข/ยกเลิกนัด, email reminder, Google Calendar sync มี unit test",
        "budget": 35000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=25),
        "published_at": NOW - timedelta(days=4),
        "cats": ["webdev"],
        "images": ["https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"],
    },
    {
        "id": JOB["writing"], "owner": U["client_b"],
        "title": "แปลเอกสารกฎหมาย อังกฤษ → ไทย 50 หน้า",
        "description": "ต้องการนักแปลที่มีความเข้าใจศัพท์กฎหมาย แปลสัญญาซื้อขายหุ้นและ NDA ประมาณ 50 หน้า A4 ต้องการความถูกต้องสูง",
        "budget": 8000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=10),
        "published_at": NOW - timedelta(hours=6),
        "cats": ["writing"],
        "images": ["https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80"],
    },
    {
        "id": JOB["hr_dash"], "owner": U["client_c"],
        "title": "Redesign Dashboard ระบบ HR ภายในบริษัท (Figma)",
        "description": "ระบบ HR เดิม UX แย่ ต้องการ UX Designer มาทำ audit และ redesign หน้า dashboard, leave request, payroll slip ให้ใช้ง่ายขึ้น",
        "budget": 30000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=20),
        "published_at": NOW - timedelta(days=1),
        "cats": ["uiux"],
        "images": ["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"],
    },
    {
        "id": JOB["design_sys"], "owner": U["client_d"],
        "title": "ออกแบบ UI Component Library (Design System Figma)",
        "description": "บริษัทต้องการ Design System ครบชุด: Color tokens, Typography, Button, Form, Card, Modal, Table, Navigation ส่งเป็น Figma Auto Layout",
        "budget": 55000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=40),
        "published_at": NOW - timedelta(hours=18),
        "cats": ["uiux"],
        "images": ["https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&q=80"],
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# SEED FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def _exists(db, model, **kwargs):
    return db.query(model).filter_by(**kwargs).first() is not None


def seed_categories(db: Session):
    print("→ [1/12] Categories...")
    added = 0
    for c in CATEGORIES:
        if _exists(db, Category, id=c["id"]):
            continue
        db.add(Category(id=c["id"], code=c["code"], type=c["type"], created_at=NOW))
        db.add(CategoryTranslation(id=uuid.uuid4(), category_id=c["id"], locale="en", name=c["en"]))
        db.add(CategoryTranslation(id=uuid.uuid4(), category_id=c["id"], locale="th", name=c["th"]))
        added += 1
    db.commit()
    print(f"   ✓ {added} categories")


def seed_users(db: Session):
    print("→ [2/12] Users...")
    added = 0
    for u in USERS:
        if _exists(db, User, id=u["id"]):
            # Update profile fields if user already exists (for re-runs on partial data)
            user = db.query(User).filter_by(id=u["id"]).first()
            if not user.role:
                user.role = u["role"]
                user.bio = u["bio"]
                user.skills = u["skills"]
                user.hourly_rate = u["hourly_rate"]
                user.is_public = u["is_public"]
                user.avatar_url = u["avatar_url"]
            continue
        db.add(User(
            id=u["id"],
            keycloak_user_id=u["kc"],
            email=u["email"],
            username=u["username"],
            firstname=u["firstname"],
            lastname=u["lastname"],
            status="active",
            role=u["role"],
            bio=u["bio"],
            skills=u["skills"],
            hourly_rate=u["hourly_rate"],
            is_public=u["is_public"],
            avatar_url=u["avatar_url"],
            created_at=NOW - timedelta(days=60),
            updated_at=NOW,
        ))
        added += 1
    db.commit()
    print(f"   ✓ {added} users")


def seed_jobs(db: Session):
    print("→ [3/12] Jobs + Categories...")
    added = 0
    for j in JOBS:
        if _exists(db, Job, id=j["id"]):
            continue
        db.add(Job(
            id=j["id"],
            owner_id=j["owner"],
            title=j["title"],
            description=j["description"],
            budget=j["budget"],
            currency=j["currency"],
            status=j["status"],
            deadline_date=j["deadline_date"],
            created_at=j["published_at"],
            published_at=j["published_at"],
        ))
        db.flush()
        for c in j["cats"]:
            if not _exists(db, JobCategory, job_id=j["id"], category_id=CAT[c]):
                db.add(JobCategory(job_id=j["id"], category_id=CAT[c]))
        added += 1
    db.commit()
    print(f"   ✓ {added} jobs")


def seed_offers_and_assignments(db: Session):
    print("→ [4/12] Offers & Assignments...")
    offers_added = 0
    assign_added = 0

    # ── Offer data (accepted offers create assignments) ──
    RAW_OFFERS = [
        # E-Commerce: fl_2 accepted, fl_1 pending
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000001"), "job": JOB["ecommerce"], "client": U["client_a"], "fl": U["fl_2"], "budget": 75000, "status": "accepted",
         "msg": "เคยทำ E-Commerce หลายโปรเจกต์ด้วย Next.js + FastAPI โดยตรงครับ ส่งงานตรงเวลา"},
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000002"), "job": JOB["ecommerce"], "client": U["client_a"], "fl": U["fl_5"], "budget": 80000, "status": "rejected",
         "msg": "Full-stack 6 ปีครับ ถนัด Next.js + Docker"},
        # UI Mobile: fl_1 accepted
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000003"), "job": JOB["ui_mobile"], "client": U["client_b"], "fl": U["fl_1"], "budget": 43000, "status": "accepted",
         "msg": "มีประสบการณ์ Fintech UI/UX 3 ปี มี portfolio Mobile Banking ให้ดูได้เลยค่ะ"},
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000004"), "job": JOB["ui_mobile"], "client": U["client_b"], "fl": U["fl_4"], "budget": 45000, "status": "rejected",
         "msg": "ออกแบบ UI motion-forward ครับ"},
        # Illustration: fl_3 accepted (completed)
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000005"), "job": JOB["illustration"], "client": U["client_b"], "fl": U["fl_3"], "budget": 17000, "status": "accepted",
         "msg": "วาดสไตล์ kawaii มาแล้ว มี portfolio หนังสือเด็กที่ผ่านการพิมพ์จริง 3 เล่มค่ะ"},
        # Branding: fl_1 accepted (disputed)
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000006"), "job": JOB["branding"], "client": U["client_a"], "fl": U["fl_1"], "budget": 23000, "status": "accepted",
         "msg": "ออกแบบ Brand F&B มาแล้ว 10+ แบรนด์ ทั้งไทยและต่างประเทศ"},
        # Open jobs — pending offers (job board demo)
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000007"), "job": JOB["video"], "client": U["client_b"], "fl": U["fl_4"], "budget": 11000, "status": "pending",
         "msg": "Motion designer + editor ครับ เคยทำ YouTube channel หลายเจ้า"},
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000008"), "job": JOB["hr_dash"], "client": U["client_c"], "fl": U["fl_1"], "budget": 28000, "status": "pending",
         "msg": "UX audit + redesign คือสิ่งที่ถนัดมากค่ะ เคยทำให้ enterprise หลายบริษัท"},
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000009"), "job": JOB["writing"], "client": U["client_b"], "fl": U["fl_5"], "budget": 7500, "status": "pending",
         "msg": "มีประสบการณ์แปลเอกสารกฎหมายค่ะ ส่งตัวอย่างงานได้"},
        {"id": uuid.UUID("dddddddd-de00-0000-0000-000000000010"), "job": JOB["api_dev"], "client": U["client_a"], "fl": U["fl_2"], "budget": 33000, "status": "pending",
         "msg": "Backend specialist FastAPI + PostgreSQL มีเคส booking system ให้ดู"},
    ]

    for o in RAW_OFFERS:
        if not _exists(db, JobOffer, id=o["id"]):
            db.add(JobOffer(
                id=o["id"],
                job_id=o["job"],
                client_id=o["client"],
                freelancer_id=o["fl"],
                offer_type="proposal",
                proposed_budget=o["budget"],
                currency="THB",
                message=o["msg"],
                status=o["status"],
                responded_at=NOW - timedelta(days=14) if o["status"] != "pending" else None,
                created_at=NOW - timedelta(days=16),
                updated_at=NOW - timedelta(days=14),
            ))
            offers_added += 1

    db.commit()

    # ── Assignments ──
    ASSIGN_DATA = [
        {
            "id": ASSIGN["ecommerce"], "job": JOB["ecommerce"],
            "client": U["client_a"], "fl": U["fl_2"],
            "status": "in_progress", "created_at": NOW - timedelta(days=14),
        },
        {
            "id": ASSIGN["ui_mobile"], "job": JOB["ui_mobile"],
            "client": U["client_b"], "fl": U["fl_1"],
            "status": "in_progress", "created_at": NOW - timedelta(days=12),
        },
        {
            "id": ASSIGN["illustration"], "job": JOB["illustration"],
            "client": U["client_b"], "fl": U["fl_3"],
            "status": "completed", "created_at": NOW - timedelta(days=40),
            "completed_at": NOW - timedelta(days=5),
        },
        {
            "id": ASSIGN["branding"], "job": JOB["branding"],
            "client": U["client_a"], "fl": U["fl_1"],
            "status": "in_progress", "created_at": NOW - timedelta(days=10),
        },
    ]

    for a in ASSIGN_DATA:
        if not _exists(db, JobAssignment, id=a["id"]):
            db.add(JobAssignment(
                id=a["id"],
                job_id=a["job"],
                client_id=a["client"],
                freelancer_id=a["fl"],
                status=a["status"],
                completed_at=a.get("completed_at"),
                client_completion_confirmed_at=a.get("completed_at"),
                freelancer_completion_confirmed_at=a.get("completed_at"),
                created_at=a["created_at"],
            ))
            assign_added += 1

    db.commit()
    print(f"   ✓ {offers_added} offers, {assign_added} assignments")


def seed_milestones(db: Session):
    print("→ [5/12] Milestones & Submissions...")
    added = 0

    MILESTONE_DATA = [
        # ── E-Commerce: 3 milestones ──
        # M1: released (done)
        {
            "id": M["eco_m1"], "assign": ASSIGN["ecommerce"], "seq": 1,
            "title": "Database Schema + Backend API (Auth, Products, Orders)",
            "description": "ออกแบบ database schema, สร้าง FastAPI endpoints ทั้งหมด พร้อม unit tests",
            "amount": 25000, "due_date": date.today() - timedelta(days=7),
            "status": "approved", "funding_status": "released",
            "funded_at": NOW - timedelta(days=12),
            "created_at": NOW - timedelta(days=14),
        },
        # M2: submitted → awaiting review
        {
            "id": M["eco_m2"], "assign": ASSIGN["ecommerce"], "seq": 2,
            "title": "Frontend Next.js: Product Listing, Cart, Checkout",
            "description": "สร้าง UI ด้วย Next.js 14 ต่อ API ครบทุก flow ตั้งแต่ browse จนถึง payment",
            "amount": 35000, "due_date": date.today() + timedelta(days=3),
            "status": "submitted", "funding_status": "funded",
            "funded_at": NOW - timedelta(days=8),
            "created_at": NOW - timedelta(days=14),
        },
        # M3: funded → in progress
        {
            "id": M["eco_m3"], "assign": ASSIGN["ecommerce"], "seq": 3,
            "title": "Admin Panel + Deployment (Docker + Railway)",
            "description": "สร้าง admin dashboard จัดการ products/orders + deploy ขึ้น production",
            "amount": 20000, "due_date": date.today() + timedelta(days=20),
            "status": "pending", "funding_status": "funded",
            "funded_at": NOW - timedelta(days=2),
            "created_at": NOW - timedelta(days=14),
        },
        # ── UI Mobile: 2 milestones ──
        # M1: submitted → awaiting review
        {
            "id": M["mob_m1"], "assign": ASSIGN["ui_mobile"], "seq": 1,
            "title": "UX Research + Wireframes + User Flow",
            "description": "UX audit, user interviews 5 คน, สร้าง wireframe ทุกหน้า และ user flow diagram",
            "amount": 15000, "due_date": date.today() - timedelta(days=2),
            "status": "submitted", "funding_status": "funded",
            "funded_at": NOW - timedelta(days=10),
            "created_at": NOW - timedelta(days=12),
        },
        # M2: awaiting funding
        {
            "id": M["mob_m2"], "assign": ASSIGN["ui_mobile"], "seq": 2,
            "title": "High-Fidelity UI Design + Prototype (Figma)",
            "description": "ออกแบบ UI ครบทุกหน้า สไตล์ Fintech clean มี component library + interactive prototype",
            "amount": 30000, "due_date": date.today() + timedelta(days=15),
            "status": "pending", "funding_status": "unfunded",
            "funded_at": None,
            "created_at": NOW - timedelta(days=12),
        },
        # ── Illustration: 2 milestones (completed) ──
        {
            "id": M["ill_m1"], "assign": ASSIGN["illustration"], "seq": 1,
            "title": "Sketch + Character Design (10 ภาพแรก)",
            "description": "ร่างตัวละครหลักและฉากหลัง 10 ภาพแรก ผ่านการ approve สีและสไตล์",
            "amount": 9000, "due_date": date.today() - timedelta(days=25),
            "status": "approved", "funding_status": "released",
            "funded_at": NOW - timedelta(days=35),
            "created_at": NOW - timedelta(days=40),
        },
        {
            "id": M["ill_m2"], "assign": ASSIGN["illustration"], "seq": 2,
            "title": "Final Illustration ครบ 20 ภาพ + ไฟล์ส่งมอบ",
            "description": "ภาพเต็ม 20 ภาพ สีเต็ม, retouching ครบ, ส่งไฟล์ AI + PNG ความละเอียด 300 DPI",
            "amount": 9000, "due_date": date.today() - timedelta(days=12),
            "status": "approved", "funding_status": "released",
            "funded_at": NOW - timedelta(days=20),
            "created_at": NOW - timedelta(days=40),
        },
        # ── Branding (disputed): 2 milestones ──
        {
            "id": M["brd_m1"], "assign": ASSIGN["branding"], "seq": 1,
            "title": "Logo + Color Palette + Typography",
            "description": "นำเสนอ logo 3 แนวทาง เลือก 1 แนวทาง พัฒนาจนได้ final logo พร้อม brand colors",
            "amount": 12000, "due_date": date.today() - timedelta(days=3),
            "status": "submitted", "funding_status": "funded",
            "funded_at": NOW - timedelta(days=8),
            "created_at": NOW - timedelta(days=10),
        },
        {
            "id": M["brd_m2"], "assign": ASSIGN["branding"], "seq": 2,
            "title": "Brand Guideline + Collateral (Business Card, Packaging)",
            "description": "สร้าง brand guideline document + ออกแบบ business card, packaging template",
            "amount": 13000, "due_date": date.today() + timedelta(days=7),
            "status": "pending", "funding_status": "unfunded",
            "funded_at": None,
            "created_at": NOW - timedelta(days=10),
        },
    ]

    for m in MILESTONE_DATA:
        if not _exists(db, JobMilestone, id=m["id"]):
            db.add(JobMilestone(
                id=m["id"],
                job_assignment_id=m["assign"],
                title=m["title"],
                description=m["description"],
                amount=m["amount"],
                currency="THB",
                sequence=m["seq"],
                due_date=m["due_date"],
                status=m["status"],
                funding_status=m["funding_status"],
                funded_at=m["funded_at"],
                created_at=m["created_at"],
            ))
            added += 1

    db.commit()

    # ── Submissions ──
    subs_added = 0
    SUB_DATA = [
        # eco_m1: approved submission
        {
            "id": SUB["eco_m1_s1"], "milestone": M["eco_m1"], "by": U["fl_2"],
            "message": "ส่งงาน Phase 1 ครบแล้วครับ มี schema diagram, Postman collection และ unit tests 85% coverage แนบมาด้วย",
            "attachments": [
                "https://storage.lancefy.io/demo/eco_schema_v1.pdf",
                "https://storage.lancefy.io/demo/eco_postman_collection.json",
            ],
            "status": "approved", "revision": 1,
            "submitted_at": NOW - timedelta(days=9),
            "reviewed_at": NOW - timedelta(days=8),
        },
        # eco_m2: submitted (pending review)
        {
            "id": SUB["eco_m2_s1"], "milestone": M["eco_m2"], "by": U["fl_2"],
            "message": "ส่ง Frontend ครบแล้วครับ ทำ Product listing, Cart, Checkout flow ทุก step ทดสอบบน staging แล้ว ลิงก์: https://eco-demo.staging.lancefy.io",
            "attachments": ["https://storage.lancefy.io/demo/eco_frontend_screenshots.zip"],
            "status": "submitted", "revision": 1,
            "submitted_at": NOW - timedelta(days=1),
            "reviewed_at": None,
        },
        # mob_m1: submitted (pending review)
        {
            "id": SUB["mob_m1_s1"], "milestone": M["mob_m1"], "by": U["fl_1"],
            "message": "ส่ง UX Research + Wireframes ครบค่ะ มีผลสัมภาษณ์ user 5 คน, affinity map, user flow ครบ 12 หน้า และ wireframe ใน Figma ลิงก์: https://figma.com/demo/banking-wireframes",
            "attachments": [
                "https://storage.lancefy.io/demo/banking_ux_research.pdf",
                "https://storage.lancefy.io/demo/banking_wireframes.fig",
            ],
            "status": "submitted", "revision": 1,
            "submitted_at": NOW - timedelta(hours=18),
            "reviewed_at": None,
        },
        # ill_m1: approved
        {
            "id": SUB["ill_m1_s1"], "milestone": M["ill_m1"], "by": U["fl_3"],
            "message": "ส่ง 10 ภาพแรกค่ะ ร่างตัวละครหลักครบ ผ่านการ review สีและสไตล์แล้ว ปรับตามที่แก้ 2 รอบ",
            "attachments": ["https://storage.lancefy.io/demo/illustration_batch1.zip"],
            "status": "approved", "revision": 2,
            "submitted_at": NOW - timedelta(days=22),
            "reviewed_at": NOW - timedelta(days=20),
        },
        # ill_m2: approved
        {
            "id": SUB["ill_m2_s1"], "milestone": M["ill_m2"], "by": U["fl_3"],
            "message": "ส่ง final ครบ 20 ภาพค่ะ AI + PNG 300 DPI ทุกไฟล์ ตรวจสอบแล้วว่าสีตรงกับ proof ที่ approve ไว้",
            "attachments": [
                "https://storage.lancefy.io/demo/illustration_final_PNG.zip",
                "https://storage.lancefy.io/demo/illustration_final_AI.zip",
            ],
            "status": "approved", "revision": 1,
            "submitted_at": NOW - timedelta(days=13),
            "reviewed_at": NOW - timedelta(days=12),
        },
        # brd_m1: submitted (will be disputed)
        {
            "id": SUB["brd_m1_s1"], "milestone": M["brd_m1"], "by": U["fl_1"],
            "message": "ส่ง Logo 3 แนวทางค่ะ เลือก direction B แล้วพัฒนาเป็น final + color palette และ typography แนบมาด้วย",
            "attachments": ["https://storage.lancefy.io/demo/brand_logo_final.ai"],
            "status": "submitted", "revision": 1,
            "submitted_at": NOW - timedelta(days=4),
            "reviewed_at": None,
            "auto_release_eligible": False,
        },
    ]

    for s in SUB_DATA:
        if not _exists(db, MilestoneSubmission, id=s["id"]):
            db.add(MilestoneSubmission(
                id=s["id"],
                milestone_id=s["milestone"],
                submitted_by=s["by"],
                revision_number=s["revision"],
                message=s["message"],
                attachments=s["attachments"],
                status=s["status"],
                auto_release_eligible=s.get("auto_release_eligible", False),
                submitted_at=s["submitted_at"],
                reviewed_at=s["reviewed_at"],
            ))
            subs_added += 1

    db.commit()
    print(f"   ✓ {added} milestones, {subs_added} submissions")


def seed_transactions(db: Session):
    print("→ [6/12] Transactions...")
    added = 0
    TXNS = [
        # eco_m1: hold → release
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000001"), "user": U["client_a"],
         "assign": ASSIGN["ecommerce"], "milestone": M["eco_m1"],
         "amount": 25000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=12)},
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000002"), "user": U["fl_2"],
         "assign": ASSIGN["ecommerce"], "milestone": M["eco_m1"],
         "amount": 23750, "direction": "credit", "type": "release",  # หัก 5% platform fee
         "created_at": NOW - timedelta(days=8)},
        # eco_m2: hold
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000003"), "user": U["client_a"],
         "assign": ASSIGN["ecommerce"], "milestone": M["eco_m2"],
         "amount": 35000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=8)},
        # eco_m3: hold
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000004"), "user": U["client_a"],
         "assign": ASSIGN["ecommerce"], "milestone": M["eco_m3"],
         "amount": 20000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=2)},
        # mob_m1: hold
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000011"), "user": U["client_b"],
         "assign": ASSIGN["ui_mobile"], "milestone": M["mob_m1"],
         "amount": 15000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=10)},
        # ill_m1: hold → release
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000021"), "user": U["client_b"],
         "assign": ASSIGN["illustration"], "milestone": M["ill_m1"],
         "amount": 9000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=35)},
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000022"), "user": U["fl_3"],
         "assign": ASSIGN["illustration"], "milestone": M["ill_m1"],
         "amount": 8550, "direction": "credit", "type": "release",
         "created_at": NOW - timedelta(days=20)},
        # ill_m2: hold → release
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000023"), "user": U["client_b"],
         "assign": ASSIGN["illustration"], "milestone": M["ill_m2"],
         "amount": 9000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=20)},
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000024"), "user": U["fl_3"],
         "assign": ASSIGN["illustration"], "milestone": M["ill_m2"],
         "amount": 8550, "direction": "credit", "type": "release",
         "created_at": NOW - timedelta(days=12)},
        # brd_m1: hold
        {"id": uuid.UUID("a0000001-0000-0000-0000-000000000031"), "user": U["client_a"],
         "assign": ASSIGN["branding"], "milestone": M["brd_m1"],
         "amount": 12000, "direction": "debit", "type": "hold",
         "created_at": NOW - timedelta(days=8)},
    ]

    for t in TXNS:
        if not _exists(db, Transaction, id=t["id"]):
            db.add(Transaction(
                id=t["id"],
                user_id=t["user"],
                job_assignment_id=t["assign"],
                milestone_id=t["milestone"],
                amount=t["amount"],
                currency="THB",
                direction=t["direction"],
                type=t["type"],
                created_at=t["created_at"],
            ))
            added += 1

    db.commit()
    print(f"   ✓ {added} transactions")


def seed_chat(db: Session):
    print("→ [7/12] Chat Rooms & Messages...")
    rooms_added = msgs_added = 0

    ROOMS = [
        {"id": ROOM["eco"],  "type": "project", "assign": ASSIGN["ecommerce"],  "name": "E-Commerce Project"},
        {"id": ROOM["mob"],  "type": "project", "assign": ASSIGN["ui_mobile"],  "name": "Mobile Banking UI"},
        {"id": ROOM["ill"],  "type": "project", "assign": ASSIGN["illustration"], "name": "Children Book Illustration"},
        {"id": ROOM["brd"],  "type": "project", "assign": ASSIGN["branding"],   "name": "F&B Brand Identity"},
        {"id": ROOM["dm_a1_fl2"], "type": "dm", "assign": None, "name": None},
        {"id": ROOM["dm_b_fl1"],  "type": "dm", "assign": None, "name": None},
    ]

    PARTICIPANTS = [
        (ROOM["eco"],        [U["client_a"], U["fl_2"]]),
        (ROOM["mob"],        [U["client_b"], U["fl_1"]]),
        (ROOM["ill"],        [U["client_b"], U["fl_3"]]),
        (ROOM["brd"],        [U["client_a"], U["fl_1"]]),
        (ROOM["dm_a1_fl2"],  [U["client_a"], U["fl_2"]]),
        (ROOM["dm_b_fl1"],   [U["client_b"], U["fl_1"]]),
    ]

    MESSAGES = [
        # E-Commerce Project Chat
        (ROOM["eco"], U["client_a"], NOW - timedelta(days=13), "ยินดีต้อนรับครับ กฤต! ขอบคุณที่รับงานนะครับ"),
        (ROOM["eco"], U["fl_2"],     NOW - timedelta(days=13, hours=-1), "ขอบคุณที่มอบความไว้วางใจนะครับ ผมเริ่มทำ database schema ก่อนเลยครับ"),
        (ROOM["eco"], U["client_a"], NOW - timedelta(days=12), "โอเคครับ มีคำถามอะไรก็ถามได้เลยนะ"),
        (ROOM["eco"], U["fl_2"],     NOW - timedelta(days=10), "ส่ง ERD diagram มาให้ check ก่อนนะครับ ก่อนเริ่ม implement จริง"),
        (ROOM["eco"], U["client_a"], NOW - timedelta(days=10, hours=-2), "ดูแล้ว โอเคเลยครับ แต่เพิ่ม `discount_code` table ด้วยได้ไหม?"),
        (ROOM["eco"], U["fl_2"],     NOW - timedelta(days=9),  "เพิ่มให้แล้วครับ ✅ กำลัง implement API"),
        (ROOM["eco"], U["fl_2"],     NOW - timedelta(days=8),  "ส่งงาน Phase 1 แล้วนะครับ ดูได้เลย"),
        (ROOM["eco"], U["client_a"], NOW - timedelta(days=8, hours=-3), "ตรวจแล้ว ผ่านครับ! approve เลย 🎉 release เงินให้แล้ว"),
        (ROOM["eco"], U["fl_2"],     NOW - timedelta(days=1),  "ส่งงาน Phase 2 (Frontend) แล้วนะครับ staging: https://eco-demo.staging.lancefy.io"),
        (ROOM["eco"], U["client_a"], NOW - timedelta(hours=4), "ดูอยู่นะครับ checkout flow ดีมากเลย รอ confirm อีกวัน"),

        # Mobile Banking Chat
        (ROOM["mob"], U["client_b"], NOW - timedelta(days=11), "สวัสดีค่ะมินตรา ยินดีได้ร่วมงานด้วยนะคะ"),
        (ROOM["mob"], U["fl_1"],     NOW - timedelta(days=11, hours=-1), "สวัสดีค่ะ ขอบคุณที่เลือกค่ะ! จะเริ่ม UX Research ก่อนเลยนะคะ"),
        (ROOM["mob"], U["client_b"], NOW - timedelta(days=10), "โอเคค่ะ ถ้าต้องการ user สำหรับ interview ผมหาให้ได้นะคะ"),
        (ROOM["mob"], U["fl_1"],     NOW - timedelta(days=8),  "ขอบคุณมากค่ะ ได้ user 5 คนแล้ว กำลัง compile ผล"),
        (ROOM["mob"], U["fl_1"],     NOW - timedelta(hours=20), "ส่ง wireframes + UX research รายงานแล้วนะคะ Figma link: https://figma.com/demo/banking"),
        (ROOM["mob"], U["client_b"], NOW - timedelta(hours=5),  "ดูแล้วค่ะ flow ดีมาก! แต่อยากให้เพิ่ม biometric login screen ด้วยได้ไหม?"),
        (ROOM["mob"], U["fl_1"],     NOW - timedelta(hours=2),  "ได้เลยค่ะ จะ update ใน Figma และส่งใหม่ค่ะ"),

        # Illustration Chat (completed)
        (ROOM["ill"], U["client_b"], NOW - timedelta(days=39), "สวัสดีค่ะ เอม! ขอบคุณที่รับงานนะคะ"),
        (ROOM["ill"], U["fl_3"],     NOW - timedelta(days=39, hours=-1), "สวัสดีค่ะ! excited มากเลยค่ะที่ได้ทำหนังสือเด็ก 🎨"),
        (ROOM["ill"], U["fl_3"],     NOW - timedelta(days=22), "ส่ง batch 1 ค่ะ 10 ภาพแรก ขอ feedback นะคะ"),
        (ROOM["ill"], U["client_b"], NOW - timedelta(days=20), "สวยมากค่ะ! แต่ขอให้ตัวละครหลักตาโตกว่านี้หน่อยได้ไหมคะ"),
        (ROOM["ill"], U["fl_3"],     NOW - timedelta(days=19), "แก้ให้แล้วนะคะ ✅"),
        (ROOM["ill"], U["fl_3"],     NOW - timedelta(days=13), "ส่งครบ 20 ภาพแล้วค่ะ! ไฟล์ AI + PNG ครบทุกภาพ 🎉"),
        (ROOM["ill"], U["client_b"], NOW - timedelta(days=12), "สวยงามมากค่ะ อนุมัติทันที! ขอบคุณมากนะคะ ประทับใจมากเลยค่ะ 🙏"),
        (ROOM["ill"], U["fl_3"],     NOW - timedelta(days=12, hours=-1), "ขอบคุณมากค่ะ! หวังว่าเด็กๆ จะชอบนะคะ 😊"),

        # Branding Chat (disputed)
        (ROOM["brd"], U["client_a"], NOW - timedelta(days=9), "สวัสดีครับ มินตรา เริ่มงาน branding ได้เลยนะครับ"),
        (ROOM["brd"], U["fl_1"],     NOW - timedelta(days=9, hours=-1), "ได้เลยค่ะ! จะเริ่ม mood board ก่อนเพื่อ align vision กันก่อนนะคะ"),
        (ROOM["brd"], U["fl_1"],     NOW - timedelta(days=4),  "ส่ง Logo 3 แนวทางค่ะ direction B น่าจะ fit ที่สุดสำหรับ F&B"),
        (ROOM["brd"], U["client_a"], NOW - timedelta(days=3),  "ดูแล้วครับ... ผมรู้สึกว่าไม่ตรงกับที่คุยกันตอนแรกเลยครับ"),
        (ROOM["brd"], U["fl_1"],     NOW - timedelta(days=3, hours=-2), "แต่ direction B ตาม brief ที่ให้มาเลยนะคะ? ขอ feedback ละเอียดหน่อยได้ไหมคะ"),
        (ROOM["brd"], U["client_a"], NOW - timedelta(days=2),  "ผมต้องการให้ทำใหม่ทั้งหมดโดยไม่คิดเงินเพิ่ม แต่มินตราบอกว่าต้องคิดเพิ่ม จึงเปิด dispute"),
    ]

    for r in ROOMS:
        if not _exists(db, ChatRoom, id=r["id"]):
            db.add(ChatRoom(
                id=r["id"],
                room_type=r["type"],
                job_assignment_id=r["assign"],
                name=r["name"],
                created_at=NOW - timedelta(days=15),
            ))
            rooms_added += 1

    db.commit()

    for room_id, user_ids in PARTICIPANTS:
        for uid in user_ids:
            if not _exists(db, ChatParticipant, chat_room_id=room_id, user_id=uid):
                db.add(ChatParticipant(
                    id=uuid.uuid4(),
                    chat_room_id=room_id,
                    user_id=uid,
                    joined_at=NOW - timedelta(days=15),
                ))

    db.commit()

    for room_id, sender_id, created_at, content in MESSAGES:
        existing = db.query(Message).filter_by(
            chat_room_id=room_id,
            sender_id=sender_id,
            content=content,
        ).first()
        if not existing:
            db.add(Message(
                id=uuid.uuid4(),
                chat_room_id=room_id,
                sender_id=sender_id,
                message_type="text",
                content=content,
                created_at=created_at,
            ))
            msgs_added += 1

    db.commit()
    print(f"   ✓ {rooms_added} rooms, {msgs_added} messages")


def seed_notifications(db: Session):
    print("→ [8/12] Notifications...")
    added = 0

    NOTIFS = [
        # fl_2 (กฤต) notifications
        {"user": U["fl_2"],    "type": "offer_accepted",    "title": "Offer ได้รับการยอมรับ!",        "body": "สมชาย ยอมรับ offer ของคุณสำหรับงาน E-Commerce Next.js", "ref_type": "project", "ref_id": str(JOB["ecommerce"]), "is_read": True,  "at": NOW - timedelta(days=14)},
        {"user": U["fl_2"],    "type": "work_approved",     "title": "งาน Phase 1 ได้รับการอนุมัติ",   "body": "สมชาย อนุมัติงาน Database + API Phase 1 แล้ว", "ref_type": "milestone", "ref_id": str(M["eco_m1"]), "is_read": True,  "at": NOW - timedelta(days=8)},
        {"user": U["fl_2"],    "type": "payment_released",  "title": "ได้รับเงิน ฿23,750",             "body": "ชำระเงิน Milestone 1 เรียบร้อยแล้ว", "ref_type": "milestone", "ref_id": str(M["eco_m1"]), "is_read": True,  "at": NOW - timedelta(days=8)},
        {"user": U["fl_2"],    "type": "message_received",  "title": "ข้อความใหม่จาก สมชาย",           "body": "ดูอยู่นะครับ checkout flow ดีมากเลย", "ref_type": "message", "ref_id": str(ROOM["eco"]), "is_read": False, "at": NOW - timedelta(hours=4)},
        # fl_1 (มินตรา) notifications
        {"user": U["fl_1"],    "type": "offer_accepted",    "title": "Offer ได้รับการยอมรับ!",        "body": "ณัฐภรณ์ ยอมรับ offer ของคุณสำหรับงาน Mobile Banking UI", "ref_type": "project", "ref_id": str(JOB["ui_mobile"]), "is_read": True,  "at": NOW - timedelta(days=12)},
        {"user": U["fl_1"],    "type": "message_received",  "title": "ข้อความใหม่จาก ณัฐภรณ์",        "body": "อยากให้เพิ่ม biometric login screen ด้วยได้ไหม?", "ref_type": "message", "ref_id": str(ROOM["mob"]), "is_read": False, "at": NOW - timedelta(hours=5)},
        # fl_3 (เอม) notifications
        {"user": U["fl_3"],    "type": "offer_accepted",    "title": "Offer ได้รับการยอมรับ!",        "body": "ณัฐภรณ์ ยอมรับ offer ของคุณสำหรับงาน Illustration หนังสือเด็ก", "ref_type": "project", "ref_id": str(JOB["illustration"]), "is_read": True, "at": NOW - timedelta(days=40)},
        {"user": U["fl_3"],    "type": "work_approved",     "title": "งาน Batch 1 ได้รับการอนุมัติ",  "body": "ณัฐภรณ์ อนุมัติภาพ 10 ภาพแรกแล้ว", "ref_type": "milestone", "ref_id": str(M["ill_m1"]), "is_read": True, "at": NOW - timedelta(days=20)},
        {"user": U["fl_3"],    "type": "payment_released",  "title": "ได้รับเงิน ฿8,550",             "body": "ชำระเงิน Milestone 1 หนังสือเด็ก เรียบร้อยแล้ว", "ref_type": "milestone", "ref_id": str(M["ill_m1"]), "is_read": True, "at": NOW - timedelta(days=20)},
        {"user": U["fl_3"],    "type": "work_approved",     "title": "งาน Final ได้รับการอนุมัติ 🎉", "body": "ณัฐภรณ์ อนุมัติงาน final 20 ภาพ! โปรเจกต์เสร็จสมบูรณ์", "ref_type": "milestone", "ref_id": str(M["ill_m2"]), "is_read": True, "at": NOW - timedelta(days=12)},
        {"user": U["fl_3"],    "type": "payment_released",  "title": "ได้รับเงิน ฿8,550",             "body": "ชำระเงิน Milestone 2 Final เรียบร้อยแล้ว", "ref_type": "milestone", "ref_id": str(M["ill_m2"]), "is_read": True, "at": NOW - timedelta(days=12)},
        # Client A (สมชาย) notifications
        {"user": U["client_a"], "type": "offer_received",  "title": "มี Offer ใหม่!",               "body": "กฤต ส่ง offer สำหรับงาน E-Commerce", "ref_type": "project", "ref_id": str(JOB["ecommerce"]), "is_read": True,  "at": NOW - timedelta(days=16)},
        {"user": U["client_a"], "type": "work_submitted",  "title": "กฤต ส่งงาน Milestone 2 แล้ว", "body": "Frontend Next.js ส่งแล้ว รอการตรวจสอบ", "ref_type": "milestone", "ref_id": str(M["eco_m2"]), "is_read": False, "at": NOW - timedelta(days=1)},
        # Client B (ณัฐภรณ์) notifications
        {"user": U["client_b"], "type": "work_submitted",  "title": "มินตรา ส่งงาน Milestone 1 แล้ว", "body": "UX Research + Wireframes ส่งแล้ว รอการตรวจสอบ", "ref_type": "milestone", "ref_id": str(M["mob_m1"]), "is_read": False, "at": NOW - timedelta(hours=18)},
        {"user": U["client_b"], "type": "project_created", "title": "โปรเจกต์ Illustration เสร็จสมบูรณ์ 🎉", "body": "ยืนยันการเสร็จสิ้น Children Book Illustration แล้ว", "ref_type": "project", "ref_id": str(JOB["illustration"]), "is_read": True, "at": NOW - timedelta(days=12)},
    ]

    for n in NOTIFS:
        notif = Notification(
            id=uuid.uuid4(),
            user_id=n["user"],
            type=n["type"],
            title=n["title"],
            body=n["body"],
            reference_type=n["ref_type"],
            reference_id=n["ref_id"],
            is_read=n["is_read"],
            created_at=n["at"],
        )
        db.add(notif)
        added += 1

    db.commit()
    print(f"   ✓ {added} notifications")


def seed_portfolio(db: Session):
    print("→ [9/12] Portfolio Items...")
    PORT_IDS = [
        uuid.UUID("b0000001-0000-0000-0000-000000000001"),
        uuid.UUID("b0000001-0000-0000-0000-000000000002"),
        uuid.UUID("b0000001-0000-0000-0000-000000000003"),
        uuid.UUID("b0000001-0000-0000-0000-000000000011"),
        uuid.UUID("b0000001-0000-0000-0000-000000000012"),
        uuid.UUID("b0000001-0000-0000-0000-000000000021"),
        uuid.UUID("b0000001-0000-0000-0000-000000000022"),
        uuid.UUID("b0000001-0000-0000-0000-000000000031"),
        uuid.UUID("b0000001-0000-0000-0000-000000000041"),
    ]

    PORTFOLIO_DATA = [
        # มินตรา (fl_1) — UI/UX
        {"id": PORT_IDS[0], "user": U["fl_1"], "title": "Fintech Mobile App — WealthTrack", "category": "uiux",
         "description": "ออกแบบ UI/UX แอปติดตามพอร์ตหุ้นและกองทุน ครอบคลุม onboarding, dashboard, transaction history ได้รับ feedback ดีมากจากผู้ใช้งาน pilot 200 คน",
         "skill_tags": ["UI/UX", "Figma", "Mobile Design", "Fintech"],
         "images": ["https://picsum.photos/seed/portfolio1/800/600", "https://picsum.photos/seed/portfolio1b/800/600"]},
        {"id": PORT_IDS[1], "user": U["fl_1"], "title": "Healthcare Booking App — DocNow", "category": "uiux",
         "description": "ออกแบบ UX สำหรับ app นัดหมอ ทั้ง patient และ doctor portal Usability score 4.7/5 จาก user testing ใช้งานจริงมาแล้ว",
         "skill_tags": ["UI/UX", "User Research", "Prototyping", "Healthcare"],
         "images": ["https://picsum.photos/seed/portfolio2/800/600"]},
        {"id": PORT_IDS[2], "user": U["fl_1"], "title": "E-Commerce Design System — ShopKrub", "category": "uiux",
         "description": "สร้าง Design System ครบชุดสำหรับ E-Commerce platform มี 200+ components Figma Variables + Auto Layout",
         "skill_tags": ["Design System", "UI/UX", "Figma", "E-Commerce"],
         "images": ["https://picsum.photos/seed/portfolio3/800/600"]},
        # กฤต (fl_2) — Web Dev
        {"id": PORT_IDS[3], "user": U["fl_2"], "title": "SaaS Dashboard — AnalyticsPro", "category": "webdev",
         "description": "พัฒนา analytics dashboard SaaS ด้วย Next.js + FastAPI + PostgreSQL แสดง real-time data ด้วย WebSocket, export CSV/PDF",
         "skill_tags": ["Next.js", "FastAPI", "PostgreSQL", "TypeScript", "WebSocket"],
         "images": ["https://picsum.photos/seed/portfolio11/800/600", "https://picsum.photos/seed/portfolio11b/800/600"]},
        {"id": PORT_IDS[4], "user": U["fl_2"], "title": "Booking Platform — EasyBook", "category": "webdev",
         "description": "ระบบจองห้องประชุมและพื้นที่ทำงาน co-working space Google Calendar sync, Stripe payment, admin panel",
         "skill_tags": ["React", "FastAPI", "Stripe", "Google Calendar API", "Docker"],
         "images": ["https://picsum.photos/seed/portfolio12/800/600"]},
        # เอม (fl_3) — Illustration
        {"id": PORT_IDS[5], "user": U["fl_3"], "title": "Children Book — \"น้องหมีหัดฝัน\"", "category": "illustration",
         "description": "วาดภาพประกอบหนังสือเด็ก 24 ภาพ สไตล์ kawaii สีสันสดใส ผ่านการพิมพ์และวางจำหน่ายจริงในร้านหนังสือชั้นนำ",
         "skill_tags": ["Children Book", "Illustration", "Procreate", "Kawaii"],
         "images": ["https://picsum.photos/seed/portfolio21/800/600", "https://picsum.photos/seed/portfolio21b/800/600"]},
        {"id": PORT_IDS[6], "user": U["fl_3"], "title": "Game Character — RPG Mobile", "category": "illustration",
         "description": "ออกแบบ 8 ตัวละคร RPG สไตล์ anime สำหรับ indie mobile game พร้อม sprite sheet idle/walk/attack animation",
         "skill_tags": ["Character Design", "Sprite Sheet", "Anime", "Game Art"],
         "images": ["https://picsum.photos/seed/portfolio22/800/600"]},
        # ภัทร (fl_4) — Video/Motion
        {"id": PORT_IDS[7], "user": U["fl_4"], "title": "Explainer Video — SaaS Onboarding 60s", "category": "video",
         "description": "ทำ explainer video 2D animation สำหรับ SaaS บริษัท retention เพิ่มขึ้น 35% หลังใช้วิดีโอนี้ใน onboarding",
         "skill_tags": ["Motion Design", "After Effects", "2D Animation", "Explainer Video"],
         "images": ["https://picsum.photos/seed/portfolio31/800/600"]},
        # น้อง (fl_5) — Writing
        {"id": PORT_IDS[8], "user": U["fl_5"], "title": "SEO Blog Series — Tech Startup x 20 บทความ", "category": "writing",
         "description": "เขียน blog series 20 บทความสำหรับ B2B SaaS startup ภาษาอังกฤษ keyword ranking ขึ้น top 3 ใน 6 เดือน",
         "skill_tags": ["SEO Writing", "Blog Writing", "Content Strategy", "B2B"],
         "images": ["https://picsum.photos/seed/portfolio41/800/600"]},
    ]

    added = 0
    for p in PORTFOLIO_DATA:
        if not _exists(db, PortfolioItem, id=p["id"]):
            db.add(PortfolioItem(
                id=p["id"],
                user_id=p["user"],
                title=p["title"],
                description=p["description"],
                images=p["images"],
                skill_tags=p["skill_tags"],
                category=p["category"],
                is_public=True,
                created_at=NOW - timedelta(days=30),
                updated_at=NOW - timedelta(days=5),
            ))
            added += 1

    db.commit()
    print(f"   ✓ {added} portfolio items")


def seed_reviews(db: Session):
    print("→ [10/12] Reviews...")
    REV_IDS = [
        uuid.UUID("c0000001-0000-0000-0000-000000000001"),
        uuid.UUID("c0000001-0000-0000-0000-000000000002"),
    ]
    added = 0

    REVIEW_DATA = [
        # Client B reviews Freelancer 3 (illustration completed)
        {"id": REV_IDS[0], "assign": ASSIGN["illustration"],
         "reviewer": U["client_b"], "reviewee": U["fl_3"],
         "rating": 5, "comment": "เอมทำงานได้ดีเกินคาดเลยค่ะ! ภาพสวยงาม ส่งตรงเวลา สื่อสารชัดเจน แก้งานไม่บ่นเลย แนะนำมากๆ ค่ะ ถ้ามีงาน Illustration อีกจะกลับมาใช้บริการแน่นอน ⭐⭐⭐⭐⭐",
         "at": NOW - timedelta(days=11)},
        # Freelancer 3 reviews Client B
        {"id": REV_IDS[1], "assign": ASSIGN["illustration"],
         "reviewer": U["fl_3"], "reviewee": U["client_b"],
         "rating": 5, "comment": "งานน่าสนใจมากค่ะ Brief ชัดเจน feedback ตรงประเด็น ชำระเงินไว ไม่มีปัญหาเลย ประทับใจมากค่ะ อยากร่วมงานอีก",
         "at": NOW - timedelta(days=11)},
    ]

    for r in REVIEW_DATA:
        if not _exists(db, Review, id=r["id"]):
            db.add(Review(
                id=r["id"],
                assignment_id=r["assign"],
                reviewer_id=r["reviewer"],
                reviewee_id=r["reviewee"],
                rating=r["rating"],
                comment=r["comment"],
                is_immutable=True,
                created_at=r["at"],
            ))
            added += 1

    db.commit()
    print(f"   ✓ {added} reviews")


def seed_disputes(db: Session):
    print("→ [11/12] Disputes & Evidence...")
    disp_added = ev_added = 0

    if not _exists(db, Dispute, id=DISPUTE_ID):
        db.add(Dispute(
            id=DISPUTE_ID,
            assignment_id=ASSIGN["branding"],
            milestone_id=M["brd_m1"],
            raised_by=U["client_a"],
            reason=(
                "ส่งงาน Logo แล้วแต่ไม่ตรงกับที่คุยกันตอนแรก ผมต้องการให้ทำใหม่ทั้งหมด "
                "แต่ freelancer ขอคิดค่าใช้จ่ายเพิ่ม ซึ่งไม่ได้ระบุใน scope เริ่มต้น"
            ),
            status="reviewing",
            resolution=None,
            resolved_by=None,
            created_at=NOW - timedelta(days=2),
            resolved_at=None,
        ))
        disp_added += 1

    db.commit()

    EVIDENCE_DATA = [
        # Client A's evidence
        {"id": uuid.UUID("e0000001-0000-0000-0000-000000000001"),
         "by": U["client_a"], "type": "text",
         "content": "ตามบทสนทนาวันที่เริ่มงาน ผมระบุชัดว่าต้องการ logo ที่สื่อถึงความ fresh และ modern "
                    "แต่งานที่ส่งมา direction B ดู traditional มากกว่า brief ที่ตกลงกันไว้ "
                    "มีหลักฐาน chat history แนบให้ด้านล่าง",
         "at": NOW - timedelta(days=2)},
        # Freelancer's evidence
        {"id": uuid.UUID("e0000001-0000-0000-0000-000000000002"),
         "by": U["fl_1"], "type": "text",
         "content": "ค่ะ ทำงานตาม brief document ที่ลูกค้าส่งมาในวันที่ตกลงงาน (แนบ PDF ด้านล่าง) "
                    "ใน brief ระบุว่า 'warm, inviting, traditional Thai fusion' ค่ะ Direction B ตรงกับ brief นั้นทุกข้อ "
                    "หากต้องการทิศทางใหม่นো หมายถึงเป็นการแก้ไขนอก scope ต้องมีค่าใช้จ่ายเพิ่มค่ะ",
         "at": NOW - timedelta(days=1)},
    ]

    for ev in EVIDENCE_DATA:
        if not _exists(db, Evidence, id=ev["id"]):
            db.add(Evidence(
                id=ev["id"],
                dispute_id=DISPUTE_ID,
                submitted_by=ev["by"],
                type=ev["type"],
                content=ev["content"],
                created_at=ev["at"],
            ))
            ev_added += 1

    db.commit()
    print(f"   ✓ {disp_added} disputes, {ev_added} evidences")


def seed_extra_notifications_post_dispute(db: Session):
    print("→ [12/12] Post-dispute notifications...")
    added = 0
    extra = [
        {"user": U["client_a"], "type": "project_created", "title": "Dispute ถูกเปิด",
         "body": "Dispute สำหรับ milestone 'Logo + Brand Identity' ถูกเปิดแล้ว ทีมงานกำลังตรวจสอบ",
         "ref_type": "project", "ref_id": str(JOB["branding"]), "is_read": False, "at": NOW - timedelta(days=2)},
        {"user": U["fl_1"], "type": "project_created", "title": "มีการเปิด Dispute",
         "body": "ลูกค้าเปิด dispute สำหรับ milestone 'Logo + Brand Identity' กรุณาส่งหลักฐานประกอบ",
         "ref_type": "project", "ref_id": str(JOB["branding"]), "is_read": True, "at": NOW - timedelta(days=2)},
    ]
    for n in extra:
        db.add(Notification(
            id=uuid.uuid4(),
            user_id=n["user"],
            type=n["type"],
            title=n["title"],
            body=n["body"],
            reference_type=n["ref_type"],
            reference_id=n["ref_id"],
            is_read=n["is_read"],
            created_at=n["at"],
        ))
        added += 1
    db.commit()
    print(f"   ✓ {added} notifications")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print()
    print("=" * 60)
    print("  LanceFy — Demo Seed Script")
    print("=" * 60)
    print()

    # Auto-create any tables not yet in the DB (e.g. portfolio_items, reviews, disputes)
    print("→ [0/12] Ensuring all tables exist (create_all)...")
    Base.metadata.create_all(bind=engine)
    print("   ✓ Done")
    print()

    db = SessionLocal()
    try:
        seed_categories(db)
        seed_users(db)
        seed_jobs(db)
        seed_offers_and_assignments(db)
        seed_milestones(db)
        seed_transactions(db)
        seed_chat(db)
        seed_notifications(db)
        seed_portfolio(db)
        seed_reviews(db)
        seed_disputes(db)
        seed_extra_notifications_post_dispute(db)

        print()
        print("=" * 60)
        print("  ✅ SEED COMPLETE!")
        print("=" * 60)
        print()
        print("Demo accounts (ใช้ login ผ่าน Keycloak หลัง create users):")
        print()
        print("  CLIENTS:")
        print("  somchai@demo.lancefy.io       — Client A (jobs E-Commerce, Branding)")
        print("  nattaporn@demo.lancefy.io     — Client B (jobs Mobile UI, Illustration)")
        print("  prayuth@demo.lancefy.io       — Client C (job HR Dashboard)")
        print("  siriporn@demo.lancefy.io      — Client D (job Design System)")
        print()
        print("  FREELANCERS:")
        print("  mintra@demo.lancefy.io        — มินตรา (UI/UX, 2 active projects, 1 dispute)")
        print("  krit@demo.lancefy.io          — กฤต (Web Dev, E-Commerce in progress)")
        print("  aim@demo.lancefy.io           — เอม (Illustration, 1 completed + reviews)")
        print("  pat@demo.lancefy.io           — ภัทร (Video, portfolio only)")
        print("  nong@demo.lancefy.io          — น้อง (Writing, portfolio only)")
        print()
        print("  NOTE: Run scripts/seed/create_demo_keycloak_users.py to create Keycloak accounts")
        print("        with password: Demo@1234")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed FAILED: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()
