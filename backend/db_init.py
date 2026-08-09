"""
db_init.py — one-off script to create all database tables.

Run from inside the backend/ directory with the venv active:

    python db_init.py

This imports every model so SQLAlchemy's metadata is fully populated
before create_all() is called. Safe to re-run — create_all uses
IF NOT EXISTS semantics and will not drop or alter existing tables.
"""
from app.database import Base, engine

# Import all models so their table definitions are registered on Base.metadata
from app.models import Project, Log, Alert  # noqa: F401


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. Tables created (or already exist):")
    for table_name in Base.metadata.tables:
        print(f"  - {table_name}")


if __name__ == "__main__":
    main()
