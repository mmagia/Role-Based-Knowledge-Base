import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/testdb")
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport


@pytest.fixture(autouse=True)
def mock_migrations():
    with patch('main.run_migrations', AsyncMock()):
        yield


@pytest.fixture
def mock_db():
    mock_session = MagicMock()
    mock_session.begin.return_value.__aenter__ = AsyncMock()
    mock_session.begin.return_value.__aexit__ = AsyncMock(return_value=None)

    default_mock = MagicMock()
    default_mock.scalar_one_or_none.return_value = None
    default_mock.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(return_value=default_mock)
    mock_session.flush = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.delete = AsyncMock()

    with patch('main.async_session') as mock_async_session:
        mock_async_session.return_value.__aenter__.return_value = mock_session
        mock_async_session.return_value.__aexit__.return_value = None
        yield mock_session


@pytest.fixture
async def client(mock_db):
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
