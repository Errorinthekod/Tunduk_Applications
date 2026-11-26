from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Application
from ...schemas import ApplicationOut
from .. import service
from ..schemas import ApplicationCreate, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["admin: applications"])


def _get_or_404(app_id: int, db: Session = Depends(get_db)) -> Application:
    app = service.get_application(db, app_id)
    if app is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    status_code: str | None = Query(None, alias="status", description="Status code, or UNKNOWN"),
    q: str | None = Query(None, max_length=100, description="Search by number or service name"),
    db: Session = Depends(get_db),
):
    return service.list_applications(db, status=status_code, q=q)


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(body: ApplicationCreate, db: Session = Depends(get_db)):
    try:
        return service.create_application(db, body)
    except service.DuplicateNumberError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Number {e} already exists") from e


@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app: Application = Depends(_get_or_404)):
    return app


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    body: ApplicationUpdate,
    app: Application = Depends(_get_or_404),
    db: Session = Depends(get_db),
):
    return service.update_application(db, app, body)


@router.post("/{app_id}/advance", response_model=ApplicationOut)
def advance_application(app: Application = Depends(_get_or_404), db: Session = Depends(get_db)):
    try:
        return service.advance_application(db, app)
    except service.NoNextStatusError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"No next status after {e}") from e


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(app: Application = Depends(_get_or_404), db: Session = Depends(get_db)):
    service.delete_application(db, app)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
