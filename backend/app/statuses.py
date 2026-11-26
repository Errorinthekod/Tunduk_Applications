"""Status codes and the transitions used in the demo.

The backend only returns codes. Translating them into Kyrgyz/Russian
titles, next steps and buttons is the Flutter app's job.
"""
from enum import StrEnum


class Status(StrEnum):
    SUBMITTED = "SUBMITTED"
    IN_REVIEW = "IN_REVIEW"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


KNOWN_STATUSES = {s.value for s in Status}

# The demo scenario: SUBMITTED -> IN_REVIEW -> ACTION_REQUIRED -> COMPLETED
NEXT_STATUS: dict[str, str] = {
    Status.SUBMITTED: Status.IN_REVIEW,
    Status.IN_REVIEW: Status.ACTION_REQUIRED,
    Status.ACTION_REQUIRED: Status.COMPLETED,
}
