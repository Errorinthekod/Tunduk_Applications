from pydantic import BaseModel, Field, field_validator

from ..statuses import Status


def _clean_text(v: str | None) -> str | None:
    """Trim whitespace; treat empty text as 'no explanation'."""
    if v is None:
        return None
    v = v.strip()
    return v or None


def _clean_status(v: str | None) -> str | None:
    return v.strip().upper() if v is not None else None


class ApplicationCreate(BaseModel):
    number: str | None = Field(default=None, max_length=32, description="Auto-generated if empty")
    service_name_ru: str = Field(min_length=1, max_length=255)
    service_name_ky: str = Field(min_length=1, max_length=255)
    status: str = Field(default=Status.SUBMITTED, min_length=1, max_length=32)
    explanation_ru: str | None = None
    explanation_ky: str | None = None

    _status = field_validator("status")(_clean_status)
    _texts = field_validator("number", "explanation_ru", "explanation_ky")(_clean_text)


class ApplicationUpdate(BaseModel):
    """Partial update: only the fields that are sent are changed."""

    service_name_ru: str | None = Field(default=None, min_length=1, max_length=255)
    service_name_ky: str | None = Field(default=None, min_length=1, max_length=255)
    # Any code is accepted on purpose, so an unknown status can be demonstrated.
    status: str | None = Field(default=None, min_length=1, max_length=32)
    explanation_ru: str | None = None
    explanation_ky: str | None = None

    _status = field_validator("status")(_clean_status)
    _texts = field_validator("explanation_ru", "explanation_ky")(_clean_text)


class StatusInfo(BaseModel):
    code: str
    needs_explanation: bool
    next: str | None


class DemoState(BaseModel):
    fail_mode: bool
    total_applications: int


class FailModeIn(BaseModel):
    enabled: bool
