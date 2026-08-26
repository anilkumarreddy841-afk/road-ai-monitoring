from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Local development commands run from backend/, while shared configuration
# lives at the repository root.
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# SUPABASE_DB_URL takes precedence so local Docker and Supabase deployments can
# use the same application code. The REST URL alone cannot authenticate a
# SQLAlchemy connection; use the Postgres connection string from Supabase.
DATABASE_URL = (
    os.getenv('SUPABASE_DB_URL')
    or os.getenv('DATABASE_URL')
    or 'sqlite:///./dev.db'
)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if 'sqlite' in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
