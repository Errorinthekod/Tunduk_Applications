from fastapi import APIRouter

from ...statuses import NEXT_STATUS, Status
from ..schemas import StatusInfo

router = APIRouter(prefix="/statuses", tags=["admin: statuses"])

# Admin-facing labels. Citizen-facing RU/KY texts live in the Flutter app.
_LABELS = {
    Status.SUBMITTED: "Application accepted",
    Status.IN_REVIEW: "Under review",
    Status.ACTION_REQUIRED: "Clarification required",
    Status.COMPLETED: "Result ready",
    Status.REJECTED: "Service denied",
}
_NEEDS_EXPLANATION = {Status.ACTION_REQUIRED, Status.REJECTED}


@router.get("", response_model=list[StatusInfo])
def list_statuses():
    """Known status codes, for dropdowns in the admin panel."""
    return [
        StatusInfo(
            code=s,
            label=_LABELS[s],
            needs_explanation=s in _NEEDS_EXPLANATION,
            next=NEXT_STATUS.get(s),
        )
        for s in Status
    ]
