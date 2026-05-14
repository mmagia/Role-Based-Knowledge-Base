import uuid
from pydantic import BaseModel
from datetime import datetime

class WriterFields(BaseModel):
    nickname: str
    hashed_password: str

class PostFields(BaseModel):
    writer_nickname: str
    post_text: str

class CreateWriter(BaseModel):
    nickname: str
    password: str

from pydantic import ConfigDict

class ShowWriter(WriterFields):
    is_confirmed: bool
    model_config = ConfigDict(from_attributes=True)

class CreatePost(PostFields):
    pass

class ShowPost(PostFields):
    post_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    writer: ShowWriter
