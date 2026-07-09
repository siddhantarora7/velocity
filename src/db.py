import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

# For deployment: fall to sqlite if postgres unavailable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///velocity.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if os.getenv("DATABASE_URL") is None:
    print("WARNING: DATABASE_URL not set, using local sqlite. On ephemeral hosts "
          "(HF Spaces, Render free tier) users and shots are WIPED on every restart.")

# Initialize our databse via engine
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args = connect_args)
SessionLocal = sessionmaker(bind = engine, autoflush = False, autocommit = False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    # Init columns
    id = Column(Integer, primary_key = True)
    email = Column(String, unique = True, index = True, nullable = False)
    password_hash = Column(String, nullable = False)
    created_at = Column(DateTime, default=datetime.utcnow)
    shots = relationship("Shot", back_populates="user")

class Shot(Base):
    # Table to store shot data
    __tablename__ = "shots"
    id = Column(Integer, primary_key = True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    fastest_kmh = Column(Float, nullable = False)
    launch_kmh = Column(Float, nullable = True)
    kick_found = Column(Boolean, default = False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="shots")

Base.metadata.create_all(engine)

def get_db():
    # For FastAPI
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
