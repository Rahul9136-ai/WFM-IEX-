"""Pytest fixtures: an ASGI test client wired to the FastAPI app.

The liveness test needs no database. Module tests (from Module 2 on) will add a
transactional SQLite/Postgres fixture and override the `get_db` dependency.
"""
from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
