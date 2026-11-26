from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True)  # e.g. "2026-000123"
    service_name_ru: Mapped[str] = mapped_column(String(255))
    service_name_ky: Mapped[str] = mapped_column(String(255))
    # Plain string (not Enum) on purpose: we must be able to store and show
    # an UNKNOWN status code that the frontend has to handle gracefully.
    status: Mapped[str] = mapped_column(String(32))
    # Explanation for ACTION_REQUIRED (what to clarify) or REJECTED (reason).
    # May be NULL -> frontend shows the fallback "where to get details" message.
    explanation_ru: Mapped[str | None] = mapped_column(Text, default=None)
    explanation_ky: Mapped[str | None] = mapped_column(Text, default=None)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
