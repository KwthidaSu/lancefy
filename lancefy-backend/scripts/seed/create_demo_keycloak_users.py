"""
create_demo_keycloak_users.py — สร้าง Keycloak accounts สำหรับ demo users

รัน AFTER scripts/seed/seed_demo.py เพื่อสร้าง login accounts ใน Keycloak
    python scripts/seed/create_demo_keycloak_users.py

ต้องการ environment variables:
    KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET

Demo password สำหรับทุก account: Demo@1234
"""

import sys
import uuid
from pathlib import Path

# ─── Use the same Keycloak admin service already in the project ───
BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import requests
from app.core.config import settings

DEMO_PASSWORD = "Demo@1234"
KEYCLOAK_ADMIN_USER = "admin"
KEYCLOAK_ADMIN_PASS = "admin"


def get_admin_token() -> str:
    """Get token via Keycloak master realm admin credentials."""
    resp = requests.post(
        f"{settings.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={
            "client_id": "admin-cli",
            "username": KEYCLOAK_ADMIN_USER,
            "password": KEYCLOAK_ADMIN_PASS,
            "grant_type": "password",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def assign_realm_role_to_user(user_id: str, role_name: str):
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    role_resp = requests.get(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/roles/{role_name}",
        headers=headers,
    )
    if role_resp.status_code == 404:
        print(f"       ⚠ Role '{role_name}' not found in realm — skipping role assignment")
        return
    role_resp.raise_for_status()

    requests.post(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm",
        headers=headers,
        json=[role_resp.json()],
    ).raise_for_status()

DEMO_USERS = [
    # Clients
    {"email": "somchai@demo.lancefy.io",   "username": "somchai_client",   "firstname": "สมชาย",    "lastname": "ใจดี",           "role": "client"},
    {"email": "nattaporn@demo.lancefy.io", "username": "nattaporn_biz",    "firstname": "ณัฐภรณ์",  "lastname": "วงศ์รุ่งเรือง",  "role": "client"},
    {"email": "prayuth@demo.lancefy.io",   "username": "prayuth_startup",  "firstname": "ประยุทธ์", "lastname": "สตาร์ทอัพ",      "role": "client"},
    {"email": "siriporn@demo.lancefy.io",  "username": "siriporn_corp",    "firstname": "ศิริพร",   "lastname": "คอร์ปอเรท",      "role": "client"},
    # Freelancers
    {"email": "mintra@demo.lancefy.io",    "username": "mintra_design",    "firstname": "มินตรา",   "lastname": "ศิลปกร",         "role": "freelancer"},
    {"email": "krit@demo.lancefy.io",      "username": "krit_dev",         "firstname": "กฤต",      "lastname": "โค้ดดี",         "role": "freelancer"},
    {"email": "aim@demo.lancefy.io",       "username": "aim_creative",     "firstname": "เอม",      "lastname": "ครีเอทีฟ",       "role": "freelancer"},
    {"email": "pat@demo.lancefy.io",       "username": "pat_motion",       "firstname": "ภัทร",     "lastname": "มูฟวิ่ง",        "role": "freelancer"},
    {"email": "nong@demo.lancefy.io",      "username": "nong_writer",      "firstname": "น้อง",     "lastname": "นักเขียน",       "role": "freelancer"},
]

from app.core.config import settings


def create_user_full(email: str, username: str, firstname: str, lastname: str, password: str) -> str | None:
    """Create Keycloak user with name + permanent password (no required actions)."""
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "username": username,
        "email": email,
        "firstName": firstname,
        "lastName": lastname,
        "enabled": True,
        "emailVerified": True,
        "credentials": [{"type": "password", "value": password, "temporary": False}],
    }

    resp = requests.post(
        f"{settings.KEYCLOAK_URL}/admin/realms/{settings.KEYCLOAK_REALM}/users",
        headers=headers,
        json=payload,
    )

    if resp.status_code == 409:
        return None  # already exists

    resp.raise_for_status()
    return resp.headers["Location"].split("/")[-1]


def main():
    print()
    print("=" * 60)
    print("  Creating Demo Keycloak Users")
    print("=" * 60)
    print()

    for u in DEMO_USERS:
        print(f"  → {u['email']} ({u['role']})...")
        try:
            kc_user_id = create_user_full(
                email=u["email"],
                username=u["username"],
                firstname=u["firstname"],
                lastname=u["lastname"],
                password=DEMO_PASSWORD,
            )

            if kc_user_id:
                assign_realm_role_to_user(kc_user_id, u["role"])
                print(f"     ✓ Created: {kc_user_id}")
            else:
                print(f"     ⚠ Skipped (already exists)")

        except Exception as e:
            print(f"     ✗ Failed: {e}")

    print()
    print("=" * 60)
    print("  Done! Login credentials:")
    print("  Password for all accounts: Demo@1234")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
