from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, computed_field, field_validator

from .statuses import KNOWN_STATUSES, Status


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    service_name_ru: str
    service_name_ky: str
    status: str
    explanation_ru: str | None
    explanation_ky: str | None
    updated_at: datetime

    @field_validator("updated_at")
    @classmethod
    def _as_utc(cls, v: datetime) -> datetime:
        # SQLite drops tzinfo; values are always stored in UTC.
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)

    @computed_field
    @property
    def is_known_status(self) -> bool:
        return self.status in KNOWN_STATUSES

    @computed_field
    @property
    def action_required(self) -> bool:
        return self.status == Status.ACTION_REQUIRED
