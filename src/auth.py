import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from typing import Optional

pwd_context = CryptContext(schemes=["bcrypt"], deprecated = "auto")
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALG = "HS256"
EXPIRE_MIN = 60*24*7 # 1 week

def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes = EXPIRE_MIN)
    data = {"sub": str(user_id), "exp": expire}
    return jwt.encode(data, SECRET_KEY, algorithm = ALG)

def decode_token(token: str) -> Optional[int]:
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms = [ALG])
        return int(data["sub"])
    except (JWTError, KeyError, ValueError):
        return None
