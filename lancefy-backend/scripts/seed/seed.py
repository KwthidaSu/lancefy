"""
Seed script — populates the DB with baseline demo data.

Run from the lancefy-backend directory:
    python scripts/seed/seed.py

WARNING: This script is IDEMPOTENT for categories (skips if code already exists)
but will INSERT new users/jobs every run. Run once on a clean DB.
"""

import sys
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import SessionLocal
from app.users.models import User
from app.projects.models import (
    Category,
    CategoryTranslation,
    Job,
    JobCategory,
    JobOffer,
)


# ---------------------------------------------------------------------------
# Fixed UUIDs — stable across re-runs so you can reference them manually
# ---------------------------------------------------------------------------

CAT_IDS = {
    "uiux":        uuid.UUID("00000001-0000-0000-0000-000000000001"),
    "branding":    uuid.UUID("00000001-0000-0000-0000-000000000002"),
    "webdev":      uuid.UUID("00000001-0000-0000-0000-000000000003"),
    "illustration":uuid.UUID("00000001-0000-0000-0000-000000000004"),
    "marketing":   uuid.UUID("00000001-0000-0000-0000-000000000005"),
    "video":       uuid.UUID("00000001-0000-0000-0000-000000000006"),
    "writing":     uuid.UUID("00000001-0000-0000-0000-000000000007"),
    "photo":       uuid.UUID("00000001-0000-0000-0000-000000000008"),
}

# Fake Keycloak sub values (these users won't work with real Keycloak login
# but let you browse the public job board and freelancer listings)
USER_IDS = {
    "client_a":     uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001"),
    "client_b":     uuid.UUID("aaaaaaaa-0000-0000-0000-000000000002"),
    "client_c":     uuid.UUID("aaaaaaaa-0000-0000-0000-000000000003"),
    "client_d":     uuid.UUID("aaaaaaaa-0000-0000-0000-000000000004"),
    "freelancer_1": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000011"),
    "freelancer_2": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000012"),
    "freelancer_3": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000013"),
    "freelancer_4": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000014"),
    "freelancer_5": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000015"),
    "freelancer_6": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000016"),
    "freelancer_7": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000017"),
}

KEYCLOAK_IDS = {
    "client_a":     uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001"),
    "client_b":     uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002"),
    "client_c":     uuid.UUID("bbbbbbbb-0000-0000-0000-000000000003"),
    "client_d":     uuid.UUID("bbbbbbbb-0000-0000-0000-000000000004"),
    "freelancer_1": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000011"),
    "freelancer_2": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000012"),
    "freelancer_3": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000013"),
    "freelancer_4": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000014"),
    "freelancer_5": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000015"),
    "freelancer_6": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000016"),
    "freelancer_7": uuid.UUID("bbbbbbbb-0000-0000-0000-000000000017"),
}


# ---------------------------------------------------------------------------
# Category definitions
# ---------------------------------------------------------------------------

CATEGORIES = [
    {
        "id": CAT_IDS["uiux"],
        "code": "uiux",
        "type": "skill",
        "en": "UI / UX",
        "th": "UI / UX ดีไซน์",
    },
    {
        "id": CAT_IDS["branding"],
        "code": "branding",
        "type": "skill",
        "en": "Branding",
        "th": "ออกแบบแบรนด์",
    },
    {
        "id": CAT_IDS["webdev"],
        "code": "webdev",
        "type": "skill",
        "en": "Web Development",
        "th": "พัฒนาเว็บไซต์",
    },
    {
        "id": CAT_IDS["illustration"],
        "code": "illustration",
        "type": "skill",
        "en": "Illustration",
        "th": "วาดภาพประกอบ",
    },
    {
        "id": CAT_IDS["marketing"],
        "code": "marketing",
        "type": "skill",
        "en": "Digital Marketing",
        "th": "การตลาดดิจิทัล",
    },
    {
        "id": CAT_IDS["video"],
        "code": "video",
        "type": "skill",
        "en": "Video & Animation",
        "th": "ตัดต่อวิดีโอ & แอนิเมชัน",
    },
    {
        "id": CAT_IDS["writing"],
        "code": "writing",
        "type": "skill",
        "en": "Writing & Translation",
        "th": "เขียนและแปลเนื้อหา",
    },
    {
        "id": CAT_IDS["photo"],
        "code": "photo",
        "type": "skill",
        "en": "Photography",
        "th": "ถ่ายภาพ",
    },
]


