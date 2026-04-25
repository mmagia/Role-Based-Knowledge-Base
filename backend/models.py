import uuid
from pydantic import BaseModel
from datetime import datetime

class WriterFields(BaseModel):
    nickname: str
    hashed_password: str

class PostFields(BaseModel):
    writer_nickname: str
    post_text: str

class CreateWriter(WriterFields): 
    pass

class ShowWriter(WriterFields):
    is_confirmed: bool
    class Config:
        from_attributes = True

class CreatePost(PostFields):
    pass

class ShowPost(PostFields):
    post_id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

