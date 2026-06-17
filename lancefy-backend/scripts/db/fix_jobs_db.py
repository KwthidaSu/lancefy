import psycopg2
import os

def fix_jobs_table():
    try:
        conn = psycopg2.connect(
            dbname="keycloak",
            user="app_user",
            password="app_password",
            host="backend_db",
            port="5432"
        )
        cur = conn.cursor()
        
        print("Adding deadline_date column to jobs table...")
        cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline_date DATE;")
        
        conn.commit()
        cur.close()
        conn.close()
        print("Successfully updated jobs table.")
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    fix_jobs_table()
