from sqlalchemy import create_engine, inspect

# Use localhost:5433 for local access as mapped in docker-compose.yml
engine = create_engine("postgresql://app_user:app_password@localhost:5433/app_db")

def check_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Existing tables: {tables}")

if __name__ == "__main__":
    check_tables()