# ---------------------------------------------------------------------------
# User definitions
# ---------------------------------------------------------------------------

USERS = [
    # --- Clients ---
    {
        "id": USER_IDS["client_a"],
        "keycloak_user_id": KEYCLOAK_IDS["client_a"],
        "email": "client.a@demo.lancefy.io",
        "username": "somchai_client",
        "firstname": "สมชาย",
        "lastname": "ใจดี",
        "status": "active",
    },
    {
        "id": USER_IDS["client_b"],
        "keycloak_user_id": KEYCLOAK_IDS["client_b"],
        "email": "client.b@demo.lancefy.io",
        "username": "natthaporn_biz",
        "firstname": "ณัฐภรณ์",
        "lastname": "วงศ์รุ่งเรือง",
        "status": "active",
    },
    {
        "id": USER_IDS["client_c"],
        "keycloak_user_id": KEYCLOAK_IDS["client_c"],
        "email": "client.c@demo.lancefy.io",
        "username": "prayuth_startup",
        "firstname": "ประยุทธ์",
        "lastname": "สตาร์ทอัพ",
        "status": "active",
    },
    {
        "id": USER_IDS["client_d"],
        "keycloak_user_id": KEYCLOAK_IDS["client_d"],
        "email": "client.d@demo.lancefy.io",
        "username": "siriporn_corp",
        "firstname": "ศิริพร",
        "lastname": "คอร์ปอเรท",
        "status": "active",
    },
    # --- Freelancers ---
    {
        "id": USER_IDS["freelancer_1"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_1"],
        "email": "freelancer.1@demo.lancefy.io",
        "username": "mintra_design",
        "firstname": "มินตรา",
        "lastname": "ศิลปกร",
        "status": "active",
    },
    {
        "id": USER_IDS["freelancer_2"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_2"],
        "email": "freelancer.2@demo.lancefy.io",
        "username": "krit_dev",
        "firstname": "กฤต",
        "lastname": "โค้ดดี",
        "status": "active",
    },
    {
        "id": USER_IDS["freelancer_3"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_3"],
        "email": "freelancer.3@demo.lancefy.io",
        "username": "aim_creative",
        "firstname": "เอม",
        "lastname": "ครีเอทีฟ",
        "status": "active",
    },
    {
        "id": USER_IDS["freelancer_4"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_4"],
        "email": "freelancer.4@demo.lancefy.io",
        "username": "pat_motion",
        "firstname": "ภัทร",
        "lastname": "มูฟวิ่ง",
        "status": "active",
    },
    {
        "id": USER_IDS["freelancer_5"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_5"],
        "email": "freelancer.5@demo.lancefy.io",
        "username": "nong_writer",
        "firstname": "น้อง",
        "lastname": "นักเขียน",
        "status": "active",
    },
    {
        "id": USER_IDS["freelancer_6"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_6"],
        "email": "freelancer.6@demo.lancefy.io",
        "username": "tae_photo",
        "firstname": "แต้",
        "lastname": "ช่างภาพ",
        "status": "active",
    },
    {
        "id": USER_IDS["freelancer_7"],
        "keycloak_user_id": KEYCLOAK_IDS["freelancer_7"],
        "email": "freelancer.7@demo.lancefy.io",
        "username": "bank_fullstack",
        "firstname": "แบงค์",
        "lastname": "ฟูลสแตก",
        "status": "active",
    },
]


# ---------------------------------------------------------------------------
# Job definitions
# ---------------------------------------------------------------------------

NOW = datetime.utcnow()

JOBS = [
    # ── UI/UX ──────────────────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000001"),
        "owner_key": "client_a",
        "title": "ออกแบบ UI/UX สำหรับแอป Mobile Banking",
        "description": (
            "ต้องการนักออกแบบที่มีประสบการณ์ด้าน Fintech UI/UX "
            "สำหรับแอปธนาคารบนมือถือ (iOS + Android) ครอบคลุม "
            "onboarding, dashboard, transfer, history และ settings"
        ),
        "budget": 45000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=30),
        "published_at": NOW - timedelta(days=2),
        "category_keys": ["uiux"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000009"),
        "owner_key": "client_c",
        "title": "Redesign หน้า Dashboard ระบบ HR ภายในบริษัท",
        "description": (
            "ระบบ HR เดิมมี UX แย่มาก ต้องการ UX Designer มาทำ audit "
            "และ redesign หน้า dashboard, leave request, payroll slip "
            "ให้ใช้งานง่ายขึ้น ส่ง Figma prototype พร้อม design system"
        ),
        "budget": 30000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=20),
        "published_at": NOW - timedelta(days=1),
        "category_keys": ["uiux"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000010"),
        "owner_key": "client_d",
        "title": "ออกแบบ UI Component Library สำหรับ Design System",
        "description": (
            "บริษัทต้องการ Design System ครบชุด: Color tokens, Typography, "
            "Button, Form, Card, Modal, Table, Navigation — ส่งเป็น Figma "
            "Auto Layout + Variables พร้อม documentation"
        ),
        "budget": 55000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=40),
        "published_at": NOW - timedelta(hours=18),
        "category_keys": ["uiux"],
    },
    # ── Web Development ────────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000002"),
        "owner_key": "client_a",
        "title": "พัฒนาเว็บไซต์ E-Commerce ด้วย Next.js + FastAPI",
        "description": (
            "ต้องการ Full-stack developer พัฒนาร้านค้าออนไลน์ "
            "Next.js 14 (frontend) + FastAPI (backend) + PostgreSQL "
            "มี product listing, cart, checkout, order management และ admin panel"
        ),
        "budget": 80000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=45),
        "published_at": NOW - timedelta(days=5),
        "category_keys": ["webdev"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000007"),
        "owner_key": "client_a",
        "title": "พัฒนา REST API สำหรับระบบจอง Appointment",
        "description": (
            "ต้องการ Backend Developer พัฒนา API ระบบจองนัด "
            "FastAPI + PostgreSQL รองรับ: สร้าง/แก้ไข/ยกเลิกนัด, "
            "ส่ง email reminder, calendar sync (Google Calendar API) "
            "มี unit test ครอบคลุม"
        ),
        "budget": 35000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=25),
        "published_at": NOW - timedelta(days=4),
        "category_keys": ["webdev"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000011"),
        "owner_key": "client_b",
        "title": "สร้าง Landing Page สินค้าพร้อม A/B Testing",
        "description": (
            "ต้องการ Frontend Dev สร้าง landing page สำหรับผลิตภัณฑ์ "
            "supplement ตัวใหม่ ต้องการ performance สูง (Core Web Vitals), "
            "รองรับ mobile-first, integrate กับ Google Analytics 4 + Hotjar"
        ),
        "budget": 22000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=14),
        "published_at": NOW - timedelta(days=3),
        "category_keys": ["webdev"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000012"),
        "owner_key": "client_c",
        "title": "พัฒนา Line OA Chatbot สำหรับร้านอาหาร",
        "description": (
            "ต้องการ Developer พัฒนา Line Chatbot ระบบสั่งอาหาร "
            "เมนู + ตะกร้า + ชำระเงินผ่าน PromptPay QR, แจ้งสถานะออเดอร์, "
            "dashboard สรุปยอดขายรายวัน ส่ง source code พร้อม deploy"
        ),
        "budget": 28000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=21),
        "published_at": NOW - timedelta(hours=8),
        "category_keys": ["webdev"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000013"),
        "owner_key": "client_d",
        "title": "migrate ระบบ Monolith → Microservices (Docker + K8s)",
        "description": (
            "ระบบเก่า PHP Monolith ต้องการ migrate เป็น microservices "
            "ด้วย FastAPI + Docker + Kubernetes บน GCP "
            "ประมาณ 5 services: auth, user, product, order, notification "
            "มี CI/CD pipeline ด้วย GitHub Actions"
        ),
        "budget": 150000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=60),
        "published_at": NOW - timedelta(days=6),
        "category_keys": ["webdev"],
    },
    # ── Branding ───────────────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000003"),
        "owner_key": "client_b",
        "title": "ออกแบบ Brand Identity สำหรับ Startup F&B",
        "description": (
            "ร้านอาหาร Fusion Thai ต้องการ Brand Identity ครบชุด: "
            "Logo, color palette, typography, business card, packaging "
            "และ social media template"
        ),
        "budget": 25000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=21),
        "published_at": NOW - timedelta(days=1),
        "category_keys": ["branding"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000014"),
        "owner_key": "client_c",
        "title": "รีแบรนด์บริษัทที่ปรึกษาด้านการเงิน",
        "description": (
            "บริษัทที่ปรึกษาการเงินดำเนินมา 10 ปี ต้องการ rebranding "
            "ให้ดูทันสมัยและน่าเชื่อถือมากขึ้น "
            "ต้องการ: logo ใหม่, brand guideline, เทมเพลต presentation, "
            "letterhead, นามบัตร และ email signature"
        ),
        "budget": 40000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=28),
        "published_at": NOW - timedelta(days=2),
        "category_keys": ["branding"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000015"),
        "owner_key": "client_a",
        "title": "ออกแบบ Packaging สำหรับสินค้า Skincare",
        "description": (
            "สินค้า Skincare organic ต้องการ packaging design สวยงาม "
            "เน้น minimal + sustainable กล่อง + ขวด + label 3 SKU "
            "ส่งไฟล์ Dieline + AI พร้อม print-ready"
        ),
        "budget": 18000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=18),
        "published_at": NOW - timedelta(hours=3),
        "category_keys": ["branding"],
    },
    # ── Illustration ───────────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000004"),
        "owner_key": "client_b",
        "title": "วาดภาพ Illustration ประกอบหนังสือเด็ก 20 ภาพ",
        "description": (
            "ต้องการ Illustrator สไตล์ cute/kawaii วาดภาพประกอบ "
            "สำหรับหนังสือเด็กอายุ 3-6 ปี จำนวน 20 ภาพ (ขนาด A4) "
            "ส่งไฟล์ AI + PNG ความละเอียดสูง"
        ),
        "budget": 18000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=14),
        "published_at": NOW - timedelta(days=3),
        "category_keys": ["illustration"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000016"),
        "owner_key": "client_d",
        "title": "วาด Character สำหรับเกม Mobile (5 ตัว)",
        "description": (
            "เกม RPG 2D ต้องการ character design 5 ตัว: hero, mage, archer, "
            "warrior, healer สไตล์ anime/fantasy แต่ละตัวมี idle + walk + attack "
            "ส่งไฟล์ PNG sprite sheet + PSD"
        ),
        "budget": 35000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=35),
        "published_at": NOW - timedelta(days=4),
        "category_keys": ["illustration"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000017"),
        "owner_key": "client_c",
        "title": "วาด Infographic สรุป Annual Report",
        "description": (
            "ต้องการ Infographic designer ทำ visual รายงานประจำปี "
            "ข้อมูล 15-20 หัวข้อ สไตล์ corporate แต่ดูทันสมัย "
            "ส่ง PDF + Figma source"
        ),
        "budget": 12000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=12),
        "published_at": NOW - timedelta(hours=5),
        "category_keys": ["illustration"],
    },
    # ── Digital Marketing ──────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000005"),
        "owner_key": "client_a",
        "title": "ทำ SEO และ Content Marketing สำหรับเว็บขายเสื้อผ้า",
        "description": (
            "ต้องการ Digital Marketer วาง strategy SEO on-page/off-page "
            "เขียน blog 4 บทความต่อเดือน และดูแล Google Ads Budget 5,000/เดือน "
            "ระยะสัญญา 3 เดือน"
        ),
        "budget": 15000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=90),
        "published_at": NOW - timedelta(days=7),
        "category_keys": ["marketing", "writing"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000018"),
        "owner_key": "client_b",
        "title": "ดูแล Social Media (Facebook + IG + TikTok) 3 เดือน",
        "description": (
            "แบรนด์เครื่องดื่มเพื่อสุขภาพต้องการ Social Media Manager "
            "วางแผนคอนเทนต์รายเดือน, สร้าง content 20 ชิ้น/เดือน, "
            "ตอบ comment/inbox, รายงานผล engagement ทุกอาทิตย์"
        ),
        "budget": 18000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=90),
        "published_at": NOW - timedelta(days=2),
        "category_keys": ["marketing"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000019"),
        "owner_key": "client_d",
        "title": "ทำ Google Ads + Facebook Ads สำหรับ App Download Campaign",
        "description": (
            "แอปสุขภาพต้องการ Performance Marketer ดูแล Paid Ads "
            "เป้าหมาย CPI ไม่เกิน 20 บาท budget 50,000/เดือน "
            "ต้องการ A/B test creatives, optimize daily, weekly report"
        ),
        "budget": 20000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=30),
        "published_at": NOW - timedelta(days=1),
        "category_keys": ["marketing"],
    },
    # ── Video & Animation ──────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000006"),
        "owner_key": "client_b",
        "title": "ตัดต่อ VDO Content สำหรับ YouTube Channel",
        "description": (
            "ต้องการตัดต่อวิดีโอ 8-12 นาทีต่อคลิป จำนวน 4 คลิปต่อเดือน "
            "สไตล์ storytelling, มี motion graphic ประกอบ, subtitle ไทย-อังกฤษ "
            "ส่ง 1080p MP4"
        ),
        "budget": 12000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=30),
        "published_at": NOW - timedelta(hours=12),
        "category_keys": ["video"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000020"),
        "owner_key": "client_c",
        "title": "ทำ Motion Graphic VDO แนะนำผลิตภัณฑ์ 60 วินาที",
        "description": (
            "ต้องการ Motion Designer ทำ explainer video แนะนำซอฟต์แวร์ SaaS "
            "ความยาว 60 วินาที สไตล์ 2D animation + voiceover ภาษาไทย "
            "ส่ง MP4 1080p + source file After Effects"
        ),
        "budget": 15000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=20),
        "published_at": NOW - timedelta(days=3),
        "category_keys": ["video"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000021"),
        "owner_key": "client_a",
        "title": "ถ่ายทำและตัดต่อวิดีโอแนะนำบริษัท Corporate Video",
        "description": (
            "ต้องการทีม video production ถ่ายทำ corporate video "
            "สถานที่ในกรุงเทพฯ 1 วัน, ตัดต่อ 3-5 นาที, "
            "มี color grade + background music + subtitle "
            "ส่ง YouTube-ready + raw files"
        ),
        "budget": 45000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=25),
        "published_at": NOW - timedelta(days=2),
        "category_keys": ["video", "photo"],
    },
    # ── Writing & Translation ─────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000008"),
        "owner_key": "client_b",
        "title": "แปลเอกสารกฎหมาย อังกฤษ → ไทย 50 หน้า",
        "description": (
            "ต้องการนักแปลที่มีความเข้าใจศัพท์กฎหมาย "
            "แปลสัญญาซื้อขายหุ้นและ NDA จากภาษาอังกฤษเป็นไทย "
            "ประมาณ 50 หน้า A4 ต้องการความถูกต้องสูง"
        ),
        "budget": 8000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=10),
        "published_at": NOW - timedelta(hours=6),
        "category_keys": ["writing"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000022"),
        "owner_key": "client_d",
        "title": "เขียน Blog บทความ SEO 10 บทความ (ภาษาอังกฤษ)",
        "description": (
            "เว็บ Tech blog ต้องการ Content Writer เขียนบทความภาษาอังกฤษ "
            "หัวข้อ AI, SaaS, Productivity — 10 บทความ "
            "ยาว 800-1,200 คำต่อบทความ ต้องผ่าน Copyscape, keyword density ตามกำหนด"
        ),
        "budget": 9000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=15),
        "published_at": NOW - timedelta(hours=2),
        "category_keys": ["writing"],
    },
    # ── Photography ────────────────────────────────────────────────────────
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000023"),
        "owner_key": "client_c",
        "title": "ถ่ายภาพ Product Catalog สินค้าแฟชั่น 50 ชิ้น",
        "description": (
            "แบรนด์เสื้อผ้าต้องการช่างภาพถ่าย product catalog "
            "สินค้า 50 ชิ้น (Flat lay + On-model) "
            "Studio ที่ดอนเมือง 2 วัน ต้องการ retouching ครบ "
            "ส่ง JPEG 2000px + RAW"
        ),
        "budget": 20000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=12),
        "published_at": NOW - timedelta(days=1),
        "category_keys": ["photo"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000024"),
        "owner_key": "client_a",
        "title": "ถ่ายภาพ Food Photography สำหรับเมนูร้านอาหาร",
        "description": (
            "ร้านอาหาร Japanese Fusion เปิดใหม่ ต้องการ food photographer "
            "ถ่ายเมนู 30 จาน สไตล์ moody + dark background "
            "สถานที่ที่ร้าน (สุขุมวิท) 1 วัน + retouching ทุกภาพ"
        ),
        "budget": 12000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=8),
        "published_at": NOW - timedelta(hours=4),
        "category_keys": ["photo"],
    },
    {
        "id": uuid.UUID("cccccccc-0000-0000-0000-000000000025"),
        "owner_key": "client_b",
        "title": "ถ่ายภาพ Headshot + Profile สำหรับทีม C-Level 10 คน",
        "description": (
            "บริษัทต้องการ professional headshot สำหรับผู้บริหาร 10 คน "
            "พื้นหลังขาว + สีเทา, lighting สะอาด corporate "
            "ถ่ายที่ออฟฟิส (สาทร) ครึ่งวัน + retouch ทุกภาพ"
        ),
        "budget": 8000, "currency": "THB", "status": "open",
        "deadline_date": date.today() + timedelta(days=7),
        "published_at": NOW - timedelta(hours=1),
        "category_keys": ["photo"],
    },
]


