import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from passlib.context import CryptContext
from dott
from jose, jwt, JWTError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated = "auto")
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALG = "HS256"
EXPIRE_MIN = 60*24*7 # 1 week

def hash_password(raw):
    return pwd_context.hash(raw)

def verify_password(raw, hashed):
    return pwd_context.verify(raw, hashed)

