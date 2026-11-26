"""Citizen-facing API: read-only. All changes go through the admin API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import demo_state
from ..database import get_db
from ..models import Application
from ..schemas import ApplicationOut

router = APIRouter(prefix="/api/applications", tags=["citizen"])


def _check_fail_mode() -> None:
    if demo_state.fail_mode:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")


@router.get("", response_model=list[ApplicationOut], dependencies=[Depends(_check_fail_mode)])
def list_applications(db: Session = Depends(get_db)):
    """Newest update first, so recently changed applications are on top."""
    return db.scalars(select(Application).order_by(Application.updated_at.desc())).all()


@router.get("/{app_id}", response_model=ApplicationOut, dependencies=[Depends(_check_fail_mode)])
def get_application(app_id: int, db: Session = Depends(get_db)):
    app = db.get(Application, app_id)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return app
