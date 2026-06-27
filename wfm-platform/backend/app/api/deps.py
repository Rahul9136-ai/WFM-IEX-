"""Shared FastAPI dependencies.

The DB session dependency lives here so routers import from one place. Auth /
RBAC dependencies (`get_current_user`, `require_permission`) are added in
Modules 2–3 and will also be exposed from here.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

DbSession = Annotated[AsyncSession, Depends(get_db)]
