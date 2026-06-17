"""
SLA Constants — Lancefy Platform
=================================
ค่า SLA ทั้งหมดของระบบ อ้างอิงจาก settings ใน config.py
ใช้ไฟล์นี้เพื่อ import ได้ตรงโดยไม่ต้อง import settings ทุกที่

Usage:
    from app.core.sla import SLA

    threshold = datetime.utcnow() - timedelta(days=SLA.CLIENT_REVIEW_DAYS)
"""

from app.core.config import settings


class SLA:
    # ─── Job ─────────────────────────────────────────────────────
    # job ที่ไม่กำหนด expires_at จะหมดอายุอัตโนมัติหลังจากวันที่สร้าง
    JOB_DEFAULT_EXPIRY_DAYS: int = settings.SLA_JOB_DEFAULT_EXPIRY_DAYS

    # ─── Milestone / Payment ──────────────────────────────────────
    # client ต้องโอนเงินเข้า escrow ภายในกี่วันหลังเริ่ม milestone
    # ถ้าไม่จ่าย → ระบบปิด project และคืนเงินที่ funded ไว้แล้ว
    MILESTONE_FUNDING_DAYS: int = settings.SLA_MILESTONE_FUNDING_DAYS

    # client มีเวลากี่วันในการตรวจงานหลัง freelancer submit
    # ถ้าไม่ตรวจ → submission.auto_release_eligible = True → admin force approve ได้
    CLIENT_REVIEW_DAYS: int = settings.SLA_CLIENT_REVIEW_DAYS

    # หลัง milestone สุดท้าย approved แล้ว client ไม่กด confirm project
    # ระบบจะ auto-complete project อัตโนมัติ
    PROJECT_AUTO_COMPLETE_DAYS: int = settings.SLA_PROJECT_AUTO_COMPLETE_DAYS

    # ─── Review ──────────────────────────────────────────────────
    # client รีวิว freelancer ได้กี่วันหลัง project เสร็จ
    # หลังพ้น window → POST /reviews คืน 409
    REVIEW_WINDOW_DAYS: int = settings.SLA_REVIEW_WINDOW_DAYS

    # ─── Dispute ─────────────────────────────────────────────────
    # buffer หลัง milestone due_date ก่อนที่ระบบจะ flag overdue
    # ให้เวลา freelancer เปิด dispute ก่อน auto-cancel
    DISPUTE_BUFFER_DAYS: int = settings.SLA_DISPUTE_BUFFER_DAYS
