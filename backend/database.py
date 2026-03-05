from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Defaulting to SQLite for initial development and testing Phase 1 schema
SQLALCHEMY_DATABASE_URL = "sqlite:///./sdr_command_center.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
