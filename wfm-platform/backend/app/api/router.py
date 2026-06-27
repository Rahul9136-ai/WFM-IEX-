"""Top-level API router. Each module registers its sub-router here as it is built."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import health

api_router = APIRouter()

# --- v1 routes ---
api_router.include_router(health.router, tags=["system"])

# Future modules plug in here, e.g.:
# api_router.include_router(identity.auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(workforce.employees.router, prefix="/employees", tags=["employees"])
