from unittest.mock import MagicMock
import uuid
from httpx import AsyncClient, ASGITransport
from main import app


class TestApp:
    async def test_app_title(self):
        assert app.title == "app"

    async def test_cors_configured(self):
        middleware = [m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware"]
        assert len(middleware) == 1
        assert middleware[0].kwargs.get("allow_origins") == ["*"]


class TestWriterEndpoints:
    async def test_get_writers_empty(self, client, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        response = await client.get("/writer/")
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_writer_not_found(self, client, mock_db):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        response = await client.get("/writer/nonexistent")
        assert response.status_code == 404
        assert response.json() == {"detail": "Writer not found"}

    async def test_get_writer_found(self, client, mock_db):
        mock_writer = MagicMock()
        mock_writer.nickname = "alice"
        mock_writer.hashed_password = "$2b$12$hashed"
        mock_writer.is_confirmed = False
        mock_db.execute.return_value.scalar_one_or_none.return_value = mock_writer

        response = await client.get("/writer/alice")
        assert response.status_code == 200
        data = response.json()
        assert data["nickname"] == "alice"
        assert data["is_confirmed"] is False

    async def test_confirm_writer(self, client, mock_db):
        mock_writer = MagicMock()
        mock_writer.nickname = "bob"
        mock_writer.hashed_password = "hash"
        mock_writer.is_confirmed = True
        mock_db.execute.return_value.scalar_one_or_none.return_value = mock_writer

        response = await client.patch("/writer/confirm/bob")
        assert response.status_code == 200
        assert response.json()["nickname"] == "bob"
        assert response.json()["is_confirmed"] is True


class TestPostEndpoints:
    async def test_get_posts_empty(self, client, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        response = await client.get("/post/")
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_post_not_found(self, client, mock_db):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        response = await client.get(f"/post/{uuid.uuid4()}")
        assert response.status_code == 404

    async def test_search_posts_empty(self, client, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        response = await client.get("/post/search/", params={"search_term": "test"})
        assert response.status_code == 200
        assert response.json() == []
