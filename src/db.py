from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

# Create db
engine = create_engine("sqlite:///velocity.db", connect_args = {"check_same_thread": False})
SessionLocal = sessionmaker(bind = engine, autoflush = False, autocommit = False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    # Init columns
    id = Column(Integer, primary_key = True)
    email = Column(String, unique = True, index = True, nullable = False)
    password_hash = Column(String, nullable = False)
    created_at = Column(DateTime, default=datetime.utconow)
    shots = relationship("Shot", back_populates="user")

class Shot(Base):
    # Table to store shot data
    __table__name = "shots"
    id = Column(Integer, primary_key = True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable = False)
    fastest_kmh = Column(Float, nullable = False)
    launch_kmh = Column(Float, nullable = True)
    kick_found = Column(Boolean, default = False)
    created_at = Column(DateTime, default=dattetime.utcnow)
    user = relationship("User", back_populates="shots")

Base.metadate.create_all(engine)

def get_db():
    # For FastAPI
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
