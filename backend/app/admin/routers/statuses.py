from fastapi import APIRouter

from ...statuses import NEXT_STATUS, Status
from ..schemas import StatusInfo

router = APIRouter(prefix="/statuses", tags=["admin: statuses"])

# Only codes and rules here. Human-readable RU/KY titles live in the frontends
# (admin_panel/js/locales, Flutter app), so the backend stays language-neutral.
_NEEDS_EXPLANATION = {Status.ACTION_REQUIRED, Status.REJECTED}


@router.get("", response_model=list[StatusInfo])
def list_statuses():
    """Known status codes with their rules, for dropdowns in the admin panel."""
    return [
        StatusInfo(code=s, needs_explanation=s in _NEEDS_EXPLANATION, next=NEXT_STATUS.get(s))
        for s in Status
    ]
