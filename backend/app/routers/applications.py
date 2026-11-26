from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import demo_state
from ..database import get_db
from ..models import Application, utcnow
from ..schemas import ApplicationOut, StatusUpdate
from ..statuses import NEXT_STATUS, Status

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _check_fail_mode() -> None:
    if demo_state.fail_mode:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")


def _get_or_404(db: Session, app_id: int) -> Application:
    app = db.get(Application, app_id)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.get("", response_model=list[ApplicationOut], dependencies=[Depends(_check_fail_mode)])
def list_applications(db: Session = Depends(get_db)):
    """Newest update first, so recently changed applications are on top."""
    return db.scalars(select(Application).order_by(Application.updated_at.desc())).all()


@router.get("/{app_id}", response_model=ApplicationOut, dependencies=[Depends(_check_fail_mode)])
def get_application(app_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, app_id)


@router.post("/{app_id}/advance", response_model=ApplicationOut)
def advance_status(app_id: int, db: Session = Depends(get_db)):
    """Demo: move to the next status (IN_REVIEW -> ACTION_REQUIRED -> COMPLETED)."""
    app = _get_or_404(db, app_id)
    next_status = NEXT_STATUS.get(app.status)
    if next_status is None:
        raise HTTPException(status_code=409, detail=f"No next status after {app.status}")

    app.status = next_status
    if next_status == Status.ACTION_REQUIRED:
        app.explanation_ru = "Уточните контактный номер телефона."
        app.explanation_ky = "Байланыш телефон номериңизди тактаңыз."
    else:
        app.explanation_ru = app.explanation_ky = None
    app.updated_at = utcnow()
    db.commit()
    return app


@router.patch("/{app_id}/status", response_model=ApplicationOut)
def set_status(app_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    """Demo: set any status code, including unknown ones."""
    app = _get_or_404(db, app_id)
    app.status = body.status
    app.explanation_ru = body.explanation_ru
    app.explanation_ky = body.explanation_ky
    app.updated_at = utcnow()
    db.commit()
    return app
