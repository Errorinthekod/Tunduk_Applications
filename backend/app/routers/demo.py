"""Endpoints that exist only to drive the defense demo."""
from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.orm import Session

from .. import demo_state
from ..database import get_db
from ..models import Application
from ..schemas import FailMode
from ..seed import reset_data

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/reset")
def reset(db: Session = Depends(get_db)):
    """Restore the original test applications."""
    reset_data(db)
    demo_state.fail_mode = False
    return {"ok": True}


@router.post("/clear")
def clear(db: Session = Depends(get_db)):
    """Delete all applications -> shows the 'no applications yet' state."""
    db.execute(delete(Application))
    db.commit()
    return {"ok": True}


@router.post("/fail")
def set_fail_mode(body: FailMode):
    """Turn on/off simulated server errors -> shows the 'data didn't load' state."""
    demo_state.fail_mode = body.enabled
    return {"fail_mode": demo_state.fail_mode}
