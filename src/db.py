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

