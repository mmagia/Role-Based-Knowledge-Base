from datetime import datetime
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

class Writer(Base):
    __tablename__ = "writer"

    nickname = Column(String, primary_key=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_confirmed = Column(Boolean, nullable=False, default=False)

class Post(Base):
    __tablename__ = "post"

    post_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    writer_nickname = Column(String, ForeignKey("writer.nickname"), nullable=False)
    post_text = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