# ---------------------------------------------------------------------------
# Offer definitions — 20 offers across 10 jobs with mixed statuses (pending / accepted / rejected)
# ---------------------------------------------------------------------------

OFFERS = [
    # ── Job 01: Mobile Banking UI/UX — 3 offers (pending, pending, rejected)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000001"),
        "job_key": "cccccccc-0000-0000-0000-000000000001",
        "client_key": "client_a", "freelancer_key": "freelancer_1",
        "proposed_budget": 42000, "currency": "THB",
        "message": "มีประสบการณ์ออกแบบ Fintech App มาแล้ว 3 ปี มี portfolio ให้ดูได้ครับ",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000002"),
        "job_key": "cccccccc-0000-0000-0000-000000000001",
        "client_key": "client_a", "freelancer_key": "freelancer_3",
        "proposed_budget": 45000, "currency": "THB",
        "message": "ถนัดงาน UX Research + UI Design โดยเฉพาะ Financial App ทำมาแล้ว 5 ปี",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000003"),
        "job_key": "cccccccc-0000-0000-0000-000000000001",
        "client_key": "client_a", "freelancer_key": "freelancer_7",
        "proposed_budget": 50000, "currency": "THB",
        "message": "ผมเป็น Full-stack ที่ถนัด UX ด้วย แต่ budget อาจสูงกว่าเพราะทำ prototype ให้ด้วย",
        "status": "rejected",
    },
    # ── Job 02: E-Commerce Next.js — 2 offers (pending, accepted)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000004"),
        "job_key": "cccccccc-0000-0000-0000-000000000002",
        "client_key": "client_a", "freelancer_key": "freelancer_2",
        "proposed_budget": 75000, "currency": "THB",
        "message": "เคยทำ E-Commerce หลายโปรเจกต์ด้วย Next.js + FastAPI โดยตรงครับ",
        "status": "accepted",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000005"),
        "job_key": "cccccccc-0000-0000-0000-000000000002",
        "client_key": "client_a", "freelancer_key": "freelancer_7",
        "proposed_budget": 80000, "currency": "THB",
        "message": "Full-stack developer 6 ปี เชี่ยวชาญ Next.js + FastAPI + Docker",
        "status": "rejected",
    },
    # ── Job 03: Brand Identity F&B — 3 offers (pending, pending, pending)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000006"),
        "job_key": "cccccccc-0000-0000-0000-000000000003",
        "client_key": "client_b", "freelancer_key": "freelancer_1",
        "proposed_budget": 23000, "currency": "THB",
        "message": "ออกแบบ Brand Identity F&B มาแล้วมากกว่า 10 แบรนด์ ทั้งไทยและต่างประเทศ",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000007"),
        "job_key": "cccccccc-0000-0000-0000-000000000003",
        "client_key": "client_b", "freelancer_key": "freelancer_3",
        "proposed_budget": 25000, "currency": "THB",
        "message": "เชี่ยวชาญ Branding สไตล์ modern minimalist เคยทำให้ร้านอาหาร Michelin guide",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000008"),
        "job_key": "cccccccc-0000-0000-0000-000000000003",
        "client_key": "client_b", "freelancer_key": "freelancer_4",
        "proposed_budget": 22000, "currency": "THB",
        "message": "Motion + Branding designer ทำ brand identity ได้ทั้ง static และ animated logo",
        "status": "pending",
    },
    # ── Job 04: Illustration หนังสือเด็ก — 2 offers (pending, accepted)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000009"),
        "job_key": "cccccccc-0000-0000-0000-000000000004",
        "client_key": "client_b", "freelancer_key": "freelancer_3",
        "proposed_budget": 17000, "currency": "THB",
        "message": "วาดภาพสไตล์ kawaii มาตลอด ผลงานหนังสือเด็กผ่านการพิมพ์จริงแล้ว 3 เล่ม",
        "status": "accepted",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000010"),
        "job_key": "cccccccc-0000-0000-0000-000000000004",
        "client_key": "client_b", "freelancer_key": "freelancer_1",
        "proposed_budget": 18000, "currency": "THB",
        "message": "ถนัดภาพประกอบเด็กสไตล์ flat + cute สีสันสดใส",
        "status": "rejected",
    },
    # ── Job 07: REST API Appointment — 2 offers (pending)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000011"),
        "job_key": "cccccccc-0000-0000-0000-000000000007",
        "client_key": "client_a", "freelancer_key": "freelancer_2",
        "proposed_budget": 33000, "currency": "THB",
        "message": "Backend specialist FastAPI + PostgreSQL มีเคสงาน booking system ให้ดู",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000012"),
        "job_key": "cccccccc-0000-0000-0000-000000000007",
        "client_key": "client_a", "freelancer_key": "freelancer_7",
        "proposed_budget": 35000, "currency": "THB",
        "message": "ทำระบบ appointment API ให้คลินิกหมอมาแล้ว มี Google Calendar sync",
        "status": "pending",
    },
    # ── Job 09: HR Dashboard Redesign — 2 offers (pending)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000013"),
        "job_key": "cccccccc-0000-0000-0000-000000000009",
        "client_key": "client_c", "freelancer_key": "freelancer_1",
        "proposed_budget": 28000, "currency": "THB",
        "message": "UX audit + redesign คือสิ่งที่ถนัดมาก เคยทำให้ระบบ internal หลายบริษัท",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000014"),
        "job_key": "cccccccc-0000-0000-0000-000000000009",
        "client_key": "client_c", "freelancer_key": "freelancer_3",
        "proposed_budget": 30000, "currency": "THB",
        "message": "ทำ enterprise UX มา 4 ปี Figma + user testing ครบ",
        "status": "pending",
    },
    # ── Job 11: Landing Page — 1 offer (pending)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000015"),
        "job_key": "cccccccc-0000-0000-0000-000000000011",
        "client_key": "client_b", "freelancer_key": "freelancer_7",
        "proposed_budget": 20000, "currency": "THB",
        "message": "ทำ landing page ที่ PageSpeed 95+ มาแล้ว integrate GA4 + Hotjar ได้เลย",
        "status": "pending",
    },
    # ── Job 13: Microservices — 2 offers (pending)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000016"),
        "job_key": "cccccccc-0000-0000-0000-000000000013",
        "client_key": "client_d", "freelancer_key": "freelancer_2",
        "proposed_budget": 140000, "currency": "THB",
        "message": "ทำ microservices migration มาหลายโปรเจกต์ Kubernetes + GCP ชำนาญมาก",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000017"),
        "job_key": "cccccccc-0000-0000-0000-000000000013",
        "client_key": "client_d", "freelancer_key": "freelancer_7",
        "proposed_budget": 150000, "currency": "THB",
        "message": "DevOps + Backend engineer มี cert GCP Professional ทำ K8s production มา 3 ปี",
        "status": "pending",
    },
    # ── Job 16: Game Character — 1 offer (pending)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000018"),
        "job_key": "cccccccc-0000-0000-0000-000000000016",
        "client_key": "client_d", "freelancer_key": "freelancer_3",
        "proposed_budget": 32000, "currency": "THB",
        "message": "วาด game character anime สไตล์มาแล้ว ทำ sprite sheet ให้หลาย indie game",
        "status": "pending",
    },
    # ── Job 20: Motion Graphic — 2 offers (pending, rejected)
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000019"),
        "job_key": "cccccccc-0000-0000-0000-000000000020",
        "client_key": "client_c", "freelancer_key": "freelancer_4",
        "proposed_budget": 14000, "currency": "THB",
        "message": "Motion designer After Effects 5 ปี ทำ explainer video SaaS มาหลายเจ้า",
        "status": "pending",
    },
    {
        "id": uuid.UUID("dddddddd-0000-0000-0000-000000000020"),
        "job_key": "cccccccc-0000-0000-0000-000000000020",
        "client_key": "client_c", "freelancer_key": "freelancer_6",
        "proposed_budget": 15000, "currency": "THB",
        "message": "ทำวิดีโอ + motion ได้ครบ แต่ขอให้ผมถ่ายภาพนิ่งประกอบด้วยนะครับ",
        "status": "rejected",
    },
]


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------

