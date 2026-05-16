from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import async_session
from DAL import WriterDAL
from database import Writer
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

security = HTTPBearer()
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_writer(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Writer:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        nickname: str = payload.get("sub")
        if not nickname:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            writer = await writer_dal.get_writer_by_nickname(nickname)
            if not writer:
                raise credentials_exception
            return writer

async def get_current_confirmed_writer(
    current_writer: Writer = Depends(get_current_writer)
) -> Writer:
    if not current_writer.is_confirmed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Writer not confirmed"
        )
    return current_writer
