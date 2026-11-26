"""Admin module: everything the admin panel needs, isolated from the citizen API.

All routes live under /api/admin and require the X-Admin-Token header.
"""
from fastapi import APIRouter, Depends

from .auth import require_admin
from .routers import applications, demo, statuses

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])
router.include_router(statuses.router)
router.include_router(applications.router)
router.include_router(demo.router)