def seed_categories(db: Session):
    print("→ Seeding categories...")
    count = 0
    for cat in CATEGORIES:
        existing = db.query(Category).filter(Category.code == cat["code"]).first()
        if existing:
            print(f"  skip (exists): {cat['code']}")
            continue

        c = Category(
            id=cat["id"],
            code=cat["code"],
            type=cat["type"],
            created_at=NOW,
        )
        db.add(c)
        db.add(CategoryTranslation(
            id=uuid.uuid4(),
            category_id=cat["id"],
            locale="en",
            name=cat["en"],
        ))
        db.add(CategoryTranslation(
            id=uuid.uuid4(),
            category_id=cat["id"],
            locale="th",
            name=cat["th"],
        ))
        count += 1
    db.commit()
    print(f"  ✓ {count} categories added")


def seed_users(db: Session):
    print("→ Seeding users...")
    count = 0
    for u in USERS:
        existing = db.query(User).filter(User.id == u["id"]).first()
        if existing:
            print(f"  skip (exists): {u['username']}")
            continue
        db.add(User(
            id=u["id"],
            keycloak_user_id=u["keycloak_user_id"],
            email=u["email"],
            username=u["username"],
            firstname=u["firstname"],
            lastname=u["lastname"],
            status=u["status"],
            created_at=NOW,
            updated_at=NOW,
        ))
        count += 1
    db.commit()
    print(f"  ✓ {count} users added")


