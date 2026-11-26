"""Admin business logic. Routers stay thin and only translate results to HTTP."""
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Application, utcnow
from ..statuses import KNOWN_STATUSES, NEXT_STATUS, Status
from .schemas import ApplicationCreate, ApplicationUpdate

UNKNOWN_FILTER = "UNKNOWN"  # special filter value: any code we don't recognise

DEFAULT_ACTION_EXPLANATION = {
    "explanation_ru": "Уточните контактный номер телефона.",
    "explanation_ky": "Байланыш телефон номериңизди тактаңыз.",
}

# Changing any of these is something the citizen sees -> bump updated_at.
_CITIZEN_VISIBLE = {"status", "explanation_ru", "explanation_ky"}


class DuplicateNumberError(Exception):
    pass


class NoNextStatusError(Exception):
    pass


def list_applications(db: Session, status: str | None = None, q: str | None = None) -> Sequence[Application]:
    stmt = select(Application).order_by(Application.updated_at.desc())
    if status == UNKNOWN_FILTER:
        stmt = stmt.where(Application.status.not_in(KNOWN_STATUSES))
    elif status:
        stmt = stmt.where(Application.status == status.upper())
    apps = db.scalars(stmt).all()

    # Search in Python: SQLite's LIKE is case-insensitive only for ASCII,
    # so it would miss Cyrillic matches. Fine for prototype data volumes.
    if q and (needle := q.strip().casefold()):
        apps = [
            a for a in apps
            if needle in a.number.casefold()
            or needle in a.service_name_ru.casefold()
            or needle in a.service_name_ky.casefold()
        ]
    return apps


def get_application(db: Session, app_id: int) -> Application | None:
    return db.get(Application, app_id)


def _number_exists(db: Session, number: str) -> bool:
    return db.scalar(select(Application.id).where(Application.number == number)) is not None


def _generate_number(db: Session) -> str:
    year = datetime.now().year
    n = (db.scalar(select(func.max(Application.id))) or 0) + 101
    while _number_exists(db, f"{year}-{n:06d}"):
        n += 1
    return f"{year}-{n:06d}"


def create_application(db: Session, data: ApplicationCreate) -> Application:
    number = data.number or _generate_number(db)
    if _number_exists(db, number):
        raise DuplicateNumberError(number)
    app = Application(**data.model_dump(exclude={"number"}), number=number, updated_at=utcnow())
    db.add(app)
    db.commit()
    return app


def update_application(db: Session, app: Application, data: ApplicationUpdate) -> Application:
    changes = data.model_dump(exclude_unset=True)
    visible_change = False
    for field, value in changes.items():
        if field in ("service_name_ru", "service_name_ky") and value is None:
            continue  # names can't be cleared
        if getattr(app, field) != value:
            setattr(app, field, value)
            visible_change |= field in _CITIZEN_VISIBLE
    if visible_change:
        app.updated_at = utcnow()
    db.commit()
    return app


def advance_application(db: Session, app: Application) -> Application:
    """Move along the demo chain: SUBMITTED -> IN_REVIEW -> ACTION_REQUIRED -> COMPLETED."""
    next_status = NEXT_STATUS.get(app.status)
    if next_status is None:
        raise NoNextStatusError(app.status)
    app.status = next_status
    if next_status == Status.ACTION_REQUIRED:
        app.explanation_ru = DEFAULT_ACTION_EXPLANATION["explanation_ru"]
        app.explanation_ky = DEFAULT_ACTION_EXPLANATION["explanation_ky"]
    else:
        app.explanation_ru = app.explanation_ky = None
    app.updated_at = utcnow()
    db.commit()
    return app


def delete_application(db: Session, app: Application) -> None:
    db.delete(app)
    db.commit()


def count_applications(db: Session) -> int:
    return db.scalar(select(func.count(Application.id))) or 0
