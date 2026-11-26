"""Switches that drive the defense demo (empty list, load error, reset)."""
from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ... import demo_state
from ...database import get_db
from ...models import Application
from ...seed import reset_data
from .. import service
from ..schemas import DemoState, FailModeIn

router = APIRouter(prefix="/demo", tags=["admin: demo"])


def _state(db: Session) -> DemoState:
    return DemoState(fail_mode=demo_state.fail_mode, total_applications=service.count_applications(db))


@router.get("/state", response_model=DemoState)
def get_state(db: Session = Depends(get_db)):
    return _state(db)


@router.post("/reset", response_model=DemoState)
def reset(db: Session = Depends(get_db)):
    """Restore the original test applications and turn fail mode off."""
    reset_data(db)
    demo_state.fail_mode = False
    return _state(db)


@router.post("/clear", response_model=DemoState)
def clear(db: Session = Depends(get_db)):
    """Delete all applications -> citizen app shows 'no applications yet'."""
    db.execute(delete(Application))
    db.commit()
    return _state(db)


@router.put("/fail", response_model=DemoState)
def set_fail_mode(body: FailModeIn, db: Session = Depends(get_db)):
    """On: citizen API returns 503 -> citizen app shows 'data didn't load'."""
    demo_state.fail_mode = body.enabled
    return _state(db)