def seed_jobs(db: Session):
    print("→ Seeding jobs...")
    count = 0
    for j in JOBS:
        job_id = j["id"]
        existing = db.query(Job).filter(Job.id == job_id).first()
        if existing:
            print(f"  skip (exists): {j['title'][:40]}")
            continue

        owner_id = USER_IDS[j["owner_key"]]
        job = Job(
            id=job_id,
            owner_id=owner_id,
            title=j["title"],
            description=j["description"],
            budget=j["budget"],
            currency=j["currency"],
            status=j["status"],
            deadline_date=j["deadline_date"],
            created_at=j["published_at"],
            published_at=j["published_at"],
        )
        db.add(job)
        db.flush()  # get job.id before adding associations

        for cat_key in j["category_keys"]:
            db.add(JobCategory(
                job_id=job_id,
                category_id=CAT_IDS[cat_key],
            ))

        count += 1

    db.commit()
    print(f"  ✓ {count} jobs added")


def seed_offers(db: Session):
    print("→ Seeding offers...")
    count = 0
    for o in OFFERS:
        existing = db.query(JobOffer).filter(JobOffer.id == o["id"]).first()
        if existing:
            print(f"  skip (exists): offer {o['id']}")
            continue

        db.add(JobOffer(
            id=o["id"],
            job_id=uuid.UUID(o["job_key"]),
            client_id=USER_IDS[o["client_key"]],
            freelancer_id=USER_IDS[o["freelancer_key"]],
            proposed_budget=o["proposed_budget"],
            currency=o["currency"],
            message=o["message"],
            status=o["status"],
            created_at=NOW - timedelta(hours=1),
            updated_at=NOW - timedelta(hours=1),
        ))
        count += 1

    db.commit()
    print(f"  ✓ {count} offers added")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\n=== LanceFy Seed Script ===\n")
    db = SessionLocal()
    try:
        seed_categories(db)
        seed_users(db)
        seed_jobs(db)
        seed_offers(db)
        print("\n✅ Seed complete!\n")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()
