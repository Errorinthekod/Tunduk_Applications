from datetime import timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from .models import Application, utcnow

# Test data covering every status, plus edge cases:
# - ACTION_REQUIRED with an explanation and one WITHOUT (fallback message)
# - one unknown status code
TEST_APPLICATIONS = [
    {
        "number": "2026-000101",
        "service_name_ru": "Выдача паспорта гражданина КР",
        "service_name_ky": "КР жаранынын паспортун берүү",
        "status": "IN_REVIEW",
        "days_ago": 3,
    },
    {
        "number": "2026-000102",
        "service_name_ru": "Справка о несудимости",
        "service_name_ky": "Соттолбогондугу тууралуу маалымкат",
        "status": "ACTION_REQUIRED",
        "explanation_ru": "Уточните контактный номер телефона.",
        "explanation_ky": "Байланыш телефон номериңизди тактаңыз.",
        "days_ago": 1,
    },
    {
        "number": "2026-000103",
        "service_name_ru": "Регистрация по месту жительства",
        "service_name_ky": "Жашаган жери боюнча каттоо",
        "status": "ACTION_REQUIRED",  # no explanation -> fallback in UI
        "days_ago": 2,
    },
    {
        "number": "2026-000104",
        "service_name_ru": "Свидетельство о рождении (дубликат)",
        "service_name_ky": "Төрөлгөндүгү тууралуу күбөлүк (дубликат)",
        "status": "COMPLETED",
        "days_ago": 5,
    },
    {
        "number": "2026-000105",
        "service_name_ru": "Пособие по уходу за ребёнком",
        "service_name_ky": "Баланы кароо боюнча жөлөкпул",
        "status": "REJECTED",
        "explanation_ru": "Не приложена справка о составе семьи.",
        "explanation_ky": "Үй-бүлө курамы тууралуу маалымкат тиркелген эмес.",
        "days_ago": 7,
    },
    {
        "number": "2026-000106",
        "service_name_ru": "Водительское удостоверение (замена)",
        "service_name_ky": "Айдоочулук күбөлүк (алмаштыруу)",
        "status": "SUBMITTED",
        "days_ago": 0,
    },
    {
        "number": "2026-000107",
        "service_name_ru": "Выписка из реестра недвижимости",
        "service_name_ky": "Кыймылсыз мүлк реестринен көчүрмө",
        "status": "ON_HOLD",  # unknown code -> UI must handle it
        "days_ago": 4,
    },
]


def reset_data(db: Session) -> None:
    """Wipe the table and insert fresh test data."""
    db.execute(delete(Application))
    now = utcnow()
    for item in TEST_APPLICATIONS:
        data = dict(item)
        days_ago = data.pop("days_ago")
        db.add(Application(**data, updated_at=now - timedelta(days=days_ago, hours=2)))
    db.commit()


def seed_if_empty(db: Session) -> None:
    if db.query(Application).first() is None:
        reset_data(db)
