import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import SessionLocal
from sqlalchemy import text

def fix():
    db = SessionLocal()
    try:
        print("Checking users table...")
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).fetchall()
        cols = [r[0] for r in res]
        print(f"Current columns in users: {cols}")
        
        if 'avatar_url' not in cols:
            print("Adding avatar_url to users...")
            db.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
        if 'bio' not in cols:
            print("Adding bio to users...")
            db.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR"))
            
        print("Checking chat_rooms table...")
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_rooms'")).fetchall()
        cols = [r[0] for r in res]
        print(f"Current columns in chat_rooms: {cols}")
        
        # Add any missing columns to chat_rooms if needed
        # (Based on models.py seen earlier)
            
        db.commit()
        print("Database fix completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during database fix: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix()
