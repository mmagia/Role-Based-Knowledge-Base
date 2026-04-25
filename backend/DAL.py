from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence
from datetime import datetime, timedelta
import uuid
from database import Writer, Post
from models import CreateWriter, CreatePost


class WriterDAL:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_writer(self, writer_data: CreateWriter) -> Writer:
        new_writer = Writer(
            nickname=writer_data.nickname,
            hashed_password=writer_data.hashed_password,  # hash at the endpoint level
            is_confirmed=False
        )
        self.db_session.add(new_writer)
        await self.db_session.flush()
        return new_writer
    
    async def confirm_writer_by_nickname(self, nickname: str) -> Writer | None:
        query = select(Writer).where(Writer.nickname == nickname)
        result = await self.db_session.execute(query)
        writer = result.scalar_one_or_none()
        
        if writer:
            writer.is_confirmed = True
            await self.db_session.commit()
            await self.db_session.refresh(writer)
            return writer
        
        return None
    
    async def get_writer_by_nickname(self, nickname: str) -> Writer | None:
        query = select(Writer).where(Writer.nickname == nickname)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_all_writers(self, skip: int, limit: int) -> Sequence[Writer]:
        query = select(Writer).offset(skip).limit(limit).order_by(Writer.nickname)
        result = await self.db_session.execute(query)
        return result.scalars().all()
    
    async def check_writer_exists(self, nickname: str) -> bool:
        query = select(Writer).where(Writer.nickname == nickname)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none() is not None


class PostDAL:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def create_post(self, post_model: CreatePost) -> Post:
        post = Post(
            writer_nickname=post_model.writer_nickname,
            post_text=post_model.post_text,
            created_at=datetime.utcnow()
        )
        self.db_session.add(post)
        await self.db_session.flush()
        return post
    
    async def get_posts_by_writer_nickname(self, writer_nickname: str) -> Sequence[Post]:
        query = (
            select(Post)
            .where(Post.writer_nickname == writer_nickname)
            .order_by(Post.created_at.desc())
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_all_posts(self, offset: int, limit: int) -> Sequence[Post]:
        query = (
            select(Post)
            .offset(offset)
            .limit(limit)
            .order_by(Post.created_at.desc())
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
    
    async def get_post_by_id(self, post_id: uuid.UUID) -> Post | None:
        query = select(Post).where(Post.post_id == post_id)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def delete_post(self, post_id: uuid.UUID) -> bool:
        query = select(Post).where(Post.post_id == post_id)
        result = await self.db_session.execute(query)
        post = result.scalar_one_or_none()
        
        if post:
            await self.db_session.delete(post)
            await self.db_session.commit()
            return True
        
        return False
    

    async def get_recent_posts(self, hours: int) -> Sequence[Post]:
        since_time = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(Post)
            .where(Post.created_at >= since_time)
            .order_by(Post.created_at.desc())
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
    
    async def get_posts_by_date_range(self, start_date: datetime, end_date: datetime) -> Sequence[Post]:
        query = (
            select(Post)
            .where(Post.created_at.between(start_date, end_date))
            .order_by(Post.created_at)
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
    
    async def count_posts_by_writer(self, writer_nickname: str) -> int:
        query = select(Post).where(Post.writer_nickname == writer_nickname)
        result = await self.db_session.execute(query)
        return len(result.scalars().all())
    
    
    async def delete_all_posts_by_writer(self, writer_nickname: str) -> int:
        query = select(Post).where(Post.writer_nickname == writer_nickname)
        result = await self.db_session.execute(query)
        posts = result.scalars().all()

        count = len(posts)
        for post in posts:
            await self.db_session.delete(post)
        
        await self.db_session.commit()
        return count
    
    async def get_posts_with_pagination(self, page: int, page_size: int) -> dict:
        offset = (page - 1) * page_size
        
        # total count
        count_query = select(func.count()).select_from(Post)
        count_result = await self.db_session.execute(count_query)
        total_count = count_result.scalar()
        
        # paginated
        query = (
            select(Post)
            .offset(offset)
            .limit(page_size)
            .order_by(Post.created_at.desc())
        )
        result = await self.db_session.execute(query)
        posts = result.scalars().all()
        
        return {
            "posts": posts,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    
    # very primitive
    async def search_posts(self, search_term: str) -> Sequence[Post]:
        query = (
            select(Post)
            .where(Post.post_text.ilike(f"%{search_term}%"))
            .order_by(Post.created_at.desc())
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
    