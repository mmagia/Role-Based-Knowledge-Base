from alembic.config import Config
from alembic import command
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from DAL import *
from typing import List
from models import *
from fastapi.security import OAuth2PasswordRequestForm
from auth import create_access_token, get_current_writer
from hasher import Hasher
from database import async_session
from prometheus_fastapi_instrumentator import Instrumentator
from datetime import datetime

app = FastAPI(title="app")
instrumentator = Instrumentator().instrument(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def run_migrations():
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


@app.on_event("startup")
async def startup():
    await run_migrations()


writers_router = APIRouter()
posts_router = APIRouter()
auth_router = APIRouter()


@writers_router.post("/", response_model=ShowWriter)
async def create_writer(body: CreateWriter) -> ShowWriter:
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            exists = await writer_dal.check_writer_exists(body.nickname)
            if exists:
                raise HTTPException(status_code=400, detail="Writer already exists")
            writer = await writer_dal.create_writer(body)
            return ShowWriter(
                nickname=writer.nickname,
                hashed_password=writer.hashed_password,
                is_confirmed=writer.is_confirmed
            )


@writers_router.patch("/confirm/{nickname}", response_model=ShowWriter)
async def confirm_writer(nickname: str) -> ShowWriter:
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            writer = await writer_dal.confirm_writer_by_nickname(nickname)

            if not writer:
                raise HTTPException(status_code=404, detail="Writer not found")

            return ShowWriter(
                nickname=writer.nickname,
                hashed_password=writer.hashed_password,
                is_confirmed=writer.is_confirmed
            )


@writers_router.get("/{nickname}", response_model=ShowWriter)
async def get_writer(nickname: str) -> ShowWriter:
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            writer = await writer_dal.get_writer_by_nickname(nickname)

            if not writer:
                raise HTTPException(status_code=404, detail="Writer not found")

            return ShowWriter(
                nickname=writer.nickname,
                hashed_password=writer.hashed_password,
                is_confirmed=writer.is_confirmed
            )


@writers_router.get("/", response_model=List[ShowWriter])
async def get_all_writers(skip: int = 0, limit: int = 100) -> List[ShowWriter]:
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            writers = await writer_dal.get_all_writers(skip, limit)

            return [
                ShowWriter(
                    nickname=w.nickname,
                    hashed_password=w.hashed_password,
                    is_confirmed=w.is_confirmed
                ) for w in writers
            ]


@posts_router.post("/", response_model=ShowPost)
async def create_post(body: CreatePost) -> ShowPost:
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            writer = await writer_dal.get_writer_by_nickname(body.writer_nickname)
            if not writer:
                raise HTTPException(status_code=404, detail="Writer not found")
            if not writer.is_confirmed:
                raise HTTPException(status_code=401,
                                    detail="Your account is currently under review. Posting privileges will be enabled once an administrator approves your profile")

            post_dal = PostDAL(session)
            post = await post_dal.create_post(body)

            return ShowPost(
                post_id=post.post_id,
                writer_nickname=post.writer_nickname,
                post_text=post.post_text,
                created_at=post.created_at
            )


@posts_router.get("/writer/{writer_nickname}", response_model=List[ShowPost])
async def get_posts_by_writer(writer_nickname: str) -> List[ShowPost]:
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            posts = await post_dal.get_posts_by_writer_nickname(writer_nickname)

            return [
                ShowPost(
                    post_id=p.post_id,
                    writer_nickname=p.writer_nickname,
                    post_text=p.post_text,
                    created_at=p.created_at
                ) for p in posts
            ]


@posts_router.get("/", response_model=List[ShowPost])
async def get_all_posts(offset: int = 0, limit: int = 100) -> List[ShowPost]:
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            posts = await post_dal.get_all_posts(offset, limit)

            return [
                ShowPost(
                    post_id=p.post_id,
                    writer_nickname=p.writer_nickname,
                    post_text=p.post_text,
                    created_at=p.created_at
                ) for p in posts
            ]


@posts_router.get("/{post_id}", response_model=ShowPost)
async def get_post_by_id(post_id: uuid.UUID) -> ShowPost:
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            post = await post_dal.get_post_by_id(post_id)

            if not post:
                raise HTTPException(status_code=404, detail="Post not found")

            return ShowPost(
                post_id=post.post_id,
                writer_nickname=post.writer_nickname,
                post_text=post.post_text,
                created_at=post.created_at
            )


@posts_router.delete("/{post_id}")
async def delete_post(post_id: uuid.UUID):
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            deleted = await post_dal.delete_post(post_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Post not found")
            return {"message": "Post deleted successfully"}


@posts_router.get("/recent/{hours}", response_model=List[ShowPost])
async def get_recent_posts(hours: int) -> List[ShowPost]:
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            posts = await post_dal.get_recent_posts(hours)
            return [
                ShowPost(
                    post_id=p.post_id,
                    writer_nickname=p.writer_nickname,
                    post_text=p.post_text,
                    created_at=p.created_at
                ) for p in posts
            ]


@posts_router.get("/date-range/", response_model=List[ShowPost])
async def get_posts_by_date_range(start_date: datetime, end_date: datetime) -> List[ShowPost]:
    start_date = start_date.replace(tzinfo=None)
    end_date = end_date.replace(tzinfo=None)
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            posts = await post_dal.get_posts_by_date_range(start_date, end_date)

            return [
                ShowPost(
                    post_id=p.post_id,
                    writer_nickname=p.writer_nickname,
                    post_text=p.post_text,
                    created_at=p.created_at
                ) for p in posts
            ]


@posts_router.get("/count/{writer_nickname}")
async def count_posts_by_writer(writer_nickname: str):
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            count = await post_dal.count_posts_by_writer(writer_nickname)
            return {"writer_nickname": writer_nickname, "post_count": count}


@posts_router.delete("/writer/{writer_nickname}")
async def delete_all_posts_by_writer(writer_nickname: str):
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            count = await post_dal.delete_all_posts_by_writer(writer_nickname)
            return {"message": f"Deleted {count} posts from writer {writer_nickname}"}


@posts_router.get("/paginated/", response_model=dict)
async def get_posts_with_pagination(page: int = 1, page_size: int = 10):
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            result = await post_dal.get_posts_with_pagination(page, page_size)

            result["posts"] = [
                ShowPost(
                    post_id=p.post_id,
                    writer_nickname=p.writer_nickname,
                    post_text=p.post_text,
                    created_at=p.created_at
                ) for p in result["posts"]
            ]

            return result


@posts_router.get("/search/", response_model=List[ShowPost])
async def search_posts(search_term: str):
    async with async_session() as session:
        async with session.begin():
            post_dal = PostDAL(session)
            posts = await post_dal.search_posts(search_term)

            return [
                ShowPost(
                    post_id=p.post_id,
                    writer_nickname=p.writer_nickname,
                    post_text=p.post_text,
                    created_at=p.created_at
                ) for p in posts
            ]


@auth_router.post("/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    async with async_session() as session:
        async with session.begin():
            writer_dal = WriterDAL(session)
            writer = await writer_dal.get_writer_by_nickname(form_data.username)

            if not writer:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect nickname or password"
                )

            if not Hasher.verify_password(form_data.password, writer.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect nickname or password"
                )

            access_token = create_access_token(data={"sub": writer.nickname})
            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                writer=ShowWriter(
                    nickname=writer.nickname,
                    hashed_password=writer.hashed_password,
                    is_confirmed=writer.is_confirmed
                )
            )


@auth_router.get("/me", response_model=ShowWriter)
async def get_current_writer_info(current_writer: Writer = Depends(get_current_writer)):
    return ShowWriter(
        nickname=current_writer.nickname,
        hashed_password=current_writer.hashed_password,
        is_confirmed=current_writer.is_confirmed
    )


main_api_router = APIRouter()
main_api_router.include_router(writers_router, prefix="/writer", tags=["writer"])
main_api_router.include_router(posts_router, prefix="/post", tags=["post"])
main_api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(main_api_router)
instrumentator.expose(app)
